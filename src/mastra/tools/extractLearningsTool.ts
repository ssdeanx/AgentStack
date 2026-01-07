import type { MastraModelOutput } from '@mastra/core/stream';
import type { InferUITool } from "@mastra/core/tools";
import { createTool } from "@mastra/core/tools";
import { SpanStatusCode, trace } from "@opentelemetry/api";
import { z } from 'zod';
import { log } from '../config/logger';

export const extractLearningsTool = createTool({
  id: 'extract-learnings',
  description:
    'Extract key learnings and follow-up questions from a search result',
  inputSchema: z.object({
    query: z.string().describe('The original research query'),
    result: z
      .object({
        title: z.string(),
        url: z.string(),
        content: z.string(),
      })
      .describe('The search result to process'),
  }),
  onInputStart: ({ toolCallId, messages, abortSignal }) => {
    log.info('extractLearningsTool tool input streaming started', { toolCallId, messageCount: messages.length, hook: 'onInputStart' });
  },
  onInputAvailable: ({ input, toolCallId, messages, abortSignal }) => {
    log.info('extractLearningsTool received input', {
      toolCallId,
      messageCount: messages.length,
      inputData: {
        query: input.query,
        result: {
          title: input.result.title,
          url: input.result.url,
        },
      },
      hook: 'onInputAvailable'
    });
  },
  onOutput: ({ output, toolCallId, toolName, abortSignal }) => {
    log.info('extractLearningsTool completed', {
      toolCallId,
      toolName,
      outputData: {
        learning: output.learning,
        followUpQuestions: output.followUpQuestions,
      },
      hook: 'onOutput'
    });
  },
  execute: async (inputData, context) => {
    const mastra = context?.mastra;
    const writer = context?.writer;
    // Emit progress start event
    await writer?.custom({
      type: 'data-tool-progress',
      data: {
        status: 'in-progress',
        message: '🧠 Extracting learnings from search result',
        stage: 'extract-learnings',
      },
      id: 'extract-learnings',
    })
    const tracer = trace.getTracer('extract-learnings');
    const extractSpan = tracer.startSpan('extract_learnings', {
      attributes: {
        query: inputData?.query,
        url: inputData?.result?.url,
        contentLength: inputData?.result?.content?.length,
        operation: 'extract_learnings'
      }
    });

    try {
      const { query, result } = inputData;

      log.info('Extracting learnings from search result', {
        title: result.title,
        url: result.url,
      })
      await writer?.custom({ type: 'data-tool-progress', data: { status: 'in-progress', message: '🤖 Generating insights with learning agent', stage: 'extract-learnings' }, id: 'extract-learnings' });

      const truncatedContent = (result?.content ?? '').slice(0, 8000);
      const contentWithTruncation = (result?.content ?? '').length > 8000 ? truncatedContent + 'AAAA...' : truncatedContent;

      const prompt = `The user is researching "${query}".\nExtract a key learning and generate follow-up questions from this search result:\n\nTitle: ${result?.title}\nURL: ${result?.url}\nContent: ${contentWithTruncation}\n\nRespond with a JSON object containing:\n- learning: string with the key insight from the content\n- followUpQuestions: array of up to 1 follow-up question for deeper research`;

      if (mastra === undefined || mastra === null) {
        await writer?.custom({ type: 'data-tool-progress', data: { status: 'done', message: '❌ Mastra instance not provided', stage: 'extract-learnings' }, id: 'extract-learnings' });
        extractSpan.setAttribute('output.learningLength', 0);
        extractSpan.setAttribute('output.followUpQuestionsCount', 0);
        extractSpan.end();
        return { learning: 'Mastra instance not provided', followUpQuestions: [] };
      }

      const agent = mastra.getAgent('learningExtractionAgent');
      if (agent === undefined || agent === null) {
        await writer?.custom({ type: 'data-tool-progress', data: { status: 'done', message: '❌ learningExtractionAgent not available', stage: 'extract-learnings' }, id: 'extract-learnings' });
        extractSpan.setAttribute('output.learningLength', 0);
        extractSpan.setAttribute('output.followUpQuestionsCount', 0);
        extractSpan.end();
        return { learning: 'learningExtractionAgent not available', followUpQuestions: [] };
      }

      let responseObject: unknown = {};
      if (typeof agent.stream === 'function') {
        // Use MastraModelOutput for accurate typing and pipe fullStream into the writer (Mastra nested-agent pattern)
        await writer?.custom({ type: 'data-tool-progress', data: { status: 'in-progress', message: '🔁 Streaming learnings from agent', stage: 'extract-learnings' }, id: 'extract-learnings' });
        const stream = await agent.stream(prompt) as MastraModelOutput | undefined;
        if (stream?.fullStream !== undefined && writer) { await stream.fullStream.pipeTo(writer as unknown as WritableStream) }

        if (stream) {
          const text = (await stream.text) ?? '';
          try { responseObject = stream.object ?? (text ? JSON.parse(text) : {}) } catch { responseObject = {} }
        } else {
          responseObject = {}
        }
      } else {
        const response = await agent.generate(prompt);
        try { responseObject = response.object ?? (response.text ? JSON.parse(response.text) : {}) } catch { responseObject = {} }
      }

      const outputSchema = z.object({
        learning: z.string(),
        followUpQuestions: z.array(z.string()).max(1),
      })

      log.info('Learning extraction response', {
        result: responseObject,
      })

      const parsed = outputSchema.safeParse(responseObject)

      if (!parsed.success) {
        log.warn('Learning extraction agent returned unexpected shape', { response: responseObject });


        extractSpan.setAttribute('output.learningLength', 0);
        extractSpan.setAttribute('output.followUpQuestionsCount', 0);
        extractSpan.end();

        await writer?.custom({
          type: 'data-tool-progress',
          data: {
            status: 'done',
            message: '⚠️ Invalid response format from agent',
            stage: 'extract-learnings',
          },
          id: 'extract-learnings',
        })

        return {
          learning: 'Invalid response format from learning extraction agent',
          followUpQuestions: [],
        }
      }

      const learningLength = parsed.data.learning.length ?? 0;
      const followUpQuestionsCount = parsed.data.followUpQuestions?.length ?? 0;

      extractSpan.setAttribute('output.learningLength', learningLength);
      extractSpan.setAttribute('output.followUpQuestionsCount', followUpQuestionsCount);
      extractSpan.end();

      await writer?.custom({
        type: 'data-tool-progress',
        data: {
          status: 'done',
          message: '✅ Learnings extracted successfully',
          stage: 'extract-learnings',
        },
        id: 'extract-learnings',
      })

      return parsed.data
    } catch (error) {
      log.error('Error extracting learnings', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      })
      const errorMessage = error instanceof Error ? error.message : String(error)

      try {
        extractSpan.recordException(new Error(errorMessage));
        extractSpan.setStatus({ code: SpanStatusCode.ERROR, message: errorMessage });
      } catch {
        // ignore
      }

      extractSpan.setAttribute('metadata.error', errorMessage);
      extractSpan.end();

      await writer?.custom({
        type: 'data-tool-progress',
        data: {
          status: 'done',
          message: `❌ Error extracting information: ${errorMessage}`,
          stage: 'extract-learnings',
        },
        id: 'extract-learnings',
      })

      return {
        learning: `Error extracting information: ${errorMessage}`,
        followUpQuestions: [],
      }
    }
  },
})

export type ExtractLearningsUITool = InferUITool<typeof extractLearningsTool>;
