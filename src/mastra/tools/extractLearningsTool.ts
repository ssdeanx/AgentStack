import { trace, SpanStatusCode } from "@opentelemetry/api";
import type { InferUITool} from "@mastra/core/tools";
import { createTool } from "@mastra/core/tools";
import { z } from 'zod';
import { log } from '../config/logger';
import { learningExtractionAgent } from '../agents/learningExtractionAgent';

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
  execute: async (inputData, context) => {
    await context?.writer?.custom({ type: 'data-tool-agent', data: { message: '🧠 Extracting learnings from search result' }, id: 'extract-learnings' });

    const tracer = trace.getTracer('extract-learnings');
    const extractSpan = tracer.startSpan('extract_learnings', {
      attributes: {
        query: inputData.query,
        url: inputData.result.url,
        contentLength: inputData.result.content.length,
        operation: 'extract_learnings'
      }
    });

    try {
      const { query, result } = inputData;

      log.info('Extracting learnings from search result', {
        title: result.title,
        url: result.url,
      })
      await context?.writer?.custom({ type: 'data-tool-agent', data: { message: '🤖 Generating insights with learning agent' } });
      const response = await learningExtractionAgent.generate([
        {
          role: 'user',
          content: `The user is researching "${query}".
            Extract a key learning and generate follow-up questions from this search result:

            Title: ${result.title}
            URL: ${result.url}
            Content: ${result.content.substring(0, 8000)}...

            Respond with a JSON object containing:
            - learning: string with the key insight from the content
            - followUpQuestions: array of up to 1 follow-up question for deeper research`,
        },
      ])

      const outputSchema = z.object({
        learning: z.string(),
        followUpQuestions: z.array(z.string()).max(1),
      })

      log.info('Learning extraction response', {
        result: response.object,
      })

      const parsed = outputSchema.safeParse(response.object)

      if (!parsed.success) {
        log.warn(
          'Learning extraction agent returned unexpected shape',
          {
            response: response.object,
          }
        )


        extractSpan.end();
        await context?.writer?.custom({ type: 'data-tool-agent', data: { message: '⚠️ Invalid response format from agent' } });
        return {
          learning:
            'Invalid response format from learning extraction agent',
          followUpQuestions: [],
        }
      }

      extractSpan.end();
      await context?.writer?.custom({ type: 'data-tool-agent', data: { message: '✅ Learnings extracted successfully' } });
      return parsed.data
    } catch (error) {
      log.error('Error extracting learnings', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      })
      const errorMessage =
        error instanceof Error ? error.message : String(error)

      extractSpan.recordException(new Error(errorMessage));
      extractSpan.setStatus({ code: SpanStatusCode.ERROR, message: errorMessage });
      extractSpan.end();

      return {
        learning: `Error extracting information: ${errorMessage}`,
        followUpQuestions: [],
      }
    }
  },
})

export type ExtractLearningsUITool = InferUITool<typeof extractLearningsTool>;
