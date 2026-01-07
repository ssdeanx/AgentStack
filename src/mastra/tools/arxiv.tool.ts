import type { InferUITool } from '@mastra/core/tools'
import { createTool } from '@mastra/core/tools'
import { trace } from '@opentelemetry/api'
import { z } from 'zod'
import { log } from '../config/logger'

// In-memory counter to track tool calls per request
// Add this line at the beginning of each tool's execute function to track usage:
// toolCallCounters.set('tool-id', (toolCallCounters.get('tool-id') ?? 0) + 1)
const toolCallCounters = new Map<string, number>()

/**
 * ArXiv Tool
 *
 * Provides access to academic papers from arXiv.org including:
 * - Search papers by keywords, authors, categories
 * - Retrieve paper metadata and abstracts
 * - Get full paper information including PDF links
 * - Browse papers by category and date
 * - Download and parse PDF content to markdown
 *
 * No API key required - uses arXiv's public API
 */

// Use `unpdf` for parsing PDFs (serverless-optimized PDF.js build)
import { extractText, getDocumentProxy } from 'unpdf'

/**
 * Extract text content from PDF buffer using `unpdf`
 */
async function extractPdfText(
  pdfBuffer: Buffer,
  maxPages = 1000
): Promise<{
  text: string
  numpages: number
  metadata?: Record<string, unknown>
}> {
  try {
    const pdf = await getDocumentProxy(new Uint8Array(pdfBuffer))
    const { totalPages, text } = await extractText(pdf, {
      mergePages: true,
    })

    return {
      text: text ?? '',
      numpages: Math.min(totalPages ?? 1, maxPages),
      metadata: undefined,
    }
  } catch (error) {
    throw new Error(
      `PDF parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
}

/**
 * Convert extracted PDF text to markdown format
 */
function convertPdfTextToMarkdown(
  text: string,
  metadata?: { title?: string; authors?: string[] }
): string {
  let markdown = text

  // Basic text normalization
  markdown = markdown
    .replace(/\f/g, '\n\n') // Form feeds to double newlines
    .replace(/\r\n/g, '\n') // Normalize line endings
    .replace(/\n\n\n+/g, '\n\n') // Multiple newlines to double
    .replace(/\t/g, '  ') // Tabs to spaces
    .replace(/(\w+)-\n(\w+)/g, '$1$2') // Fix hyphenated words
    .replace(/\s+([.,!?;:])/g, '$1') // Clean punctuation spacing
    .trim()

  // Add frontmatter if metadata available
  const hasTitle =
    typeof metadata?.title === 'string' && metadata.title.trim() !== ''
  const hasAuthors =
    Array.isArray(metadata?.authors) && metadata.authors.length > 0

  if (hasTitle || hasAuthors) {
    const frontmatter = [
      '---',
      hasTitle
        ? `title: "${String(metadata?.title).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`
        : null,
      hasAuthors ? `authors: ${JSON.stringify(metadata.authors)}` : null,
      'source: "arxiv-pdf"',
      'extracted_at: "' + new Date().toISOString() + '"',
      '---',
      '',
    ]
      .filter(Boolean)
      .join('\n')

    markdown = frontmatter + markdown
  }

  return markdown
}

