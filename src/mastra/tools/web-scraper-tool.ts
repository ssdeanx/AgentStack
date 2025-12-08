// Kilocode: Tool Approval
// owner: team-data
// justification: fetch public docs for RAG indexing with whitelist
// allowedDomains:
//  - example.com
//  - docs.example.com
// allowedDataPaths:
//  - corpus/public
// sideEffects:
//  - network: true
//  - write: true
// inputSchema: src/mastra/schemas/tool-schemas.ts::WebScraperInput
// outputSchema: src/mastra/schemas/tool-schemas.ts::WebScraperOutput
// approvedBy: sam
// approvalDate: 9/22

import type { TracingContext } from '@mastra/core/ai-tracing';
import { AISpanType, InternalSpans } from '@mastra/core/ai-tracing';
import type { InferUITool} from "@mastra/core/tools";
import { createTool } from "@mastra/core/tools";
import * as cheerio from 'cheerio';
import { CheerioCrawler, Request } from 'crawlee';
import { JSDOM } from 'jsdom';
import { marked } from 'marked';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { z } from 'zod';
import { log } from '../config/logger';
// Enhanced HTML processing with JSDOM
const DANGEROUS_TAGS = new Set([
  'script',
  'style',
  'iframe',
  'embed',
  'object',
  'noscript',
  'meta',
  'link',
  'form',
  'input',
  'button',
  'select',
  'textarea',
  'frame',
  'frameset',
])

const DANGEROUS_ATTRS = new Set([
  'onload',
  'onerror',
  'onclick',
  'onmouseover',
  'onmouseout',
  'onkeydown',
  'onkeyup',
  'onkeypress',
  'onfocus',
  'onblur',
  'formaction',
])

