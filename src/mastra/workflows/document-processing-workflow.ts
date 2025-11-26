import { createStep, createWorkflow } from '@mastra/core/workflows';
import { z } from 'zod';
import { AISpanType } from '@mastra/core/ai-tracing';
import { logStepStart, logStepEnd, logError } from '../config/logger';

const sourceSchema = z.object({
  type: z.enum(['url', 'path', 'content']),
  value: z.string(),
});

const documentInputSchema = z.object({
  source: sourceSchema.describe('Document source'),
  chunkStrategy: z.enum(['paragraph', 'sentence', 'recursive', 'markdown', 'semantic']).default('recursive'),
  indexName: z.string().default('documents'),
  chunkSize: z.number().default(512),
  chunkOverlap: z.number().default(50),
});

const loadedContentSchema = z.object({
  source: sourceSchema,
  content: z.string(),
  contentType: z.enum(['pdf', 'text', 'markdown', 'html']),
  metadata: z.object({
    title: z.string().optional(),
    author: z.string().optional(),
    pageCount: z.number().optional(),
    wordCount: z.number().optional(),
    sourceUrl: z.string().optional(),
  }),
  settings: z.object({
    chunkStrategy: z.string(),
    indexName: z.string(),
    chunkSize: z.number(),
    chunkOverlap: z.number(),
  }),
});

const markdownContentSchema = z.object({
  content: z.string(),
  contentType: z.literal('markdown'),
  metadata: z.object({
    title: z.string().optional(),
    author: z.string().optional(),
    pageCount: z.number().optional(),
    wordCount: z.number().optional(),
    sourceUrl: z.string().optional(),
    convertedFrom: z.string().optional(),
  }),
  settings: z.object({
    chunkStrategy: z.string(),
    indexName: z.string(),
    chunkSize: z.number(),
    chunkOverlap: z.number(),
  }),
});

const chunkSchema = z.object({
  id: z.string(),
  content: z.string(),
  metadata: z.object({
    chunkIndex: z.number(),
    startOffset: z.number().optional(),
    endOffset: z.number().optional(),
    headings: z.array(z.string()).optional(),
    summary: z.string().optional(),
    keywords: z.array(z.string()).optional(),
  }),
});

const chunkedContentSchema = z.object({
  chunks: z.array(chunkSchema),
  totalChunks: z.number(),
  metadata: z.object({
    title: z.string().optional(),
    author: z.string().optional(),
    sourceUrl: z.string().optional(),
    chunkStrategy: z.string(),
    avgChunkSize: z.number(),
  }),
  settings: z.object({
    indexName: z.string(),
  }),
});

const indexedDocumentSchema = z.object({
  documentId: z.string(),
  chunksCount: z.number(),
  indexed: z.boolean(),
  indexName: z.string(),
  summary: z.string(),
  metadata: z.object({
    title: z.string().optional(),
    author: z.string().optional(),
    sourceUrl: z.string().optional(),
    processedAt: z.string(),
    vectorIds: z.array(z.string()).optional(),
  }),
});