export const arxivTool = createTool({
  id: 'arxiv',
  description:
    'Search and retrieve academic papers from arXiv.org including metadata, abstracts, and download links',
  inputSchema: z.object({
    query: z
      .string()
      .optional()
      .describe('Search query for papers (keywords, titles, authors)'),
    id: z
      .string()
      .optional()
      .describe(
        "Specific arXiv paper ID (e.g., '2103.12345' or '2103.12345v1')"
      ),
    author: z.string().optional().describe('Search by author name'),
    title: z.string().optional().describe('Search by paper title'),
    category: z
      .enum([
        'cs.AI',
        'cs.CL',
        'cs.CV',
        'cs.LG',
        'cs.NE',
        'cs.RO',
        'math.AG',
        'math.AP',
        'math.CO',
        'math.CT',
        'math.DS',
        'physics.optics',
        'physics.comp-ph',
        'physics.gen-ph',
        'q-bio.BM',
        'q-bio.GN',
        'q-bio.MN',
        'q-bio.NC',
        'q-bio.OT',
        'q-bio.PE',
        'q-bio.QM',
        'stat.AP',
        'stat.CO',
        'stat.ME',
        'stat.ML',
        'stat.TH',
        'astro-ph.CO',
        'astro-ph.EP',
        'astro-ph.GA',
        'astro-ph.HE',
        'astro-ph.IM',
        'astro-ph.SR',
        'cond-mat.dis-nn',
        'cond-mat.mes-hall',
        'cond-mat.mtrl-sci',
        'cond-mat.other',
        'cond-mat.quant-gas',
        'cond-mat.soft',
        'cond-mat.stat-mech',
        'cond-mat.str-el',
        'cond-mat.supr-con',
        'hep-ex',
        'hep-lat',
        'hep-ph',
        'hep-th',
        'nucl-ex',
        'nucl-th',
        'quant-ph',
      ])
      .optional()
      .describe('ArXiv category/subject area'),
    max_results: z
      .number()
      .min(1)
      .max(100)
      .optional()
      .default(10)
      .describe('Maximum number of results to return (1-100)'),
    sort_by: z
      .enum(['relevance', 'lastUpdatedDate', 'submittedDate'])
      .optional()
      .default('relevance')
      .describe('Sort results by criteria'),
    sort_order: z
      .enum(['ascending', 'descending'])
      .optional()
      .default('descending')
      .describe('Sort order'),
    start: z
      .number()
      .min(0)
      .optional()
      .default(0)
      .describe('Starting index for results (0-based)'),
    include_abstract: z
      .boolean()
      .optional()
      .default(true)
      .describe('Whether to include paper abstracts in results'),
  }),
  outputSchema: z.object({
    papers: z.array(
      z.object({
        id: z.string(),
        title: z.string(),
        authors: z.array(z.string()),
        abstract: z.string().optional(),
        categories: z.array(z.string()),
        published: z.string(),
        updated: z.string().optional(),
        pdf_url: z.string(),
        doi: z.string().optional(),
        journal_ref: z.string().optional(),
        comments: z.string().optional(),
      })
    ),
    total_results: z.number(),
    start_index: z.number(),
    max_results: z.number(),
  }),
  onInputStart: ({ toolCallId, messages, abortSignal }) => {
    log.info('ArXiv tool input streaming started', {
      toolCallId,
      messageCount: messages.length,
      hook: 'onInputStart',
    })
  },
  onInputAvailable: ({ input, toolCallId, messages, abortSignal }) => {
    const searchType = input.id
      ? 'by-id'
      : input.query
        ? 'by-query'
        : 'general'
    log.info('ArXiv tool received input', {
      toolCallId,
      messageCount: messages.length,
      searchType,
      query: input.query,
      id: input.id,
      author: input.author,
      category: input.category,
      maxResults: input.max_results,
      hook: 'onInputAvailable',
    })
  },
  onOutput: ({ output, toolCallId, toolName, abortSignal }) => {
    log.info('ArXiv search completed', {
      toolCallId,
      toolName,
      papersFound: output.papers.length,
      totalResults: output.total_results,
      startIndex: output.start_index,
      maxResults: output.max_results,
      hook: 'onOutput',
    })
  },
  execute: async (inputData, context) => {
    const span = trace
      .getTracer('arxiv-tool', '1.0.0')
      .startSpan('arxiv-search', {
        attributes: {
          'tool.id': 'arxiv',
          'tool.input.query': inputData.query,
          'tool.input.id': inputData.id,
          'tool.input.category': inputData.category,
          'tool.input.maxResults': inputData.max_results,
        },
      })

    await context?.writer?.custom({
      type: 'data-tool-progress',
      data: {
        status: 'in-progress',
        message: `📚 Searching arXiv for "${inputData.query ?? inputData.id ?? 'papers'}"`,
        stage: 'arxiv',
      },
      id: 'arxiv',
    })
    toolCallCounters.set('arxiv', (toolCallCounters.get('arxiv') ?? 0) + 1)
    try {
      const params = new URLSearchParams()

      // Build search query
      const searchTerms: string[] = []

      if (inputData.query !== undefined && inputData.query !== null) {
        searchTerms.push(inputData.query)
      }

      if (inputData.author !== undefined && inputData.author !== null) {
        searchTerms.push(`au:${inputData.author}`)
      }

      if (inputData.title !== undefined && inputData.title !== null) {
        searchTerms.push(`ti:${inputData.title}`)
      }

      if (inputData.category !== undefined) {
        searchTerms.push(`cat:${inputData.category}`)
      }

      if (inputData.id !== undefined && inputData.id !== null) {
        // If specific ID is provided, use it directly
        params.append('id_list', inputData.id)
      } else if (searchTerms.length > 0) {
        params.append('search_query', searchTerms.join(' AND '))
      } else {
        await context?.writer?.custom({
          type: 'data-tool-progress',
          data: {
            status: 'done',
            message: '❌ No search terms provided',
            stage: 'arxiv',
          },
          id: 'arxiv',
        })
        throw new Error(
          'Either query, id, author, title, or category must be provided'
        )
      }

      // Add other parameters
      params.append('max_results', String(inputData.max_results ?? 10))
      params.append('start', String(inputData.start ?? 0))

      if (inputData.sort_by !== undefined) {
        params.append(
          'sortBy',
          inputData.sort_by === 'lastUpdatedDate'
            ? 'lastUpdatedDate'
            : inputData.sort_by === 'submittedDate'
              ? 'submittedDate'
              : 'relevance'
        )
      }

      if (inputData.sort_order !== undefined) {
        params.append('sortOrder', inputData.sort_order)
      }

      const url = `http://export.arxiv.org/api/query?${params.toString()}`

      await context?.writer?.custom({
        type: 'data-tool-progress',
        data: {
          status: 'in-progress',
          message: '📡 Fetching from arXiv API...',
          stage: 'arxiv',
        },
        id: 'arxiv',
      })
      const response = await fetch(url)

      if (!response.ok) {
        throw new Error(
          `ArXiv API error: ${response.status} ${response.statusText}`
        )
      }

      const xmlText = await response.text()

      // Parse XML response (simplified parsing - in production you might want a proper XML parser)
      const papers = parseArxivXml(
        xmlText,
        Boolean(inputData.include_abstract)
      )

      // Extract total results from XML
      const totalResultsRegex =
        /<opensearch:totalResults>(\d+)<\/opensearch:totalResults>/
      const totalResultsMatch = totalResultsRegex.exec(xmlText)
      const totalResults = totalResultsMatch
        ? parseInt(totalResultsMatch[1], 10)
        : papers.length

      const startIndexRegex =
        /<opensearch:startIndex>(\d+)<\/opensearch:startIndex>/
      const startIndexMatch = startIndexRegex.exec(xmlText)
      const startIndex = startIndexMatch
        ? parseInt(startIndexMatch[1], 10)
        : (inputData.start ?? 0)

      const result = {
        papers,
        total_results: totalResults,
        start_index: startIndex,
        max_results: inputData.max_results ?? 10,
      }
      span.setAttribute('tool.output.totalResults', totalResults)
      span.setAttribute('tool.output.paperCount', papers.length)
      span.end()
      return result
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Unknown error occurred'
      if (error instanceof Error) {
        span.recordException(error)
      }
      span.setStatus({ code: 2, message: errorMessage }) // ERROR status
      span.end()
      throw error instanceof Error ? error : new Error(errorMessage)
    }
  },
})