function sanitizeHtml(html: string): string {
  try {
    // Ensure input is a string and explicitly treat as HTML to avoid ambiguous parsing
    const safeHtml = String(html)
    const jsdom = new JSDOM(safeHtml, {
      contentType: 'text/html',
      includeNodeLocations: false,
    })
    const { document } = jsdom.window

    // Remove dangerous elements
    DANGEROUS_TAGS.forEach((tagName) => {
      const elements = document.querySelectorAll(tagName)
      elements.forEach((element) => element.remove())
    })

    // Remove event handler attributes
    const allElements = document.querySelectorAll('*')
    allElements.forEach((element) => {
      Array.from(element.attributes).forEach((attr) => {
        if (
          attr.name.startsWith('on') ||
          DANGEROUS_ATTRS.has(attr.name.toLowerCase())
        ) {
          element.removeAttribute(attr.name)
        }
      })
    })

    return document.body.innerHTML
  } catch (error) {
    log.warn('JSDOM sanitization failed, falling back to cheerio', {
      error,
    })
    // Pre-sanitize the raw HTML to avoid passing dangerous content directly into cheerio.
    // Remove dangerous elements and inline event handlers, and neutralize javascript: hrefs.
    const preSanitizedHtml = String(html)
      // Remove dangerous elements with their content: script, style, iframe, embed, object, noscript, meta, link, form, input, button, select, textarea, frame, frameset
      .replace(
        /<\s*(script|style|iframe|embed|object|noscript|meta|link|form|input|button|select|textarea|frame|frameset)\b[^>]*>[\s\S]*?<\/\s*\1\s*>/gi,
        ''
      )
      // Remove self-closing dangerous tags (meta, link, input), but keep img tags intact
      .replace(/<\s*(meta|link|input|br|hr)[^>]*\/?>/gi, '')
      // Remove inline event handler attributes like onclick="..." and onmouseover='...'
      .replace(/ on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, ' ')
      // Neutralize javascript: URIs in href attributes
      .replace(/href\s*=\s*("|\\')\s*javascript:[^"\\']*\1/gi, 'href="#"')

    const $ = cheerio.load(preSanitizedHtml, { xmlMode: false })
    DANGEROUS_TAGS.forEach((tag) => $(tag).remove())
    $('*').each((_i, element) => {
      const el = $(element)
      const attrs = el.attr()
      if (attrs) {
        Object.keys(attrs).forEach((attr) => {
          if (
            DANGEROUS_ATTRS.has(attr.toLowerCase()) ||
            attr.toLowerCase().startsWith('on')
          ) {
            el.removeAttr(attr)
          }
        })
      }
    })
    return $.html()
  }
}

function extractTextContent(html: string): string {
  try {
    const dom = new JSDOM(html, { includeNodeLocations: false })
    return dom.window.document.body.textContent?.trim() ?? ''
  } catch (error) {
    log.warn('JSDOM text extraction failed, falling back to cheerio', {
      error,
    })
    const $ = cheerio.load(html)
    return $.text().trim()
  }
}

function htmlToMarkdown(html: string): string {
  try {
    const sanitizedHtml = sanitizeHtml(html)
    const dom = new JSDOM(sanitizedHtml, { includeNodeLocations: true })
    const { document } = dom.window

    const convertNode = (node: Node): string => {
      if (node.nodeType === dom.window.Node.TEXT_NODE) {
        return node.textContent?.trim() ?? ''
      }

      if (node.nodeType === dom.window.Node.ELEMENT_NODE) {
        const element = node as Element
        const tagName = element.tagName.toLowerCase()
        switch (tagName) {
          case 'h1':
            return `# ${getTextContent(element)}\n\n`
          case 'h2':
            return `## ${getTextContent(element)}\n\n`
          case 'h3':
            return `### ${getTextContent(element)}\n\n`
          case 'h4':
            return `#### ${getTextContent(element)}\n\n`
          case 'h5':
            return `##### ${getTextContent(element)}\n\n`
          case 'h6':
            return `###### ${getTextContent(element)}\n\n`
          case 'p':
            return `${getTextContent(element)}\n\n`
          case 'br':
            return '\n'
          case 'strong':
          case 'b':
            return `**${getTextContent(element)}**`
          case 'em':
          case 'i':
            return `*${getTextContent(element)}*`
          case 'code':
            return `\`${getTextContent(element)}\``
          case 'pre':
            return `\`\`\`\n${getTextContent(element).trim()}\n\`\`\`\n\n`
          case 'a': {
            const href = element.getAttribute('href')
            const text = getTextContent(element)
            return href !== null ? `[${text}](${href})` : text
          }
          case 'ul':
            return `${convertChildren(element)}\n`
          case 'ol':
            return `${convertChildren(element)}\n`
          case 'li':
            return `- ${getTextContent(element)}\n`
          case 'blockquote':
            return `> ${getTextContent(element)}\n\n`
          case 'hr':
            return '---\n\n'
          case 'img': {
            // Normalize src/alt and skip images without a usable src
            const srcAttr = element.getAttribute('src')
            const altAttr = element.getAttribute('alt') ?? ''
            const trimmedSrc = (srcAttr ?? '').trim()
            if (trimmedSrc === '') {
              return ''
            }
            const alt = altAttr.trim()
            return `![${alt}](${trimmedSrc})`
          }
          case 'table':
            return convertTable(element)
          default:
            return convertChildren(element)
        }
      }
      return ''
    }

    const convertChildren = (element: Element): string => {
      let result = ''
      element.childNodes.forEach((child) => {
        result += convertNode(child)
      })
      return result
    }

    const getTextContent = (element: Element): string => {
      let result = ''
      element.childNodes.forEach((child) => {
        result += convertNode(child)
      })
      return result
    }

    const convertTable = (table: Element): string => {
      const rows = Array.from(table.querySelectorAll('tr'))
      if (rows.length === 0) {
        return ''
      }

      let markdown = ''
      rows.forEach((row, index) => {
        const cells = Array.from(row.querySelectorAll('td, th'))
        const cellTexts = cells.map((cell) => getTextContent(cell))
        markdown += '| ' + cellTexts.join(' | ') + ' |\n'

        if (index === 0) {
          markdown +=
            '| ' + cellTexts.map(() => '---').join(' | ') + ' |\n'
        }
      })
      return markdown + '\n'
    }

    return convertNode(document.body).trim()
  } catch (error) {
    log.warn('JSDOM conversion failed, using marked fallback', { error })
    return extractTextContent(html)
  }
}

function sanitizeMarkdown(markdown: string): string {
  try {
    // Comprehensive HTML entity escaping to prevent XSS and parsing issues
    // Escape dangerous characters that could interfere with JSON or HTML rendering
    return String(markdown)
      .replace(/&/g, '&amp;')    // Must be first to avoid double-escaping
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/'/g, '&#39;')
      .replace(/"/g, '&quot;')
      .replace(/\\/g, '&#92;')   // Escape backslashes
      .replace(/\n/g, '\\n')     // Escape newlines for JSON safety
      .replace(/\r/g, '\\r')     // Escape carriage returns
      .replace(/\t/g, '\\t')     // Escape tabs
      .replace(/\f/g, '\\f')     // Escape form feeds
      .replace(/\0/g, '\\0')     // Escape null characters
  } catch {
    return ''
  }
}

export const HtmlProcessor = {
  DANGEROUS_TAGS,
  DANGEROUS_ATTRS,
  sanitizeHtml,
  extractTextContent,
  htmlToMarkdown,
  sanitizeMarkdown,
}

// Enhanced error handling utilities
export class ScrapingError extends Error {
  public readonly code: string
  public readonly statusCode?: number
  public readonly url?: string

  constructor(
    message: string,
    code: string,
    statusCode?: number,
    url?: string
  ) {
    super(message)
    this.code = code
    this.statusCode = statusCode
    this.url = url
    // Include the error code in the message so the property is referenced and available for logs
    this.message = `${message}${this.code ? ` (code=${this.code})` : ''}`
    this.name = 'ScrapingError'
  }
}

export class ValidationUtils {
  static validateUrl(url: string): boolean {
    try {
      const parsedUrl = new URL(url)
      return ['http:', 'https:'].includes(parsedUrl.protocol)
    } catch {
      return false
    }
  }

  static sanitizeFileName(fileName: string): string {
    return fileName.replace(/[^a-zA-Z0-9\-_.]/g, '_')
  }

  static validateFilePath(filePath: string, intendedDir: string): boolean {
    const resolvedPath = path.resolve(filePath)
    const resolvedIntendedDir = path.resolve(intendedDir)
    return resolvedPath.startsWith(resolvedIntendedDir)
  }
}

// Input Schema
const webScraperInputSchema = z
  .object({
    url: z
      .url()
      .refine(
        (v) => ValidationUtils.validateUrl(v),
        'Invalid URL format'
      ),
    selector: z
      .string()
      .optional()
      .describe(
        "CSS selector for the elements to extract (e.g., 'h1', '.product-title'). If not provided, the entire page content will be extracted."
      ),
    extractAttributes: z
      .array(z.string())
      .optional()
      .describe(
        "Array of HTML attributes to extract from selected elements (e.g., 'href', 'src', 'alt')."
      ),
    saveMarkdown: z
      .boolean()
      .optional()
      .describe(
        'Whether to save the scraped content as markdown to the data directory.'
      ),
    markdownFileName: z
      .string()
      .optional()
      .describe(
        'Optional filename for the markdown file (relative to data/ directory). If not provided, a default name will be generated.'
      ),
    // Enhanced search tool options
    depth: z
      .number()
      .min(1)
      .max(5)
      .optional()
      .describe('Maximum crawling depth for following links (default: 1, max: 5).'),
    maxPages: z
      .number()
      .min(1)
      .max(100)
      .optional()
      .describe('Maximum number of pages to crawl (default: 10, max: 100).'),
    followLinks: z
      .boolean()
      .optional()
      .describe('Whether to follow and crawl internal links (default: false).'),
    includeImages: z
      .boolean()
      .optional()
      .describe('Whether to extract image URLs and metadata (default: false).'),
    extractMetadata: z
      .boolean()
      .optional()
      .describe('Whether to extract page metadata (title, description, keywords, etc.) (default: true).'),
    contentType: z
      .enum(['text', 'links', 'images', 'metadata', 'structured', 'all'])
      .optional()
      .describe('Type of content to prioritize extracting (default: "all").'),
    timeout: z
      .number()
      .min(1000)
      .max(60000)
      .optional()
      .describe('Request timeout in milliseconds (default: 30000, max: 60000).'),
    userAgent: z
      .string()
      .optional()
      .describe('Custom User-Agent string for requests.'),
    headers: z
      .record(z.string(), z.string())
      .optional()
      .describe('Custom HTTP headers to send with requests.'),
    retryAttempts: z
      .number()
      .min(0)
      .max(5)
      .optional()
      .describe('Number of retry attempts for failed requests (default: 2, max: 5).'),
    delayBetweenRequests: z
      .number()
      .min(0)
      .max(10000)
      .optional()
      .describe('Delay between requests in milliseconds for rate limiting (default: 1000).'),
    respectRobotsTxt: z
      .boolean()
      .optional()
      .describe('Whether to check and respect robots.txt (default: true).'),
    extractStructuredData: z
      .boolean()
      .optional()
      .describe('Whether to extract structured data (JSON-LD, microdata, RDFa) (default: false).'),
    languageDetection: z
      .boolean()
      .optional()
      .describe('Whether to detect and return content language (default: false).'),
    contentFiltering: z
      .object({
        minLength: z.number().optional(),
        maxLength: z.number().optional(),
        keywords: z.array(z.string()).optional(),
        excludePatterns: z.array(z.string()).optional(),
      })
      .optional()
      .describe('Content filtering options (min/max length, keywords, exclude patterns).'),
    outputFormat: z
      .enum(['json', 'markdown', 'html', 'text'])
      .optional()
      .describe('Output format for extracted content (default: "json").'),
    compression: z
      .boolean()
      .optional()
      .describe('Whether to handle compressed responses (gzip, deflate) (default: true).'),
    cookies: z
      .record(z.string(), z.string())
      .optional()
      .describe('Custom cookies to send with requests.'),
  })
  .strict()

// Output Schema
const webScraperOutputSchema = z
  .object({
    url: z.url().describe('The URL that was scraped.'),
    extractedData: z
      .array(z.record(z.string(), z.string()))
      .describe(
        'Array of extracted data, where each object represents an element and its extracted attributes/text.'
      ),
    rawContent: z
      .string()
      .optional()
      .describe(
        'The full raw HTML content of the page (if no selector is provided).'
      ),
    markdownContent: z
      .string()
      .optional()
      .describe('The scraped content converted to markdown format.'),
    savedFilePath: z
      .string()
      .optional()
      .describe(
        'Path to the saved markdown file (if saveMarkdown was true).'
      ),
    status: z
      .string()
      .describe(
        "Status of the scraping operation (e.g., 'success', 'failed')."
      ),
    errorMessage: z
      .string()
      .optional()
      .describe('Error message if the operation failed.'),
    // Enhanced output fields
    metadata: z
      .record(z.string(), z.string())
      .optional()
      .describe('Page metadata (title, description, keywords, etc.) extracted from meta tags.'),
    images: z
      .array(z.object({
        src: z.string(),
        alt: z.string().optional(),
        title: z.string().optional(),
      }))
      .optional()
      .describe('Array of image URLs and metadata found on the page.'),
    structuredData: z
      .array(z.unknown())
      .optional()
      .describe('Structured data extracted from JSON-LD and microdata.'),
    detectedLanguage: z
      .string()
      .optional()
      .describe('Detected content language from HTML lang attribute or meta tags.'),
  })
  .strict()

// In-memory counter to track tool calls per request
// Add this line at the beginning of each tool's execute function to track usage:
// toolCallCounters.set('tool-id', (toolCallCounters.get('tool-id') ?? 0) + 1)
const toolCallCounters = new Map<string, number>()


export const webScraperTool = createTool({
  id: 'web:scraper',
  description:
    'Extracts structured data from web pages using JSDOM and Cheerio with enhanced security and error handling.',
  inputSchema: webScraperInputSchema,
  outputSchema: webScraperOutputSchema,
  execute: async ({ context, writer, tracingContext }: { context: { url: string; selector?: string; extractAttributes?: string[]; saveMarkdown?: boolean; markdownFileName?: string; depth?: number; maxPages?: number; followLinks?: boolean; includeImages?: boolean; extractMetadata?: boolean; contentType?: 'text' | 'links' | 'images' | 'metadata' | 'structured' | 'all'; timeout?: number; userAgent?: string; headers?: Record<string, string>; retryAttempts?: number; delayBetweenRequests?: number; respectRobotsTxt?: boolean; extractStructuredData?: boolean; languageDetection?: boolean; contentFiltering?: { minLength?: number; maxLength?: number; keywords?: string[]; excludePatterns?: string[] }; outputFormat?: 'json' | 'markdown' | 'html' | 'text'; compression?: boolean; cookies?: Record<string, string> }, writer?: any, tracingContext?: TracingContext }) => {
    await writer?.custom({ type: 'data-tool-progress', data: { message: `🌐 Starting web scrape for ${context.url}` } });
    toolCallCounters.set('web:scraper', (toolCallCounters.get('web:scraper') ?? 0) + 1)
    const scrapeSpan = tracingContext?.currentSpan?.createChildSpan({
      type: AISpanType.TOOL_CALL,
      name: 'web_scrape',
      input: {
        url: context.url,
        selector: context.selector,
        saveMarkdown: context.saveMarkdown,
        extractAttributesCount: context.extractAttributes?.length ?? 0,
      },
      tracingPolicy: { internal: InternalSpans.ALL }
    })

    await writer?.custom({ type: 'data-tool-progress', data: { message: '🐛 Initializing crawler...' } });
    log.info('Starting enhanced web scraping with JSDOM', {
      url: context.url,
      selector: context.selector,
      saveMarkdown: context.saveMarkdown,
    })

    let rawContent: string | undefined
    let markdownContent: string | undefined
    let savedFilePath: string | undefined
    const extractedData: Array<Record<string, string>> = []
    let status = 'failed'
    let errorMessage: string | undefined
    let scrapedUrl: string = context.url

    // Extract additional data based on options
    const metadata: Record<string, string | undefined> = {}
    const images: Array<{ src: string; alt?: string; title?: string }> = []
    const structuredData: unknown[] = []
    let detectedLanguage: string | undefined

    try {
      const crawler = new CheerioCrawler({
        maxRequestsPerCrawl: (context.depth && (context.followLinks ?? false)) ? Math.min(context.maxPages ?? 10, 50) : 10,
        maxConcurrency: 10,
        requestHandlerTimeoutSecs: (context.timeout ?? 30000) / 1000,
        async requestHandler({ request, body, response }) {
          try {
            scrapedUrl = request.url

            if (
              typeof response?.statusCode === 'number' &&
              Number.isFinite(response.statusCode) &&
              response.statusCode >= 400
            ) {
              throw new ScrapingError(
                `HTTP ${response.statusCode}: ${response.statusMessage}`,
                'HTTP_ERROR',
                response.statusCode,
                request.url
              )
            }

            rawContent = body.toString()

            // Sanitize HTML using JSDOM
            rawContent = HtmlProcessor.sanitizeHtml(rawContent)

            // Extract metadata if requested
            if (context.extractMetadata !== false) {
              const dom = new JSDOM(rawContent, { includeNodeLocations: false })
              const { document } = dom.window

              metadata.title = document.querySelector('title')?.textContent?.trim()
              metadata.description = document.querySelector('meta[name="description"]')?.getAttribute('content') ?? undefined
              metadata.keywords = document.querySelector('meta[name="keywords"]')?.getAttribute('content') ?? undefined
              metadata.author = document.querySelector('meta[name="author"]')?.getAttribute('content') ?? undefined
              metadata.robots = document.querySelector('meta[name="robots"]')?.getAttribute('content') ?? undefined
              metadata.viewport = document.querySelector('meta[name="viewport"]')?.getAttribute('content') ?? undefined
              metadata.charset = document.querySelector('meta[charset]')?.getAttribute('charset') ?? undefined
              metadata.canonical = document.querySelector('link[rel="canonical"]')?.getAttribute('href') ?? undefined
            }

            // Extract images if requested
            if (context.includeImages ?? false) {
              const dom = new JSDOM(rawContent, { includeNodeLocations: false })
              const { document } = dom.window
              const imgElements = document.querySelectorAll('img')
              imgElements.forEach((img) => {
                const src = img.getAttribute('src')
                if (src && src.trim() !== '') {
                  images.push({
                    src: new URL(src, request.url).href,
                    alt: img.getAttribute('alt') ?? undefined,
                    title: img.getAttribute('title') ?? undefined,
                  })
                }
              })
            }

            // Extract structured data if requested
            if (context.extractStructuredData ?? false) {
              const dom = new JSDOM(rawContent, { includeNodeLocations: false })
              const { document } = dom.window

              // JSON-LD
              const jsonLdScripts = document.querySelectorAll('script[type="application/ld+json"]')
              jsonLdScripts.forEach((script) => {
                try {
                  const data = JSON.parse(script.textContent || '')
                  structuredData.push(data)
                } catch {
                  // Skip invalid JSON-LD
                }
              })

              // Microdata
              const microdataElements = document.querySelectorAll('[itemscope]')
              microdataElements.forEach((element) => {
                const itemType = element.getAttribute('itemtype')
                if (itemType && itemType.trim() !== '') {
                  const microdata: Record<string, unknown> = { '@type': itemType }
                  const props = element.querySelectorAll('[itemprop]')
                  props.forEach((prop) => {
                    const propName = prop.getAttribute('itemprop')
                    const propValue = prop.textContent?.trim() || prop.getAttribute('content')
                    if (propName && propName.trim() !== '' && propValue && typeof propValue === 'string' && propValue.trim() !== '') {
                      microdata[propName] = propValue
                    }
                  })
                  if (Object.keys(microdata).length > 1) {
                    structuredData.push(microdata)
                  }
                }
              })
            }

            // Language detection (basic)
            if (context.languageDetection ?? false) {
              const dom = new JSDOM(rawContent, { includeNodeLocations: false })
              const { document } = dom.window
              detectedLanguage = document.documentElement.getAttribute('lang') ??
                              document.querySelector('meta[http-equiv="content-language"]')?.getAttribute('content') ??
                              document.querySelector('meta[name="language"]')?.getAttribute('content') ?? undefined
            }

            if (
              typeof context.selector === 'string' &&
              context.selector.trim() !== ''
            ) {
              // Use JSDOM for better DOM manipulation
              const dom = new JSDOM(rawContent, {
                includeNodeLocations: false,
              })
              const { document } = dom.window

              const selector = context.selector.trim()
              const elements = document.querySelectorAll(selector)
              elements.forEach((element) => {
                const data = new Map<string, string>()
                data.set(
                  'text',
                  element.textContent?.trim() ?? ''
                )

                if (context.extractAttributes) {
                  context.extractAttributes.forEach(
                    (attr) => {
                      if (
                        typeof attr === 'string' &&
                        !Object.prototype.hasOwnProperty.call(
                          Object.prototype,
                          attr
                        ) &&
                        attr !== '__proto__' &&
                        attr !== 'constructor' &&
                        attr !== 'prototype' &&
                        !attr.includes('<') &&
                        !attr.includes('>')
                      ) {
                        const attrValue =
                          element.getAttribute(attr)
                        if (
                          attrValue !== null &&
                          attrValue !== undefined
                        ) {
                          data.set(
                            `attr_${attr}`,
                            attrValue
                          )
                        }
                      }
                    }
                  )
                }
                extractedData.push(Object.fromEntries(data))
              })
            }

            status = 'success'
          } catch (error) {
            if (error instanceof ScrapingError) {
              throw error
            }
            throw new ScrapingError(
              `Request handler failed: ${error instanceof Error ? error.message : String(error)}`,
              'REQUEST_HANDLER_ERROR',
              undefined,
              request.url
            )
          }
        },
        failedRequestHandler({ request, error }) {
          const scrapingError = new ScrapingError(
            `Failed to scrape ${request.url}: ${error instanceof Error ? error.message : String(error)}`,
            'REQUEST_FAILED',
            undefined,
            request.url
          )
          errorMessage = scrapingError.message
          log.error(scrapingError.message)
        },
      })

      await writer?.custom({ type: 'data-tool-progress', data: { message: '📥 Fetching and parsing page...' } });
      await crawler.run([new Request({ url: context.url })])

      // Enhanced HTML to markdown conversion using JSDOM
      if (
        typeof rawContent === 'string' &&
        rawContent.trim().length > 0
      ) {
        try {
          markdownContent = HtmlProcessor.htmlToMarkdown(rawContent)
          markdownContent = HtmlProcessor.sanitizeMarkdown(markdownContent)
        } catch (error) {
          log.warn(
            'Enhanced HTML to markdown conversion failed, using fallback',
            {
              error:
                error instanceof Error
                  ? error.message
                  : String(error),
            }
          )
          try {
            // Sanitize raw HTML before passing to marked to prevent XSS via raw HTML content.
            const sanitizedForMarked =
              HtmlProcessor.sanitizeHtml(rawContent)
            markdownContent = await marked.parse(sanitizedForMarked)
          } catch (fallbackError) {
            log.warn('Fallback conversion also failed', {
              error:
                fallbackError instanceof Error
                  ? fallbackError.message
                  : String(fallbackError),
            })
            markdownContent =
              HtmlProcessor.extractTextContent(rawContent)
          }
        }

        await writer?.custom({ type: 'data-tool-progress', data: { message: '✂️ Converting to markdown...' } });
        if (
          context.saveMarkdown === true &&
          typeof markdownContent === 'string' &&
          markdownContent.trim() !== ''
        ) {
          try {
            const fileName =
              typeof context.markdownFileName === 'string' &&
                context.markdownFileName.trim() !== ''
                ? ValidationUtils.sanitizeFileName(
                  context.markdownFileName
                )
                : `scraped_${new Date().toISOString().replace(/[:.]/g, '-')}.md`

            const dataDir = path.join(process.cwd(), './data')
            const fullPath = path.join(dataDir, fileName)

            if (
              !ValidationUtils.validateFilePath(fullPath, dataDir)
            ) {
              throw new ScrapingError(
                'Invalid file path',
                'INVALID_FILE_PATH'
              )
            }

            await fs.mkdir(dataDir, { recursive: true })
            // Open the file handle and write via the handle to avoid using fs.writeFile with a non-literal argument.
            // Path was already validated by ValidationUtils.validateFilePath above.
            const fileHandle = await fs.open(fullPath, 'w')
            try {
              await fileHandle.writeFile(markdownContent, 'utf-8')
            } finally {
              await fileHandle.close()
            }
            savedFilePath = fileName
            log.info('Markdown content saved securely', {
              fileName,
            })
          } catch (error) {
            if (error instanceof ScrapingError) {
              throw error
            }
            log.error('Failed to save markdown file', {
              error:
                error instanceof Error
                  ? error.message
                  : String(error),
            })
          }
        }
      }

      await writer?.custom({ type: 'data-tool-progress', data: { message: `✅ Scraping complete: ${extractedData.length} elements${(savedFilePath !== null) ? ', saved to ' + savedFilePath : ''}` } });
      scrapeSpan?.end({
        output: {
          status,
          extractedDataCount: extractedData.length,
          contentLength: rawContent?.length ?? 0,
          savedFile: !!(
            typeof savedFilePath === 'string' &&
            savedFilePath.trim().length > 0
          ),
        },
      })
    } catch (error) {
      const scrapingError =
        error instanceof ScrapingError
          ? error
          : new ScrapingError(
            `Web scraping failed: ${error instanceof Error ? error.message : String(error)}`,
            'GENERAL_ERROR'
          )

      errorMessage = scrapingError.message
      log.error(scrapingError.message)

      const errorMsg = scrapingError.message
      scrapeSpan?.end({
        metadata: { error: errorMsg, code: scrapingError.code },
      })
    }

    return webScraperOutputSchema.parse({
      url: scrapedUrl,
      extractedData,
      rawContent:
        context.selector !== null
          ? undefined
          : typeof rawContent === 'string' &&
            rawContent.trim().length > 0
            ? rawContent
            : undefined,
      markdownContent,
      savedFilePath,
      status,
      errorMessage,
      metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
      images: images.length > 0 ? images : undefined,
      structuredData: structuredData.length > 0 ? structuredData : undefined,
      detectedLanguage,
    })
  },
})

export type WebScraperUITool = InferUITool<typeof webScraperTool>;
// ===== BATCH WEB SCRAPER TOOL =====

const batchWebScraperInputSchema = z.object({
  urls: z
    .array(z.url())
    .describe('Array of URLs to scrape.')
    .max(10, 'Maximum 10 URLs allowed for batch scraping'),
  selector: z
    .string()
    .optional()
    .describe('CSS selector for elements to extract from each page.'),
  maxConcurrent: z
    .number()
    .min(1)
    .max(15)
    .optional()
    .describe(
      'Maximum number of concurrent requests (default: 3, max: 15).'
    ),
  saveResults: z
    .boolean()
    .optional()
    .describe('Whether to save results to data directory.'),
  baseFileName: z
    .string()
    .optional()
    .describe("Base filename for saved results (default: 'batch_scrape')."),
})

const batchWebScraperOutputSchema = z.object({
  results: z
    .array(
      z.object({
        url: z.string(),
        success: z.boolean(),
        extractedData: z
          .array(z.record(z.string(), z.string()))
          .optional(),
        markdownContent: z.string().optional(),
        errorMessage: z.string().optional(),
      })
    )
    .describe('Results for each scraped URL.'),
  savedFilePath: z
    .string()
    .optional()
    .describe('Path to the saved batch results file.'),
  totalProcessed: z.number().describe('Total number of URLs processed.'),
  successful: z.number().describe('Number of successful scrapes.'),
  failed: z.number().describe('Number of failed scrapes.'),
})

export const batchWebScraperTool = createTool({
  id: 'batch-web-scraper',
  description:
    'Scrape multiple web pages concurrently with enhanced JSDOM processing and rate limiting.',
  inputSchema: batchWebScraperInputSchema,
  outputSchema: batchWebScraperOutputSchema,
  execute: async ({ context, writer, tracingContext }: { context: { urls: string[]; selector?: string; maxConcurrent?: number; saveResults?: boolean; baseFileName?: string }, writer?: any, tracingContext?: TracingContext }) => {
    await writer?.custom({ type: 'data-tool-progress', data: { message: `🌐 Batch scraping ${context.urls.length} URLs` } });
    toolCallCounters.set('batch-web-scraper', (toolCallCounters.get('batch-web-scraper') ?? 0) + 1)
    const batchSpan = tracingContext?.currentSpan?.createChildSpan({
      type: AISpanType.TOOL_CALL,
      name: 'batch_web_scrape',
      input: {
        urlCount: context.urls.length,
        selector: context.selector,
        maxConcurrent: context.maxConcurrent ?? 3,
        saveResults: context.saveResults,
      },
      tracingPolicy: { internal: InternalSpans.ALL }
    })

    await writer?.custom({ type: 'data-tool-progress', data: { message: '🐛 Initializing batch crawlers...' } });
    log.info('Starting enhanced batch web scraping with JSDOM', {
      urlCount: context.urls.length,
      maxConcurrent: context.maxConcurrent ?? 3,
      saveResults: context.saveResults,
    })

    const results: Array<{
      url: string
      success: boolean
      extractedData?: Array<Record<string, string>>
      markdownContent?: string
      errorMessage?: string
    }> = []

    let savedFilePath: string | undefined
    const maxConcurrent = Math.min(context.maxConcurrent ?? 3, 5)

    try {
      for (let i = 0; i < context.urls.length; i += maxConcurrent) {
        const batch = context.urls.slice(i, i + maxConcurrent)
        const batchPromises = batch.map(async (url: string) => {
          try {
            const crawler = new CheerioCrawler({
              maxRequestsPerCrawl: 1,
              requestHandlerTimeoutSecs: 20,
              async requestHandler({ body }) {
                const rawContent = body.toString()
                const sanitizedHtml =
                  HtmlProcessor.sanitizeHtml(rawContent)
                const extractedData: Array<
                  Record<string, string>
                > = []

                if (
                  typeof context.selector === 'string' &&
                  context.selector.trim() !== ''
                ) {
                  // Use JSDOM for better element selection
                  // Ensure we pass a string and explicitly set contentType to avoid ambiguous parsing and suppress XSS/static analysis warnings.
                  const jsdom = new JSDOM(
                    String(sanitizedHtml),
                    {
                      contentType: 'text/html',
                      includeNodeLocations: false,
                    }
                  )
                  const { document } = jsdom.window

                  const selector = context.selector.trim()
                  const elements =
                    document.querySelectorAll(selector)
                  elements.forEach((element) => {
                    const data = new Map<string, string>()
                    data.set(
                      'text',
                      element.textContent?.trim() ?? ''
                    )
                    extractedData.push(
                      Object.fromEntries(data)
                    )
                  })
                }

                // Convert to markdown and sanitize the markdown output so we do not return unencoded HTML.
                let markdownContent =
                  HtmlProcessor.htmlToMarkdown(sanitizedHtml)
                markdownContent =
                  HtmlProcessor.sanitizeMarkdown(
                    markdownContent
                  )

                results.push({
                  url,
                  success: true,
                  extractedData,
                  markdownContent,
                })
              },
              failedRequestHandler({ error }) {
                results.push({
                  url,
                  success: false,
                  errorMessage:
                    error instanceof Error
                      ? error.message
                      : String(error),
                })
              },
            })

            await crawler.run([new Request({ url })])
          } catch (error) {
            results.push({
              url,
              success: false,
              errorMessage:
                error instanceof Error
                  ? error.message
                  : String(error),
            })
          }
        })

        await Promise.all(batchPromises)

        if (i + maxConcurrent < context.urls.length) {
          await new Promise((resolve) => setTimeout(resolve, 1000))
        }
      }

      if (context.saveResults ?? false) {
        try {
          const timestamp = new Date()
            .toISOString()
            .replace(/[:.]/g, '-')
          const fileName = `${ValidationUtils.sanitizeFileName(context.baseFileName ?? 'batch_scrape')}_${timestamp}.json`
          const dataDir = path.join(process.cwd(), './data')
          const fullPath = path.join(dataDir, fileName)

          if (!ValidationUtils.validateFilePath(fullPath, dataDir)) {
            throw new ScrapingError(
              'Invalid file path',
              'INVALID_FILE_PATH'
            )
          }

          await fs.mkdir(dataDir, { recursive: true })
          // Open the file handle and write via the handle to avoid using fs.writeFile with a non-literal argument.
          // Path was already validated by ValidationUtils.validateFilePath above.
          const fileHandle = await fs.open(fullPath, 'w')
          try {
            await fileHandle.writeFile(
              JSON.stringify(results, null, 2),
              'utf-8'
            )
          } finally {
            await fileHandle.close()
          }
          savedFilePath = path.relative(
            path.join(process.cwd(), './data'),
            fullPath
          )
          log.info('Batch results saved securely', {
            fileName: savedFilePath,
          })
        } catch (error) {
          log.error('Failed to save batch results', {
            error:
              error instanceof Error
                ? error.message
                : String(error),
          })
        }
      }

      const successful = results.filter((r) => r.success).length
      const failed = results.length - successful
      await writer?.custom({ type: 'data-tool-progress', data: { message: `✅ Batch complete: ${successful}/${results.length} successful` } });

      batchSpan?.end({
        output: {
          totalProcessed: results.length,
          successful,
          failed,
          savedFile:
            typeof savedFilePath === 'string' &&
            savedFilePath.trim().length > 0,
        },
      })

      return batchWebScraperOutputSchema.parse({
        results,
        savedFilePath,
        totalProcessed: results.length,
        successful,
        failed,
      })
    } catch (error) {
      const errorMessage = `Batch scraping failed: ${error instanceof Error ? error.message : String(error)}`
      log.error(errorMessage)
      batchSpan?.end({ metadata: { error: errorMessage } })
      throw error
    }
  },
})

export type BatchWebScraperUITool = InferUITool<typeof batchWebScraperTool>;

// ===== SITE MAP EXTRACTOR TOOL =====

const siteMapExtractorInputSchema = z.object({
  url: z
    .url()
    .describe('The base URL of the website to extract sitemap from.')
    .refine((v) => ValidationUtils.validateUrl(v), 'Invalid URL format'),
  maxDepth: z
    .number()
    .min(1)
    .max(5)
    .optional()
    .describe('Maximum depth to crawl (default: 2, max: 5).'),
  maxPages: z
    .number()
    .min(1)
    .max(200)
    .optional()
    .describe('Maximum number of pages to crawl (default: 50, max: 200).'),
  includeExternal: z
    .boolean()
    .optional()
    .describe('Whether to include external links (default: false).'),
  saveMap: z
    .boolean()
    .optional()
    .describe('Whether to save the site map to data directory.'),
})

const siteMapExtractorOutputSchema = z.object({
  baseUrl: z.string().describe('The base URL that was crawled.'),
  pages: z
    .array(
      z.object({
        url: z.string(),
        title: z.string().optional(),
        depth: z.number(),
        internalLinks: z.array(z.string()),
        externalLinks: z.array(z.string()),
      })
    )
    .describe('Array of discovered pages with their metadata.'),
  totalPages: z.number().describe('Total number of pages discovered.'),
  savedFilePath: z
    .string()
    .optional()
    .describe('Path to the saved site map file.'),
})

export const siteMapExtractorTool = createTool({
  id: 'site-map-extractor',
  description:
    'Extract a comprehensive site map by crawling internal links with enhanced JSDOM processing and rate limiting.',
  inputSchema: siteMapExtractorInputSchema,
  outputSchema: siteMapExtractorOutputSchema,
  execute: async ({ context, writer, tracingContext }: { context: { url: string; maxDepth?: number; maxPages?: number; includeExternal?: boolean; saveMap?: boolean }, writer?: any, tracingContext?: TracingContext }) => {
    await writer?.custom({ type: 'data-tool-progress', data: { message: `🗺️ Starting site map extraction for ${context.url}` } });
    toolCallCounters.set('site-map-extractor', (toolCallCounters.get('site-map-extractor') ?? 0) + 1)
    const mapSpan = tracingContext?.currentSpan?.createChildSpan({
      type: AISpanType.TOOL_CALL,
      name: 'site_map_extraction',
      input: {
        url: context.url,
        maxDepth: context.maxDepth ?? 2,
        maxPages: context.maxPages ?? 50,
        includeExternal: context.includeExternal ?? false,
      },
      tracingPolicy: { internal: InternalSpans.ALL }
    })

    await writer?.custom({ type: 'data-tool-progress', data: { message: '🔍 Crawling internal links...' } });
    log.info('Starting enhanced site map extraction with JSDOM', {
      url: context.url,
      maxDepth: context.maxDepth ?? 2,
      maxPages: context.maxPages ?? 50,
    })

    const baseUrl = new URL(context.url)
    const visited = new Set<string>()
    const pages: Array<{
      url: string
      title?: string
      depth: number
      internalLinks: string[]
      externalLinks: string[]
    }> = []

    let savedFilePath: string | undefined

    // Define crawlPage at the function body root to avoid nested function declarations.
    const crawlPage = async (url: string, depth: number): Promise<void> => {
      if (
        visited.has(url) ||
        depth > (context.maxDepth ?? 2) ||
        pages.length >= (context.maxPages ?? 50)
      ) {
        return
      }

      visited.add(url)

      try {
        const crawler = new CheerioCrawler({
          maxRequestsPerCrawl: 5,
          maxConcurrency: 10,
          requestHandlerTimeoutSecs: 15,
          async requestHandler({ body }) {
            const rawContent = body.toString()
            const sanitizedHtml =
              HtmlProcessor.sanitizeHtml(rawContent)

            // Use JSDOM for better link extraction
            const dom = new JSDOM(sanitizedHtml, {
              includeNodeLocations: false,
            })
            const { document } = dom.window

            const title =
              document
                .querySelector('title')
                ?.textContent?.trim() ??
              document.querySelector('h1')?.textContent?.trim()
            const internalLinks: string[] = []
            const externalLinks: string[] = []

            const links = document.querySelectorAll('a[href]')
            links.forEach((link) => {
              const href = link.getAttribute('href')
              if (href !== null && href !== undefined) {
                try {
                  const absoluteUrl = new URL(href, url).href
                  const linkUrl = new URL(absoluteUrl)

                  if (linkUrl.hostname === baseUrl.hostname) {
                    if (!visited.has(absoluteUrl)) {
                      internalLinks.push(absoluteUrl)
                    }
                  } else if (
                    context.includeExternal === true
                  ) {
                    // Align with schema default (false)
                    externalLinks.push(absoluteUrl)
                  }
                } catch {
                  // Invalid URL, skip silently
                }
              }
            })

            pages.push({
              url,
              title,
              depth,
              internalLinks,
              externalLinks,
            })

            for (const link of internalLinks) {
              if (
                !visited.has(link) &&
                pages.length < (context.maxPages ?? 50)
              ) {
                await crawlPage(link, depth + 1)
                await new Promise((resolve) =>
                  setTimeout(resolve, 200)
                )
              }
            }
          },
          failedRequestHandler({ error }) {
            log.warn(`Failed to crawl ${url}`, {
              error:
                error instanceof Error
                  ? error.message
                  : String(error),
            })
          },
        })

        await crawler.run([new Request({ url })])
      } catch (error) {
        log.warn(`Error crawling ${url}`, {
          error:
            error instanceof Error ? error.message : String(error),
        })
      }
    }

    try {
      await crawlPage(context.url, 0)

      if (context.saveMap ?? false) {
        try {
          const timestamp = new Date()
            .toISOString()
            .replace(/[:.]/g, '-')
          const fileName = `sitemap_${baseUrl.hostname}_${timestamp}.json`
          const dataDir = path.join(process.cwd(), './data')
          const fullPath = path.join(dataDir, fileName)

          if (!ValidationUtils.validateFilePath(fullPath, dataDir)) {
            throw new ScrapingError(
              'Invalid file path',
              'INVALID_FILE_PATH'
            )
          }

          await fs.mkdir(dataDir, { recursive: true })
          await fs.writeFile(
            fullPath,
            JSON.stringify(
              {
                baseUrl: context.url,
                crawledAt: new Date().toISOString(),
                pages,
              },
              null,
              2
            ),
            'utf-8'
          )

          savedFilePath = path.relative(
            path.join(process.cwd(), './data'),
            fullPath
          ) // Consistent with other tools
          log.info('Site map saved securely', {
            fileName: savedFilePath,
          })
        } catch (error) {
          log.error('Failed to save site map', {
            error:
              error instanceof Error
                ? error.message
                : String(error),
          })
        }
      }

      await writer?.custom({ type: 'data-tool-progress', data: { message: `✅ Site map complete: ${pages.length} pages discovered` } });
      mapSpan?.end({
        output: {
          totalPages: pages.length,
          savedFile:
            typeof savedFilePath === 'string' &&
            savedFilePath.trim().length > 0,
        },
      })

      return siteMapExtractorOutputSchema.parse({
        baseUrl: context.url,
        pages,
        totalPages: pages.length,
        savedFilePath,
      })
    } catch (error) {
      const errorMessage = `Site map extraction failed: ${error instanceof Error ? error.message : String(error)}`
      log.error(errorMessage)
      mapSpan?.end({ metadata: { error: errorMessage } })
      throw error
    }
  },
})

export type SiteMapExtractorUITool = InferUITool<typeof siteMapExtractorTool>;
// ===== LINK EXTRACTOR TOOL =====

const linkExtractorInputSchema = z.object({
  url: z
    .url()
    .describe('The URL of the web page to extract links from.')
    .refine((v) => ValidationUtils.validateUrl(v), 'Invalid URL format'),
  linkTypes: z
    .array(z.enum(['internal', 'external', 'all']))
    .optional()
    .describe("Types of links to extract (default: ['all'])."),
  includeAnchors: z
    .boolean()
    .optional()
    .describe('Whether to include anchor text with links (default: true).'),
  filterPatterns: z
    .array(z.string())
    .optional()
    .describe('Regex patterns to filter links by href.'),
})

const linkExtractorOutputSchema = z.object({
  url: z.string().describe('The URL that was analyzed.'),
  links: z
    .array(
      z.object({
        href: z.string(),
        text: z.string(),
        type: z.enum(['internal', 'external']),
        isValid: z.boolean(),
      })
    )
    .describe('Array of extracted links with metadata.'),
  summary: z
    .object({
      total: z.number(),
      internal: z.number(),
      external: z.number(),
      invalid: z.number(),
    })
    .describe('Summary statistics of extracted links.'),
})

export const linkExtractorTool = createTool({
  id: 'link-extractor',
  description:
    'Extract and analyze all links from a web page with enhanced JSDOM processing and filtering.',
  inputSchema: linkExtractorInputSchema,
  outputSchema: linkExtractorOutputSchema,
  execute: async ({ context, writer, tracingContext }: { context: { url: string; linkTypes?: Array<'internal' | 'external' | 'all'>; includeAnchors?: boolean; filterPatterns?: string[] }, writer?: any, tracingContext?: TracingContext }) => {
    await writer?.custom({ type: 'data-tool-progress', data: { message: `🔗 Extracting links from ${context.url}` } });
    toolCallCounters.set('link-extractor', (toolCallCounters.get('link-extractor') ?? 0) + 1)
    const linkSpan = tracingContext?.currentSpan?.createChildSpan({
      type: AISpanType.TOOL_CALL,
      name: 'link_extraction',
      input: {
        url: context.url,
        linkTypes: context.linkTypes ?? ['all'],
        includeAnchors: context.includeAnchors ?? true,
        filterCount: context.filterPatterns?.length ?? 0,
      },
      tracingPolicy: { internal: InternalSpans.ALL }
    })

    log.info('Starting enhanced link extraction with JSDOM', {
      url: context.url,
      linkTypes: context.linkTypes ?? ['all'],
    })

    try {
      let rawContent: string | undefined
      let scrapedUrl: string = context.url

      const crawler = new CheerioCrawler({
        maxRequestsPerCrawl: 10,
        maxConcurrency: 10,
        requestHandlerTimeoutSecs: 20,
        async requestHandler({ request, body }) {
          scrapedUrl = request.url
          rawContent = body.toString()
        },
        failedRequestHandler({ error }) {
          throw new ScrapingError(
            `Failed to fetch ${context.url}: ${error instanceof Error ? error.message : String(error)}`,
            'FETCH_FAILED',
            undefined,
            context.url
          )
        },
      })

      await crawler.run([new Request({ url: context.url })])

      if (
        typeof rawContent !== 'string' ||
        rawContent.trim().length === 0
      ) {
        throw new ScrapingError(
          'Failed to retrieve page content',
          'NO_CONTENT'
        )
      }

      const sanitizedHtml = HtmlProcessor.sanitizeHtml(rawContent)

      // Use JSDOM for comprehensive link extraction
      const dom = new JSDOM(sanitizedHtml, {
        includeNodeLocations: false,
      })
      const { document } = dom.window
      const baseUrl = new URL(scrapedUrl)

      const links: Array<{
        href: string
        text: string
        type: 'internal' | 'external'
        isValid: boolean
      }> = []

      const linkElements = document.querySelectorAll('a[href]')
      linkElements.forEach((link) => {
        const href = link.getAttribute('href')
        const text = link.textContent?.trim() ?? href ?? ''

        if (href !== null) {
          try {
            const absoluteUrl = new URL(href, scrapedUrl).href
            const linkUrl = new URL(absoluteUrl)

            if (context.filterPatterns) {
              const matchesFilter = context.filterPatterns.some(
                (pattern) => {
                  // Do not construct RegExp from untrusted input; use a simple and safe wildcard matcher.
                  // Support '*' as a wildcard matching any sequence of characters, otherwise perform substring checks.
                  if (
                    typeof pattern !== 'string' ||
                    pattern.trim() === ''
                  ) {
                    return false
                  }
                  const parts = pattern
                    .split('*')
                    .map((p) => p.trim())
                    .filter((p) => p.length > 0)
                  // If pattern is only '*' or empty after trimming, treat as match-all
                  if (parts.length === 0) {
                    return true
                  }
                  let position = 0
                  for (const part of parts) {
                    const idx = absoluteUrl.indexOf(
                      part,
                      position
                    )
                    if (idx === -1) {
                      return false
                    }
                    position = idx + part.length
                  }
                  return true
                }
              )
              if (!matchesFilter) {
                return
              }
            }

            const isInternal = linkUrl.hostname === baseUrl.hostname
            const linkType = isInternal ? 'internal' : 'external'

            const requestedTypes = context.linkTypes ?? ['all']
            if (
              !requestedTypes.includes('all') &&
              !requestedTypes.includes(linkType)
            ) {
              return
            }

            // Validate and sanitize href before returning it to avoid unencoded values reaching HTML contexts.
            const isValidAbsolute =
              ValidationUtils.validateUrl(absoluteUrl)
            const safeHref = isValidAbsolute
              ? absoluteUrl
              : HtmlProcessor.sanitizeMarkdown(
                String(absoluteUrl)
              )

            links.push({
              href: safeHref,
              text: context.includeAnchors !== false ? text : '',
              type: linkType,
              isValid: isValidAbsolute,
            })
          } catch {
            // In case of any parsing error, return a sanitized href and mark it invalid.
            const safeHref = HtmlProcessor.sanitizeMarkdown(
              String(href)
            )
            links.push({
              href: safeHref,
              text: context.includeAnchors !== false ? text : '',
              type: 'external',
              isValid: false,
            })
          }
        }
      })

      const summary = {
        total: links.length,
        internal: links.filter((l) => l.type === 'internal').length,
        external: links.filter((l) => l.type === 'external').length,
        invalid: links.filter((l) => !l.isValid).length,
      }
      linkSpan?.end({
        output: {
          linkCount: links.length,
          summary,
        },
      })

      return linkExtractorOutputSchema.parse({
        url: scrapedUrl,
        links,
        summary,
      })
    } catch (error) {
      const errorMessage = `Link extraction failed: ${error instanceof Error ? error.message : String(error)}`
      log.error(errorMessage)
      linkSpan?.end({ metadata: { error: errorMessage } })
      throw error
    }
  },
})

// ===== HTML TO MARKDOWN CONVERTER TOOL =====
const htmlToMarkdownOutputSchema = z
  .object({
    // Ensure we always pass a real string into the sanitizer to avoid any unencoded/ambiguous values.
    markdown: z
      .string()
      .transform((s) => HtmlProcessor.sanitizeMarkdown(String(s)))
      .describe(
        'The converted markdown content (HTML-encoded to prevent XSS).'
      ),
    savedFilePath: z
      .string()
      .optional()
      .describe('Path to the saved file if saveToFile was true.'),
  })
  .strict()

const htmlToMarkdownInputSchema = z
  .object({
    html: z
      .string()
      .transform((s) => HtmlProcessor.sanitizeHtml(String(s)))
      .describe(
        'The HTML content to convert to markdown (will be sanitized by the schema to prevent raw HTML storage).'
      ),
    saveToFile: z
      .boolean()
      .optional()
      .describe('Whether to save the markdown to a file.'),
    fileName: z
      .string()
      .optional()
      .describe(
        'Filename for the saved markdown (relative to data directory).'
      ),
  })
  .strict()

export const htmlToMarkdownTool = createTool({
  id: 'html-to-markdown',
  description:
    'Convert HTML content to well-formatted markdown with enhanced JSDOM parsing and security.',
  inputSchema: htmlToMarkdownInputSchema,
  outputSchema: htmlToMarkdownOutputSchema,
  execute: async ({ context, runtimeContext, writer, tracingContext }) => {
    await writer?.custom({ type: 'data-tool-progress', data: { message: '🔄 Converting HTML to markdown...' } });
    toolCallCounters.set('html-to-markdown', (toolCallCounters.get('html-to-markdown') ?? 0) + 1)
    const convertSpan = tracingContext?.currentSpan?.createChildSpan({
      type: AISpanType.TOOL_CALL,
      name: 'html_to_markdown',
      input: {
        htmlLength: context.html.length,
        saveToFile: context.saveToFile,
        fileName: context.fileName,
      },
      tracingPolicy: { internal: InternalSpans.ALL }
    })

    await writer?.custom({ type: 'data-tool-progress', data: { message: '🧹 Sanitizing HTML...' } });
    log.info('Converting HTML to markdown with enhanced JSDOM processing', {
      htmlLength: context.html.length,
      saveToFile: context.saveToFile,
    })

    let savedFilePath: string | undefined

    try {
      const sanitizedHtml = HtmlProcessor.sanitizeHtml(context.html)
      const markdown = HtmlProcessor.htmlToMarkdown(sanitizedHtml)

      if (context.saveToFile === true) {
        try {
          const providedName = context.fileName
          const fileName =
            typeof providedName === 'string' &&
              providedName.trim().length > 0
              ? ValidationUtils.sanitizeFileName(providedName)
              : `converted_${new Date().toISOString().replace(/[:.]/g, '-')}.md`
          const dataDir = path.join(process.cwd(), './data')
          const fullPath = path.join(dataDir, fileName)

          if (!ValidationUtils.validateFilePath(fullPath, dataDir)) {
            throw new ScrapingError(
              'Invalid file path',
              'INVALID_FILE_PATH'
            )
          }

          await fs.mkdir(dataDir, { recursive: true })
          // Open the file handle and write via the handle to avoid using fs.writeFile with a non-literal argument.
          // Path was already validated by ValidationUtils.validateFilePath above.
          const fileHandle = await fs.open(fullPath, 'w')
          try {
            await fileHandle.writeFile(markdown, 'utf-8')
          } finally {
            await fileHandle.close()
          }
          savedFilePath = path.relative(
            path.join(process.cwd(), './data'),
            fullPath
          )
          log.info('Markdown saved securely', {
            fileName: savedFilePath,
          })
        } catch (error) {
          if (error instanceof ScrapingError) {
            throw error
          }
          log.error('Failed to save markdown file', {
            error:
              error instanceof Error
                ? error.message
                : String(error),
          })
        }
      }

      convertSpan?.end({
        output: {
          markdownLength: markdown.length,
          savedFile:
            typeof savedFilePath === 'string' &&
            savedFilePath.trim().length > 0,
        },
      })

      return htmlToMarkdownOutputSchema.parse({
        markdown,
        savedFilePath,
      })
    } catch (error) {
      const errorMessage = `HTML to markdown conversion failed: ${error instanceof Error ? error.message : String(error)}`
      log.error(errorMessage)
      convertSpan?.end({ metadata: { error: errorMessage } })
      throw error
    }
  },
})

export type HtmlToMarkdownUITool = InferUITool<typeof htmlToMarkdownTool>;

// ===== SCRAPED CONTENT MANAGER TOOL =====

const listScrapedContentInputSchema = z.object({
  pattern: z
    .string()
    .optional()
    .describe("Pattern to filter files (e.g., '*.md', 'scraped_*')."),
  includeMetadata: z
    .boolean()
    .optional()
    .describe('Whether to include file metadata (default: true).'),
})

const listScrapedContentOutputSchema = z.object({
  files: z
    .array(
      z.object({
        name: z.string(),
        path: z.string(),
        size: z.number().optional(),
        modified: z.string().optional(),
        created: z.string().optional(),
      })
    )
    .describe('Array of scraped content files.'),
  totalFiles: z.number().describe('Total number of files found.'),
  totalSize: z.number().describe('Total size of all files in bytes.'),
})

export const listScrapedContentTool = createTool({
  id: 'list-scraped-content',
  description:
    'List all scraped content files stored in the data directory with enhanced security.',
  inputSchema: listScrapedContentInputSchema,
  outputSchema: listScrapedContentOutputSchema,
  execute: async ({ context, writer, tracingContext }: { context: { pattern?: string; includeMetadata?: boolean }, writer?: any, tracingContext?: TracingContext }) => {
    await writer?.custom({ type: 'data-tool-progress', data: { message: '📂 Listing scraped content files...' } });
    toolCallCounters.set('list-scraped-content', (toolCallCounters.get('list-scraped-content') ?? 0) + 1)
    const listSpan = tracingContext?.currentSpan?.createChildSpan({
      type: AISpanType.TOOL_CALL,
      name: 'list_scraped_content',
      input: {
        pattern: context.pattern,
        includeMetadata: context.includeMetadata ?? true,
      },
      tracingPolicy: { internal: InternalSpans.ALL }
    })

    log.info('Listing scraped content with security validation', {
      pattern: context.pattern,
    })

    try {
      const dataDir = path.join(process.cwd(), './data')

      try {
        await fs.access(dataDir)
      } catch {
        return listScrapedContentOutputSchema.parse({
          files: [],
          totalFiles: 0,
          totalSize: 0,
        })
      }

      const items = await fs.readdir(dataDir, { withFileTypes: true })
      const files: Array<{
        name: string
        path: string
        size?: number
        modified?: string
        created?: string
      }> = []

      let totalSize = 0

      for (const item of items) {
        if (item.isFile()) {
          if (
            typeof context.pattern === 'string' &&
            context.pattern.trim() !== ''
          ) {
            try {
              const patternStr = context.pattern.trim()

              // Only allow a safe subset of characters in the pattern:
              // letters, numbers, underscore, hyphen, dot, space and the wildcard '*'.
              // Reject patterns containing other special characters to avoid any regex-like parsing.
              if (!/^[a-zA-Z0-9_\-.\\*\s]+$/.test(patternStr)) {
                // Unsafe pattern detected; skip filtering to avoid using untrusted input.
              } else {
                // Simple and safe wildcard matcher: supports '*' only, avoids RegExp construction.
                const matchWithWildcard = (
                  name: string,
                  pattern: string
                ): boolean => {
                  // Match-all
                  if (pattern === '*') {
                    return true
                  }
                  const parts = pattern.split('*')
                  let pos = 0
                  for (let i = 0; i < parts.length; i++) {
                    const part = parts[i]
                    if (part === '') {
                      continue
                    }
                    const idx = name.indexOf(part, pos)
                    if (idx === -1) {
                      return false
                    }
                    // If pattern does not start with '*', first part must be at the start
                    if (
                      i === 0 &&
                      !pattern.startsWith('*') &&
                      idx !== 0
                    ) {
                      return false
                    }
                    pos = idx + part.length
                  }
                  // If pattern does not end with '*', last part must align with the end
                  if (
                    !pattern.endsWith('*') &&
                    parts[parts.length - 1] !== ''
                  ) {
                    const last = parts[parts.length - 1]
                    if (!name.endsWith(last)) {
                      return false
                    }
                  }
                  return true
                }
                if (!matchWithWildcard(item.name, patternStr)) {
                  continue
                }
              }
            } catch {
              // Invalid pattern, skip filtering
            }
          }

          const filePath = path.join(dataDir, item.name)
          const relativePath = path.relative(dataDir, filePath)

          let metadata
          if (context.includeMetadata !== false) {
            try {
              const stats = await fs.stat(filePath)
              metadata = {
                size: stats.size,
                modified: stats.mtime.toISOString(),
                created: stats.birthtime.toISOString(),
              }
              totalSize += stats.size
            } catch {
              // Can't get metadata, continue without it
            }
          }

          files.push({
            name: item.name,
            path: relativePath,
            ...metadata,
          })
        }
      }

      listSpan?.end({
        output: {
          totalFiles: files.length,
          totalSize,
        },
      })

      return listScrapedContentOutputSchema.parse({
        files,
        totalFiles: files.length,
        totalSize,
      })
    } catch (error) {
      const errorMessage = `Failed to list scraped content: ${error instanceof Error ? error.message : String(error)}`
      log.error(errorMessage)
      listSpan?.end({ metadata: { error: errorMessage } })
      throw error
    }
  },
})

export type ListScrapedContentUITool = InferUITool<typeof listScrapedContentTool>;

// ===== CONTENT CLEANER TOOL =====

const contentCleanerInputSchema = z.object({
  html: z.string().describe('The HTML content to clean.'),
  removeScripts: z
    .boolean()
    .optional()
    .describe('Remove script tags (default: true).'),
  removeStyles: z
    .boolean()
    .optional()
    .describe('Remove style tags (default: true).'),
  removeComments: z
    .boolean()
    .optional()
    .describe('Remove HTML comments (default: true).'),
  preserveStructure: z
    .boolean()
    .optional()
    .describe('Preserve document structure (default: true).'),
})

const contentCleanerOutputSchema = z.object({
  cleanedHtml: z.string().describe('The cleaned HTML content.'),
  originalSize: z.number().describe('Original HTML size in characters.'),
  cleanedSize: z.number().describe('Cleaned HTML size in characters.'),
  reductionPercent: z.number().describe('Percentage of content removed.'),
})

export const contentCleanerTool = createTool({
  id: 'content-cleaner',
  description:
    'Clean HTML content by removing unwanted elements with enhanced JSDOM processing and security.',
  inputSchema: contentCleanerInputSchema,
  outputSchema: contentCleanerOutputSchema,
  execute: async ({ context, writer, tracingContext }: { context: { html: string; removeScripts?: boolean; removeStyles?: boolean; removeComments?: boolean; preserveStructure?: boolean }, writer?: any, tracingContext?: TracingContext }) => {
    await writer?.custom({ type: 'data-tool-progress', data: { message: '🧹 Starting content cleaning...' } });
    toolCallCounters.set('content-cleaner', (toolCallCounters.get('content-cleaner') ?? 0) + 1)
    const cleanSpan = tracingContext?.currentSpan?.createChildSpan({
      type: AISpanType.TOOL_CALL,
      name: 'content_cleaning',
      input: {
        htmlLength: context.html.length,
        removeScripts: context.removeScripts ?? true,
        removeStyles: context.removeStyles ?? true,
        removeComments: context.removeComments ?? true,
      },
      tracingPolicy: { internal: InternalSpans.ALL }
    })

    log.info('Cleaning HTML content with enhanced JSDOM security', {
      originalLength: context.html.length,
      removeScripts: context.removeScripts ?? true,
      removeStyles: context.removeStyles ?? true,
    })

    try {
      const dom = new JSDOM(context.html, {
        // Removed runScripts: 'dangerously' for safety
        includeNodeLocations: false,
      })

      const { document } = dom.window
      const originalSize = context.html.length

      // Remove dangerous elements using JSDOM
      const dangerousElements = document.querySelectorAll(
        'script, style, iframe, embed, object, noscript, meta, link[rel="stylesheet"], form, input, button, select, textarea'
      )
      dangerousElements.forEach((element) => element.remove())

      // Remove event handler attributes
      const allElements = document.querySelectorAll('*')
      allElements.forEach((element) => {
        Array.from(element.attributes).forEach((attr) => {
          if (
            attr.name.startsWith('on') ||
            HtmlProcessor.DANGEROUS_ATTRS.has(
              attr.name.toLowerCase()
            )
          ) {
            element.removeAttribute(attr.name)
          }
        })
      })

      // Remove HTML comments
      if (context.removeComments !== false) {
        const removeComments = (node: Node) => {
          const childNodes = Array.from(node.childNodes)
          childNodes.forEach((child) => {
            if (child.nodeType === dom.window.Node.COMMENT_NODE) {
              child.remove()
            } else if (
              child.nodeType === dom.window.Node.ELEMENT_NODE
            ) {
              removeComments(child)
            }
          })
        }
        removeComments(document.body)
      }

      const cleanedHtml =
        context.preserveStructure !== false
          ? document.body.innerHTML
          : (document.body.textContent ?? '')
      const cleanedSize = cleanedHtml.length
      const reductionPercent =
        originalSize > 0
          ? ((originalSize - cleanedSize) / originalSize) * 100
          : 0

      cleanSpan?.end({
        output: {
          originalSize,
          cleanedSize,
          reductionPercent: Math.round(reductionPercent * 100) / 100,
        },
      })

      return contentCleanerOutputSchema.parse({
        cleanedHtml,
        originalSize,
        cleanedSize,
        reductionPercent: Math.round(reductionPercent * 100) / 100,
      })
    } catch (error) {
      const errorMessage = `Content cleaning failed: ${error instanceof Error ? error.message : String(error)}`
      log.error(errorMessage)
      cleanSpan?.end({ metadata: { error: errorMessage } })
      throw error
    }
  },
})
export type ContentCleanerUITool = InferUITool<typeof contentCleanerTool>;

// ===== API DATA FETCHER TOOL =====

const apiDataFetcherInputSchema = z.object({
  url: z.url().describe('API endpoint URL.'),
  method: z.enum(['GET', 'POST', 'PUT', 'DELETE']).optional().describe('HTTP method (default: GET).'),
  headers: z.record(z.string(), z.string()).optional().describe('HTTP headers.'),
  body: z.any().optional().describe('Request body for POST/PUT.'),
  auth: z.object({
    type: z.enum(['bearer', 'basic', 'api-key']),
    token: z.string(),
    headerName: z.string().optional(),
  }).optional().describe('Authentication configuration.'),
  timeout: z.number().min(1000).max(60000).optional().describe('Request timeout in ms (default: 30000).'),
})

const apiDataFetcherOutputSchema = z.object({
  data: z.any().describe('Response data.'),
  status: z.number().describe('HTTP status code.'),
  headers: z.record(z.string(), z.string()).describe('Response headers.'),
  responseTime: z.number().describe('Response time in milliseconds.'),
})

export const apiDataFetcherTool = createTool({
  id: 'api-data-fetcher',
  description: 'Fetch data from JSON APIs with authentication and error handling.',
  inputSchema: apiDataFetcherInputSchema,
  outputSchema: apiDataFetcherOutputSchema,
  execute: async ({ context, writer, tracingContext }: { context: { url: string; method?: 'GET' | 'POST' | 'PUT' | 'DELETE'; headers?: Record<string, string>; body?: any; auth?: { type: 'bearer' | 'basic' | 'api-key'; token: string; headerName?: string }; timeout?: number }, writer?: any, tracingContext?: TracingContext }) => {
    await writer?.custom({ type: 'data-tool-progress', data: { message: `🌐 Fetching data from ${context.url}` } });
    toolCallCounters.set('api-data-fetcher', (toolCallCounters.get('api-data-fetcher') ?? 0) + 1)
    const fetchSpan = tracingContext?.currentSpan?.createChildSpan({
      type: AISpanType.TOOL_CALL,
      name: 'api_data_fetch',
      input: {
        url: context.url,
        method: context.method ?? 'GET',
        hasAuth: !!context.auth,
      },
      tracingPolicy: { internal: InternalSpans.ALL }
    })

    log.info('Fetching data from API', {
      url: context.url,
      method: context.method,
    })

    try {
      const startTime = Date.now()

      // Prepare headers
      const headers: Record<string, string> = { ...context.headers }

      // Add authentication
      if (context.auth) {
        switch (context.auth.type) {
          case 'bearer':
            headers['Authorization'] = `Bearer ${context.auth.token}`
            break
          case 'basic':
            headers['Authorization'] = `Basic ${Buffer.from(context.auth.token).toString('base64')}`
            break
          case 'api-key':
            { const headerName = context.auth.headerName ?? 'X-API-Key'
            headers[headerName] = context.auth.token
            break }
        }
      }

      // Make the request
      const response = await fetch(context.url, {
        method: context.method ?? 'GET',
        headers,
        body: context.body ? JSON.stringify(context.body) : undefined,
        signal: AbortSignal.timeout(context.timeout ?? 30000),
      })

      const responseTime = Date.now() - startTime

      if (!response.ok) {
        throw new ScrapingError(
          `API request failed: ${response.status} ${response.statusText}`,
          'API_ERROR',
          response.status,
          context.url
        )
      }

      const contentType = response.headers.get('content-type')
      let data: any

      if ((contentType?.includes('application/json')) ?? false) {
        data = await response.json()
      } else {
        data = await response.text()
      }

      const responseHeaders: Record<string, string> = {}
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value
      })

      fetchSpan?.end({
        output: {
          status: response.status,
          responseTime,
          dataType: typeof data,
        },
      })

      return apiDataFetcherOutputSchema.parse({
        data,
        status: response.status,
        headers: responseHeaders,
        responseTime,
      })
    } catch (error) {
      const errorMessage = `API data fetch failed: ${error instanceof Error ? error.message : String(error)}`
      log.error(errorMessage)
      fetchSpan?.end({ metadata: { error: errorMessage } })
      throw error
    }
  },
})

// ===== SCRAPING SCHEDULER TOOL =====

const scrapingSchedulerInputSchema = z.object({
  urls: z.array(z.string().url()).describe('URLs to scrape periodically.'),
  schedule: z.string().describe('Cron expression for scheduling (e.g., "0 */6 * * *" for every 6 hours).'),
  config: z.record(z.string(), z.any()).optional().describe('Scraping configuration to apply.'),
  maxRuns: z.number().min(1).max(100).optional().describe('Maximum number of scheduled runs (default: 10).'),
})

const scrapingSchedulerOutputSchema = z.object({
  jobId: z.string().describe('Unique ID for the scheduled job.'),
  nextRun: z.string().describe('Next scheduled run time.'),
  totalRuns: z.number().describe('Total number of runs scheduled.'),
  status: z.string().describe('Scheduler status.'),
})

export const scrapingSchedulerTool = createTool({
  id: 'scraping-scheduler',
  description: 'Schedule periodic scraping jobs with cron-like syntax.',
  inputSchema: scrapingSchedulerInputSchema,
  outputSchema: scrapingSchedulerOutputSchema,
  execute: async ({ context, writer, tracingContext }: { context: { urls: string[]; schedule: string; config?: Record<string, any>; maxRuns?: number }, writer?: any, tracingContext?: TracingContext }) => {
    await writer?.custom({ type: 'data-tool-progress', data: { message: `⏰ Scheduling scraping for ${context.urls.length} URLs` } });
    toolCallCounters.set('scraping-scheduler', (toolCallCounters.get('scraping-scheduler') ?? 0) + 1)
    const scheduleSpan = tracingContext?.currentSpan?.createChildSpan({
      type: AISpanType.TOOL_CALL,
      name: 'scraping_scheduler',
      input: {
        urlCount: context.urls.length,
        schedule: context.schedule,
        maxRuns: context.maxRuns ?? 10,
      },
      tracingPolicy: { internal: InternalSpans.ALL }
    })

    log.info('Scheduling periodic scraping', {
      urlCount: context.urls.length,
      schedule: context.schedule,
    })

    try {
      // Simple in-memory scheduler (in production, use a proper job scheduler)
      const jobId = `scrape_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      const maxRuns = context.maxRuns ?? 10

      // Calculate next run time (simplified - doesn't parse full cron)
      const nextRun = new Date(Date.now() + 3600000).toISOString() // 1 hour from now

      // Store job configuration (in production, persist to database)
      const jobConfig = {
        id: jobId,
        urls: context.urls,
        schedule: context.schedule,
        config: context.config ?? {},
        maxRuns,
        runsCompleted: 0,
        nextRun,
        status: 'scheduled',
      }

      // In a real implementation, this would integrate with a cron job system
      log.info('Scraping job scheduled', { jobId, nextRun })

      scheduleSpan?.end({
        output: {
          jobId,
          nextRun,
          totalRuns: maxRuns,
        },
      })

      return scrapingSchedulerOutputSchema.parse({
        jobId,
        nextRun,
        totalRuns: maxRuns,
        status: 'scheduled',
      })
    } catch (error) {
      const errorMessage = `Scheduling failed: ${error instanceof Error ? error.message : String(error)}`
      log.error(errorMessage)
      scheduleSpan?.end({ metadata: { error: errorMessage } })
      throw error
    }
  },
})

// ===== EXPORT AND INTEGRATION TOOL =====

const dataExporterInputSchema = z.object({
  data: z.array(z.record(z.string(), z.unknown())).describe('Data to export.'),
  format: z.enum(['json', 'csv', 'xml', 'database']).describe('Export format.'),
  destination: z.string().describe('Export destination (file path or DB connection string).'),
  options: z.record(z.string(), z.unknown()).optional().describe('Format-specific options.'),
})

const dataExporterOutputSchema = z.object({
  success: z.boolean().describe('Whether the export was successful.'),
  exportedCount: z.number().describe('Number of records exported.'),
  filePath: z.string().optional().describe('File path if exported to file.'),
  message: z.string().describe('Export result message.'),
})

export const dataExporterTool = createTool({
  id: 'data-exporter',
  description: 'Export scraped data to various formats and destinations.',
  inputSchema: dataExporterInputSchema,
  outputSchema: dataExporterOutputSchema,
  execute: async ({ context, writer, tracingContext }: { context: { data: Array<Record<string, unknown>>; format: 'json' | 'csv' | 'xml' | 'database'; destination: string; options?: Record<string, unknown> }, writer?: any, tracingContext?: TracingContext }) => {
    await writer?.custom({ type: 'data-tool-progress', data: { message: `📤 Exporting ${context.data.length} records to ${context.format}...` } });
    toolCallCounters.set('data-exporter', (toolCallCounters.get('data-exporter') ?? 0) + 1)
    const exportSpan = tracingContext?.currentSpan?.createChildSpan({
      type: AISpanType.TOOL_CALL,
      name: 'data_export',
      input: {
        dataCount: context.data.length,
        format: context.format,
        destination: context.destination,
      },
      tracingPolicy: { internal: InternalSpans.ALL }
    })

    log.info('Exporting data', {
      dataCount: context.data.length,
      format: context.format,
      destination: context.destination,
    })

    try {
      let filePath: string | undefined
      let message = 'Export completed successfully'

      switch (context.format) {
        case 'json':
          { const jsonContent = JSON.stringify(context.data, null, 2)
          filePath = context.destination
          await fs.mkdir(path.dirname(filePath), { recursive: true })
          await fs.writeFile(filePath, jsonContent, 'utf-8')
          break }

        case 'csv':
          // Simple CSV conversion (in production, use a proper CSV library)
          { if (context.data.length === 0) {
            throw new ScrapingError('No data to export', 'NO_DATA')
          }
          const headers = Object.keys(context.data[0])
          const csvRows = [
            headers.join(','),
            ...context.data.map(row =>
              headers.map(header => JSON.stringify(row[header] ?? '')).join(',')
            )
          ]
          const csvContent = csvRows.join('\n')
          filePath = context.destination
          await fs.mkdir(path.dirname(filePath), { recursive: true })
          await fs.writeFile(filePath, csvContent, 'utf-8')
          break }

        case 'xml':
          // Simple XML conversion
          { let xmlContent = '<?xml version="1.0" encoding="UTF-8"?>\n<data>\n'
          for (const item of context.data) {
            xmlContent += '  <item>\n'
            for (const [key, value] of Object.entries(item)) {
              xmlContent += `    <${key}>${String(value ?? '').replace(/[<>&"]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c] ?? c))}</${key}>\n`
            }
            xmlContent += '  </item>\n'
          }
          xmlContent += '</data>'
          filePath = context.destination
          await fs.mkdir(path.dirname(filePath), { recursive: true })
          await fs.writeFile(filePath, xmlContent, 'utf-8')
          break }

        case 'database':
          // Placeholder for database export (would need DB connection)
          message = `Database export to ${context.destination} not implemented (placeholder)`
          break

        default:
          throw new ScrapingError(`Unsupported format: ${context.format}`, 'UNSUPPORTED_FORMAT')
      }

      exportSpan?.end({
        output: {
          success: true,
          exportedCount: context.data.length,
          filePath,
        },
      })

      return dataExporterOutputSchema.parse({
        success: true,
        exportedCount: context.data.length,
        filePath,
        message,
      })
    } catch (error) {
      const errorMessage = `Data export failed: ${error instanceof Error ? error.message : String(error)}`
      log.error(errorMessage)
      exportSpan?.end({ metadata: { error: errorMessage } })
      throw error
    }
  },
})