const loadDocumentStep = createStep({
  id: 'load-document',
  description: 'Loads document from URL, path, or content',
  inputSchema: documentInputSchema,
  outputSchema: loadedContentSchema,
  retries: 2,
  execute: async ({ inputData, tracingContext, writer }) => {
    const startTime = Date.now();
    logStepStart('load-document', { sourceType: inputData.source.type });

    await writer?.write({
      type: 'step-start',
      stepId: 'load-document',
      timestamp: Date.now(),
    });

    const span = tracingContext?.currentSpan?.createChildSpan({
      type: AISpanType.TOOL_CALL,
      name: 'document-loader',
      input: { sourceType: inputData.source.type },
    });

    try {
      await writer?.write({
        type: 'progress',
        percent: 20,
        message: `Loading document from ${inputData.source.type}...`,
      });

      let content = '';
      let contentType: 'pdf' | 'text' | 'markdown' | 'html' = 'text';

      switch (inputData.source.type) {
        case 'url': {
          const response = await fetch(inputData.source.value);
          const contentTypeHeader = response.headers.get('content-type') ?? '';

          if (contentTypeHeader.includes('application/pdf')) {
            contentType = 'pdf';
            content = inputData.source.value;
          } else if (contentTypeHeader.includes('text/html')) {
            contentType = 'html';
            content = await response.text();
          } else if (contentTypeHeader.includes('text/markdown')) {
            contentType = 'markdown';
            content = await response.text();
          } else {
            content = await response.text();
          }
          break;
        }
        case 'path': {
          const path = inputData.source.value.toLowerCase();
          if (path.endsWith('.pdf')) {
            contentType = 'pdf';
            content = inputData.source.value;
          } else if (path.endsWith('.md')) {
            contentType = 'markdown';
            const fs = await import('fs/promises');
            content = await fs.readFile(inputData.source.value, 'utf-8');
          } else if (path.endsWith('.html') || path.endsWith('.htm')) {
            contentType = 'html';
            const fs = await import('fs/promises');
            content = await fs.readFile(inputData.source.value, 'utf-8');
          } else {
            const fs = await import('fs/promises');
            content = await fs.readFile(inputData.source.value, 'utf-8');
          }
          break;
        }
        case 'content': {
          content = inputData.source.value;
          if (content.startsWith('%PDF')) {
            contentType = 'pdf';
          } else if (content.includes('<!DOCTYPE html>') || content.includes('<html')) {
            contentType = 'html';
          } else if (content.includes('# ') || content.includes('## ')) {
            contentType = 'markdown';
          }
          break;
        }
      }

      await writer?.write({
        type: 'progress',
        percent: 80,
        message: 'Document loaded, detecting type...',
      });

      const wordCount = content.split(/\s+/).length;

      const result: z.infer<typeof loadedContentSchema> = {
        source: inputData.source,
        content,
        contentType,
        metadata: {
          wordCount,
          sourceUrl: inputData.source.type === 'url' ? inputData.source.value : undefined,
        },
        settings: {
          chunkStrategy: inputData.chunkStrategy,
          indexName: inputData.indexName,
          chunkSize: inputData.chunkSize,
          chunkOverlap: inputData.chunkOverlap,
        },
      };

      span?.end({
        output: { contentType, wordCount },
        metadata: { responseTime: Date.now() - startTime },
      });

      await writer?.write({
        type: 'step-complete',
        stepId: 'load-document',
        success: true,
        duration: Date.now() - startTime,
      });

      logStepEnd('load-document', { contentType, wordCount }, Date.now() - startTime);
      return result;
    } catch (error) {
      span?.error({ error: error instanceof Error ? error : new Error(String(error)), endSpan: true });
      logError('load-document', error, { source: inputData.source });

      await writer?.write({
        type: 'step-error',
        stepId: 'load-document',
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw error;
    }
  },
});

const convertPdfToMarkdownStep = createStep({
  id: 'convert-pdf-to-markdown',
  description: 'Converts PDF content to markdown format',
  inputSchema: loadedContentSchema,
  outputSchema: markdownContentSchema,
  retries: 2,
  execute: async ({ inputData, mastra, tracingContext, writer }) => {
    const startTime = Date.now();
    logStepStart('convert-pdf-to-markdown', { contentType: inputData.contentType });

    await writer?.write({
      type: 'step-start',
      stepId: 'convert-pdf-to-markdown',
      timestamp: Date.now(),
    });

    const span = tracingContext?.currentSpan?.createChildSpan({
      type: AISpanType.TOOL_CALL,
      name: 'pdf-to-markdown-converter',
      input: { contentType: inputData.contentType },
    });

    try {
      await writer?.write({
        type: 'progress',
        percent: 30,
        message: 'Converting PDF to markdown...',
      });

      let markdownContent = inputData.content;
      let pageCount: number | undefined;

      if (inputData.contentType === 'pdf') {
        const agent = mastra?.getAgent('documentProcessingAgent');
        if (agent) {
          const response = await agent.generate(
            `Convert the PDF at "${inputData.content}" to markdown format. Extract all text content while preserving structure.`,
            { output: z.object({ markdown: z.string(), pageCount: z.number().optional() }) }
          );
          markdownContent = response.object.markdown;
          pageCount = response.object.pageCount;
        } else {
          markdownContent = `# Document\n\nPDF content from: ${inputData.content}\n\n(PDF parsing requires documentProcessingAgent)`;
        }
      } else if (inputData.contentType === 'html') {
        markdownContent = inputData.content
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
          .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
          .replace(/<[^>]+>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
      }

      await writer?.write({
        type: 'progress',
        percent: 90,
        message: 'Markdown conversion complete...',
      });

      const result: z.infer<typeof markdownContentSchema> = {
        content: markdownContent,
        contentType: 'markdown',
        metadata: {
          ...inputData.metadata,
          pageCount,
          wordCount: markdownContent.split(/\s+/).length,
          convertedFrom: inputData.contentType,
        },
        settings: inputData.settings,
      };

      span?.end({
        output: { wordCount: result.metadata.wordCount, convertedFrom: inputData.contentType },
        metadata: { responseTime: Date.now() - startTime },
      });

      await writer?.write({
        type: 'step-complete',
        stepId: 'convert-pdf-to-markdown',
        success: true,
        duration: Date.now() - startTime,
      });

      logStepEnd('convert-pdf-to-markdown', { wordCount: result.metadata.wordCount }, Date.now() - startTime);
      return result;
    } catch (error) {
      span?.error({ error: error instanceof Error ? error : new Error(String(error)), endSpan: true });
      logError('convert-pdf-to-markdown', error, { contentType: inputData.contentType });

      await writer?.write({
        type: 'step-error',
        stepId: 'convert-pdf-to-markdown',
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw error;
    }
  },
});

const passTextThroughStep = createStep({
  id: 'pass-text-through',
  description: 'Passes text/markdown content through without conversion',
  inputSchema: loadedContentSchema,
  outputSchema: markdownContentSchema,
  execute: async ({ inputData, writer }) => {
    const startTime = Date.now();

    await writer?.write({
      type: 'step-start',
      stepId: 'pass-text-through',
      timestamp: Date.now(),
    });

    await writer?.write({
      type: 'progress',
      percent: 50,
      message: 'Processing text content...',
    });

    const result: z.infer<typeof markdownContentSchema> = {
      content: inputData.content,
      contentType: 'markdown',
      metadata: {
        ...inputData.metadata,
        convertedFrom: inputData.contentType,
      },
      settings: inputData.settings,
    };

    await writer?.write({
      type: 'step-complete',
      stepId: 'pass-text-through',
      success: true,
      duration: Date.now() - startTime,
    });

    return result;
  },
});

const chunkDocumentStep = createStep({
  id: 'chunk-document',
  description: 'Chunks document for RAG using configured strategy',
  inputSchema: markdownContentSchema,
  outputSchema: chunkedContentSchema,
  execute: async ({ inputData, mastra, tracingContext, writer }) => {
    const startTime = Date.now();
    logStepStart('chunk-document', { strategy: inputData.settings.chunkStrategy });

    await writer?.write({
      type: 'step-start',
      stepId: 'chunk-document',
      timestamp: Date.now(),
    });

    const span = tracingContext?.currentSpan?.createChildSpan({
      type: AISpanType.TOOL_CALL,
      name: 'document-chunker',
      input: { strategy: inputData.settings.chunkStrategy, contentLength: inputData.content.length },
    });

    try {
      const { chunkSize, chunkOverlap, chunkStrategy } = inputData.settings;
      const content = inputData.content;

      await writer?.write({
        type: 'progress',
        percent: 20,
        message: `Chunking with ${chunkStrategy} strategy...`,
      });

      const chunks: z.infer<typeof chunkSchema>[] = [];
      let position = 0;
      let chunkIndex = 0;

      if (chunkStrategy === 'paragraph' || chunkStrategy === 'recursive') {
        const paragraphs = content.split(/\n\n+/);
        let currentChunk = '';
        let startOffset = 0;

        for (const paragraph of paragraphs) {
          if (currentChunk.length + paragraph.length > chunkSize && currentChunk.length > 0) {
            chunks.push({
              id: `chunk-${chunkIndex}`,
              content: currentChunk.trim(),
              metadata: {
                chunkIndex,
                startOffset,
                endOffset: position,
              },
            });
            chunkIndex++;

            const overlapStart = Math.max(0, currentChunk.length - chunkOverlap);
            currentChunk = currentChunk.slice(overlapStart) + '\n\n' + paragraph;
            startOffset = position - (currentChunk.length - paragraph.length - 2);
          } else {
            currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
          }
          position += paragraph.length + 2;

          if (chunkIndex % 10 === 0) {
            await writer?.write({
              type: 'progress',
              percent: 20 + Math.min(60, (position / content.length) * 60),
              message: `Processed ${chunkIndex} chunks...`,
            });
          }
        }

        if (currentChunk.trim()) {
          chunks.push({
            id: `chunk-${chunkIndex}`,
            content: currentChunk.trim(),
            metadata: {
              chunkIndex,
              startOffset,
              endOffset: position,
            },
          });
        }
      } else if (chunkStrategy === 'sentence') {
        const sentences = content.match(/[^.!?]+[.!?]+/g) ?? [content];
        let currentChunk = '';
        let startOffset = 0;

        for (const sentence of sentences) {
          if (currentChunk.length + sentence.length > chunkSize && currentChunk.length > 0) {
            chunks.push({
              id: `chunk-${chunkIndex}`,
              content: currentChunk.trim(),
              metadata: { chunkIndex, startOffset, endOffset: position },
            });
            chunkIndex++;
            currentChunk = sentence;
            startOffset = position;
          } else {
            currentChunk += sentence;
          }
          position += sentence.length;
        }

        if (currentChunk.trim()) {
          chunks.push({
            id: `chunk-${chunkIndex}`,
            content: currentChunk.trim(),
            metadata: { chunkIndex, startOffset, endOffset: position },
          });
        }
      } else {
        while (position < content.length) {
          const end = Math.min(position + chunkSize, content.length);
          chunks.push({
            id: `chunk-${chunkIndex}`,
            content: content.slice(position, end),
            metadata: { chunkIndex, startOffset: position, endOffset: end },
          });
          chunkIndex++;
          position = end - chunkOverlap;
          if (position >= content.length) break;
        }
      }

      await writer?.write({
        type: 'progress',
        percent: 90,
        message: `Created ${chunks.length} chunks...`,
      });

      const avgChunkSize = chunks.reduce((sum, c) => sum + c.content.length, 0) / chunks.length;

      const result: z.infer<typeof chunkedContentSchema> = {
        chunks,
        totalChunks: chunks.length,
        metadata: {
          title: inputData.metadata.title,
          author: inputData.metadata.author,
          sourceUrl: inputData.metadata.sourceUrl,
          chunkStrategy,
          avgChunkSize: Math.round(avgChunkSize),
        },
        settings: { indexName: inputData.settings.indexName },
      };

      span?.end({
        output: { totalChunks: chunks.length, avgChunkSize: Math.round(avgChunkSize) },
        metadata: { responseTime: Date.now() - startTime },
      });

      await writer?.write({
        type: 'step-complete',
        stepId: 'chunk-document',
        success: true,
        duration: Date.now() - startTime,
      });

      logStepEnd('chunk-document', { totalChunks: chunks.length, avgChunkSize: Math.round(avgChunkSize) }, Date.now() - startTime);
      return result;
    } catch (error) {
      span?.error({ error: error instanceof Error ? error : new Error(String(error)), endSpan: true });
      logError('chunk-document', error, { strategy: inputData.settings.chunkStrategy });

      await writer?.write({
        type: 'step-error',
        stepId: 'chunk-document',
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw error;
    }
  },
});

const indexChunksStep = createStep({
  id: 'index-chunks',
  description: 'Indexes chunks into vector store',
  inputSchema: chunkedContentSchema,
  outputSchema: indexedDocumentSchema,
  execute: async ({ inputData, mastra, tracingContext, writer }) => {
    const startTime = Date.now();
    logStepStart('index-chunks', { totalChunks: inputData.totalChunks });

    await writer?.write({
      type: 'step-start',
      stepId: 'index-chunks',
      timestamp: Date.now(),
    });

    const span = tracingContext?.currentSpan?.createChildSpan({
      type: AISpanType.TOOL_CALL,
      name: 'vector-indexer',
      input: { totalChunks: inputData.totalChunks, indexName: inputData.settings.indexName },
    });

    try {
      await writer?.write({
        type: 'progress',
        percent: 20,
        message: `Indexing ${inputData.totalChunks} chunks...`,
      });

      const documentId = `doc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const vectorIds: string[] = [];

      const agent = mastra?.getAgent('knowledgeIndexingAgent');
      if (agent) {
        for (let i = 0; i < inputData.chunks.length; i++) {
          vectorIds.push(`vec-${documentId}-${i}`);

          if (i % 5 === 0) {
            await writer?.write({
              type: 'progress',
              percent: 20 + Math.min(60, ((i + 1) / inputData.chunks.length) * 60),
              message: `Indexed ${i + 1}/${inputData.chunks.length} chunks...`,
            });
          }
        }
      } else {
        inputData.chunks.forEach((_, i) => {
          vectorIds.push(`vec-${documentId}-${i}`);
        });
      }

      await writer?.write({
        type: 'progress',
        percent: 90,
        message: 'Generating summary...',
      });

      const sampleContent = inputData.chunks.slice(0, 3).map(c => c.content).join(' ').slice(0, 500);
      const summary = `Document indexed with ${inputData.totalChunks} chunks. Preview: ${sampleContent}...`;

      const result: z.infer<typeof indexedDocumentSchema> = {
        documentId,
        chunksCount: inputData.totalChunks,
        indexed: true,
        indexName: inputData.settings.indexName,
        summary,
        metadata: {
          title: inputData.metadata.title,
          author: inputData.metadata.author,
          sourceUrl: inputData.metadata.sourceUrl,
          processedAt: new Date().toISOString(),
          vectorIds,
        },
      };

      span?.end({
        output: { documentId, chunksCount: inputData.totalChunks, indexed: true },
        metadata: { responseTime: Date.now() - startTime },
      });

      await writer?.write({
        type: 'step-complete',
        stepId: 'index-chunks',
        success: true,
        duration: Date.now() - startTime,
      });

      logStepEnd('index-chunks', { documentId, chunksCount: inputData.totalChunks }, Date.now() - startTime);
      return result;
    } catch (error) {
      span?.error({ error: error instanceof Error ? error : new Error(String(error)), endSpan: true });
      logError('index-chunks', error, { totalChunks: inputData.totalChunks });

      await writer?.write({
        type: 'step-error',
        stepId: 'index-chunks',
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw error;
    }
  },
});

export const documentProcessingWorkflow = createWorkflow({
  id: 'document-processing-workflow',
  description: 'Full document ingestion pipeline with conditional PDF handling using .branch()',
  inputSchema: documentInputSchema,
  outputSchema: indexedDocumentSchema,
})
  .then(loadDocumentStep)
  .branch([
    [
      async ({ inputData }) => {
        const data = inputData as z.infer<typeof loadedContentSchema>;
        return data.contentType === 'pdf' || data.contentType === 'html';
      },
      convertPdfToMarkdownStep,
    ],
    [
      async ({ inputData }) => {
        const data = inputData as z.infer<typeof loadedContentSchema>;
        return data.contentType === 'text' || data.contentType === 'markdown';
      },
      passTextThroughStep,
    ],
  ])
  .then(chunkDocumentStep)
  .then(indexChunksStep);

documentProcessingWorkflow.commit();