export type ArxivUITool = InferUITool<typeof arxivTool>

/**
 * ArXiv PDF Parser Tool
 *
 * Downloads and parses arXiv PDF papers to markdown format
 * Requires unpdf module to be installed
 */

export const arxivPdfParserTool = createTool({
  id: 'arxiv-pdf-parser',
  description:
    'Download and parse arXiv PDF papers to markdown format using unpdf',
  inputSchema: z.object({
    arxivId: z
      .string()
      .describe("ArXiv paper ID (e.g., '2103.12345' or '2103.12345v1')"),
    maxPages: z
      .number()
      .min(1)
      .max(1000)
      .optional()
      .default(100)
      .describe('Maximum number of pages to parse (default: 100)'),
    includeMetadata: z
      .boolean()
      .optional()
      .default(true)
      .describe('Include paper metadata in markdown frontmatter'),
    normalizeText: z
      .boolean()
      .optional()
      .default(true)
      .describe('Apply text normalization and cleanup'),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    arxivId: z.string(),
    markdown: z.string(),
    metadata: z
      .object({
        title: z.string().optional(),
        authors: z.array(z.string()).optional(),
        pageCount: z.number(),
        extractedAt: z.string(),
      })
      .optional(),
    statistics: z.object({
      pageCount: z.number(),
      textLength: z.number(),
      processingTimeMs: z.number(),
    }),
  }),
  execute: async (inputData, context) => {
    const span = trace
      .getTracer('arxiv-pdf-parser-tool', '1.0.0')
      .startSpan('arxiv-pdf-parser', {
        attributes: {
          'tool.id': 'arxiv-pdf-parser',
          'tool.input.arxivId': inputData.arxivId,
          'tool.input.maxPages': inputData.maxPages,
        },
      })

    await context?.writer?.custom({
      type: 'data-tool-progress',
      data: {
        status: 'in-progress',
        message:
          '🚀 Starting arXiv PDF parser for ' + inputData.arxivId,
        stage: 'arxiv-pdf-parser',
      },
      id: 'arxiv-pdf-parser',
    })
    toolCallCounters.set(
      'arxiv-pdf-parser',
      (toolCallCounters.get('arxiv-pdf-parser') ?? 0) + 1
    )
    const startTime = Date.now()

    try {
      await context?.writer?.custom({
        type: 'data-tool-progress',
        data: {
          status: 'in-progress',
          message: '📥 Downloading PDF from arXiv...',
          stage: 'arxiv-pdf-parser',
        },
        id: 'arxiv-pdf-parser',
      })
      // Construct PDF URL
      const pdfUrl = `https://arxiv.org/pdf/${inputData.arxivId}`

      // Download PDF
      await context?.writer?.custom({
        type: 'data-tool-progress',
        data: {
          status: 'in-progress',
          message: '🔄 Extracting text from PDF...',
          stage: 'arxiv-pdf-parser',
        },
        id: 'arxiv-pdf-parser',
      })
      const response = await fetch(pdfUrl)

      if (!response.ok) {
        await context?.writer?.custom({
          type: 'data-tool-progress',
          data: {
            status: 'done',
            message: '❌ PDF download failed',
            stage: 'arxiv-pdf-parser',
          },
          id: 'arxiv-pdf-parser',
        })
        if (response.status === 404) {
          throw new Error(`Paper not found: ${inputData.arxivId}`)
        }
        throw new Error(
          `Failed to download PDF: ${response.status} ${response.statusText}`
        )
      }

      const pdfBuffer = Buffer.from(await response.arrayBuffer())

      // Extract text from PDF
      const pdfContent = await extractPdfText(
        pdfBuffer,
        inputData.maxPages ?? 100
      )

      // Try to get metadata from arXiv API
      let paperMetadata:
        | { title?: string; authors?: string[] }
        | undefined
      if (inputData.includeMetadata) {
        try {
          const apiUrl = `http://export.arxiv.org/api/query?id_list=${inputData.arxivId}&max_results=1`
          const apiResponse = await fetch(apiUrl)

          if (apiResponse.ok) {
            const xmlText = await apiResponse.text()
            const titleRegex = /<title>(.*?)<\/title>/
            const titleMatch = titleRegex.exec(xmlText)
            const title = titleMatch
              ? titleMatch[1]
                .replace(/<!\[CDATA\[|\]\]>/g, '')
                .trim()
              : undefined

            const authors: string[] = []
            const authorRegex =
              /<author><name>(.*?)<\/name><\/author>/g
            let authorMatch
            while (
              (authorMatch = authorRegex.exec(xmlText)) !== null
            ) {
              authors.push(authorMatch[1])
            }

            if (
              (title !== undefined &&
                title !== null &&
                title.length > 0) ||
              authors.length > 0
            ) {
              paperMetadata = {
                title,
                authors:
                  authors.length > 0 ? authors : undefined,
              }
            }
          }
        } catch {
          // Metadata fetch failed, continue without it
        }
      }

      // Convert to markdown
      let markdown = pdfContent.text

      if (inputData.normalizeText) {
        markdown = convertPdfTextToMarkdown(markdown, paperMetadata)
      } else if (paperMetadata && inputData.includeMetadata) {
        // Add basic frontmatter even without normalization
        const frontmatter = [
          '---',
          typeof paperMetadata.title === 'string' &&
            paperMetadata.title.trim() !== ''
            ? `title: "${paperMetadata.title.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`
            : null,
          paperMetadata.authors
            ? `authors: ${JSON.stringify(paperMetadata.authors)}`
            : null,
          'source: "arxiv-pdf"',
          'extracted_at: "' + new Date().toISOString() + '"',
          '---',
          '',
        ]
          .filter(Boolean)
          .join('\n')

        markdown = frontmatter + markdown
      }

      await context?.writer?.custom({
        type: 'data-tool-progress',
        data: {
          status: 'done',
          message:
            '✅ PDF parsing complete: ' +
            pdfContent.numpages +
            ' pages',
          stage: 'arxiv-pdf-parser',
        },
        id: 'arxiv-pdf-parser',
      })
      const processingTime = Date.now() - startTime

      const result = {
        success: true,
        arxivId: inputData.arxivId,
        markdown,
        metadata: inputData.includeMetadata
          ? {
            title: paperMetadata?.title,
            authors: paperMetadata?.authors,
            pageCount: pdfContent.numpages,
            extractedAt: new Date().toISOString(),
          }
          : undefined,
        statistics: {
          pageCount: pdfContent.numpages,
          textLength: markdown.length,
          processingTimeMs: processingTime,
        },
      }
      span.setAttribute('tool.output.success', true)
      span.setAttribute('tool.output.pageCount', pdfContent.numpages)
      span.end()
      return result
    } catch (error) {
      const processingTime = Date.now() - startTime
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Unknown error occurred'
      if (error instanceof Error) {
        span.recordException(error)
      }
      span.setStatus({ code: 2, message: errorMessage }) // ERROR status
      span.end()

      throw error instanceof Error ? error : new Error(errorMessage)
    }
  },
})

export type ArxivPdfParserUITool = InferUITool<typeof arxivPdfParserTool>

/**
 * ArXiv Paper Downloader Tool
 *
 * Downloads arXiv papers and provides both metadata and PDF content
 */

export const arxivPaperDownloaderTool = createTool({
  id: 'arxiv-paper-downloader',
  description:
    'Download complete arXiv papers with metadata and optional PDF parsing to markdown',
  inputSchema: z.object({
    arxivId: z
      .string()
      .describe("ArXiv paper ID (e.g., '2103.12345' or '2103.12345v1')"),
    includePdfContent: z
      .boolean()
      .optional()
      .default(false)
      .describe('Whether to download and parse the PDF content'),
    maxPages: z
      .number()
      .min(1)
      .max(1000)
      .optional()
      .default(100)
      .describe('Maximum pages to parse if includePdfContent is true'),
    format: z
      .enum(['metadata', 'markdown', 'both'])
      .optional()
      .default('both')
      .describe('Output format: metadata only, markdown only, or both'),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    arxivId: z.string(),
    metadata: z
      .object({
        id: z.string(),
        title: z.string(),
        authors: z.array(z.string()),
        abstract: z.string().optional(),
        categories: z.array(z.string()),
        published: z.string(),
        updated: z.string().optional(),
        pdf_url: z.string(),
        doi: z.string().optional(),
        journal_ref: z.string().optional(),
        comments: z.string().optional(),
      })
      .optional(),
    pdfContent: z
      .object({
        markdown: z.string(),
        pageCount: z.number(),
        textLength: z.number(),
      })
      .optional(),
  }),
  execute: async (inputData, context) => {
    const span = trace
      .getTracer('arxiv-paper-downloader-tool', '1.0.0')
      .startSpan('arxiv-paper-downloader', {
        attributes: {
          'tool.id': 'arxiv-paper-downloader',
          'tool.input.arxivId': inputData.arxivId,
          'tool.input.includePdfContent': inputData.includePdfContent,
          'tool.input.format': inputData.format,
        },
      })

    await context?.writer?.custom({
      type: 'data-tool-progress',
      data: {
        status: 'in-progress',
        message:
          '🚀 Starting arXiv paper downloader for ' +
          inputData.arxivId,
        stage: 'arxiv-paper-downloader',
      },
      id: 'arxiv-paper-downloader',
    })
    toolCallCounters.set(
      'arxiv-paper-downloader',
      (toolCallCounters.get('arxiv-paper-downloader') ?? 0) + 1
    )
    try {
      await context?.writer?.custom({
        type: 'data-tool-progress',
        data: {
          status: 'in-progress',
          message: '📡 Fetching paper metadata from arXiv API...',
          stage: 'arxiv-paper-downloader',
        },
        id: 'arxiv-paper-downloader',
      })
      // Get metadata from arXiv API
      const apiUrl = `http://export.arxiv.org/api/query?id_list=${inputData.arxivId}&max_results=1`
      const apiResponse = await fetch(apiUrl)

      if (!apiResponse.ok) {
        throw new Error(
          `Failed to fetch paper metadata: ${apiResponse.status} ${apiResponse.statusText}`
        )
      }

      const xmlText = await apiResponse.text()

      const papers = parseArxivXml(xmlText, true)

      if (papers?.length === 0) {
        throw new Error(`Paper not found: ${inputData.arxivId}`)
      }

      const paperMetadata = papers[0]

      let pdfContent:
        | { markdown: string; pageCount: number; textLength: number }
        | undefined

      await context?.writer?.custom({
        type: 'data-tool-progress',
        data: {
          status: 'in-progress',
          message: '🔄 Processing paper data...',
          stage: 'arxiv-paper-downloader',
        },
        id: 'arxiv-paper-downloader',
      })
      // Download and parse PDF if requested
      if (inputData.includePdfContent) {
        await context?.writer?.custom({
          type: 'data-tool-progress',
          data: {
            status: 'in-progress',
            message: '📥 Downloading PDF content...',
            stage: 'arxiv-paper-downloader',
          },
          id: 'arxiv-paper-downloader',
        })
        try {
          const pdfResponse = await fetch(paperMetadata.pdf_url)

          if (pdfResponse.ok) {
            const pdfBuffer = Buffer.from(
              await pdfResponse.arrayBuffer()
            )
            const extracted = await extractPdfText(
              pdfBuffer,
              inputData.maxPages ?? 100
            )

            const markdown = convertPdfTextToMarkdown(
              extracted.text,
              {
                title: paperMetadata.title,
                authors: paperMetadata.authors,
              }
            )

            pdfContent = {
              markdown,
              pageCount: extracted.numpages,
              textLength: markdown.length,
            }
          } else {
            // PDF download failed, continue without it
          }
        } catch {
          // PDF parsing failed, continue without it
        }
      }

      // Return based on requested format
      const result: {
        success: boolean
        arxivId: string
        metadata?: typeof paperMetadata
        pdfContent?: {
          markdown: string
          pageCount: number
          textLength: number
        }
      } = {
        success: true,
        arxivId: inputData.arxivId,
      }

      if (
        inputData.format === 'metadata' ||
        inputData.format === 'both'
      ) {
        result.metadata = paperMetadata
      }

      if (
        (inputData.format === 'markdown' ||
          inputData.format === 'both') &&
        pdfContent
      ) {
        result.pdfContent = pdfContent
      }

      span.setAttribute('tool.output.success', true)
      span.end()
      return result
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Unknown error occurred'
      if (error instanceof Error) {
        span.recordException(error)
      }
      span.setStatus({ code: 2, message: errorMessage }) // ERROR status
      span.end()
      throw error instanceof Error ? error : new Error(errorMessage)
    }
  },
})

export type ArxivPaperDownloaderUITool = InferUITool<
  typeof arxivPaperDownloaderTool
>

/**
 * Simple XML parser for ArXiv API response
 * In production, consider using a proper XML parsing library
 */
// FIXME: Use a proper XML parser instead of regex @copilot fast-xml-parser
function parseArxivXml(
  xmlText: string,
  includeAbstract: boolean
): Array<{
  id: string
  title: string
  authors: string[]
  abstract?: string
  categories: string[]
  published: string
  updated?: string
  pdf_url: string
  doi?: string
  journal_ref?: string
  comments?: string
}> {
  const papers: Array<{
    id: string
    title: string
    authors: string[]
    abstract?: string
    categories: string[]
    published: string
    updated?: string
    pdf_url: string
    doi?: string
    journal_ref?: string
    comments?: string
  }> = []

  // Split by entry tags
  const entryRegex = /<entry>([\s\S]*?)<\/entry>/g
  let match

  while ((match = entryRegex.exec(xmlText)) !== null) {
    const entryXml = match[1]

    // Extract fields using regex
    const idRegex = /<id>(.*?)<\/id>/
    const idMatch = idRegex.exec(entryXml)

    const titleRegex = /<title>(.*?)<\/title>/
    const titleMatch = titleRegex.exec(entryXml)

    const publishedRegex = /<published>(.*?)<\/published>/
    const publishedMatch = publishedRegex.exec(entryXml)

    const updatedRegex = /<updated>(.*?)<\/updated>/
    const updatedMatch = updatedRegex.exec(entryXml)

    const summaryRegex = /<summary>(.*?)<\/summary>/
    const summaryMatch = summaryRegex.exec(entryXml)

    const doiRegex = /<arxiv:doi>(.*?)<\/arxiv:doi>/
    const doiMatch = doiRegex.exec(entryXml)

    const journalRefRegex = /<arxiv:journal_ref>(.*?)<\/arxiv:journal_ref>/
    const journalRefMatch = journalRefRegex.exec(entryXml)

    const commentsRegex = /<arxiv:comment>(.*?)<\/arxiv:comment>/
    const commentsMatch = commentsRegex.exec(entryXml)

    if (!idMatch || !titleMatch || !publishedMatch) {
      continue // Skip malformed entries
    }

    // Extract authors
    const authors: string[] = []
    const authorRegex = /<author><name>(.*?)<\/name><\/author>/g
    let authorMatch
    while ((authorMatch = authorRegex.exec(entryXml)) !== null) {
      authors.push(authorMatch[1])
    }

    // Extract categories
    const categories: string[] = []
    const categoryRegex = /<category term="(.*?)"[^>]*\/>/g
    let categoryMatch
    while ((categoryMatch = categoryRegex.exec(entryXml)) !== null) {
      categories.push(categoryMatch[1])
    }

    // Generate PDF URL from ID
    const arxivId = idMatch[1].split('/').pop() ?? ''

    papers.push({
      id: arxivId,
      title: titleMatch[1].replace(/<!\[CDATA\[|\]\]>/g, '').trim(),
      authors,
      abstract:
        includeAbstract && summaryMatch
          ? summaryMatch[1].replace(/<!\[CDATA\[|\]\]>/g, '').trim()
          : undefined,
      categories,
      published: publishedMatch[1],
      updated: updatedMatch ? updatedMatch[1] : undefined,
      pdf_url: `https://arxiv.org/pdf/${arxivId}`,
      doi: doiMatch ? doiMatch[1] : undefined,
      journal_ref: journalRefMatch ? journalRefMatch[1] : undefined,
      comments: commentsMatch ? commentsMatch[1] : undefined,
    })
  }

  return papers
}
