import { trace, SpanStatusCode } from "@opentelemetry/api";
import type { InferUITool} from "@mastra/core/tools";
import { createTool } from "@mastra/core/tools";
import { z } from 'zod';
import { log } from '../config/logger';
import { evaluationAgent } from '../agents/evaluationAgent';

export const evaluateResultTool = createTool({
  id: 'evaluate-result',
  description:
    'Evaluate if a search result is relevant to the research query',
  inputSchema: z.object({
    query: z.string().describe('The original research query'),
    result: z
      .object({
        title: z.string(),
        url: z.string(),
        content: z.string(),
      })
      .describe('The search result to evaluate'),
    existingUrls: z
      .array(z.string())
      .describe('URLs that have already been processed')
      .optional(),
  }),
  execute: async (inputData, context) => {
    await context?.writer?.custom({ type: 'data-tool-progress', data: { status: 'in-progress', message: '🤔 Evaluating relevance of result: ' + inputData.result.title, stage: 'evaluate-result' }, id: 'evaluate-result' });

    const tracer = trace.getTracer('evaluate-result');
    const evalSpan = tracer.startSpan('evaluate_result', {
      attributes: {
        query: inputData.query,
        url: inputData.result.url,
        existingUrlsCount: inputData.existingUrls?.length ?? 0,
        operation: 'evaluate_result'
      }
    });

    try {
      const { query, result, existingUrls = [] } = inputData;
      log.info('Evaluating result', { inputData })

      // Check if URL already exists (only if existingUrls was provided)
      if (existingUrls?.includes(result.url)) {
        evalSpan.end();
        return {
          isRelevant: false,
          reason: 'URL already processed',
        }
      }

      const response = await evaluationAgent.generate([
        {
          role: 'user',
          content: `Evaluate whether this search result is relevant and will help answer the query: "${query}".

        Search result:
        Title: ${result.title}
        URL: ${result.url}
        Content snippet: ${result.content.substring(0, 500)}...

        Respond with a JSON object containing:
        - isRelevant: boolean indicating if the result is relevant
        - reason: brief explanation of your decision`,
        },
      ])

      const outputSchema = z.object({
        isRelevant: z.boolean(),
        reason: z.string(),
      })

      const parsed = outputSchema.safeParse(response.object)

      if (!parsed.success) {
        log.warn('Evaluation agent returned unexpected shape', {
          response: response.object,
        })
        const error = 'Invalid response format from evaluation agent';
        evalSpan.recordException(new Error(error));
        evalSpan.setStatus({ code: SpanStatusCode.ERROR, message: error });
        evalSpan.end();
        return {
          isRelevant: false,
          reason: error,
        }
      }

      evalSpan.end();
      await context?.writer?.custom({ type: 'data-tool-progress', data: { status: 'done', message: parsed.data.isRelevant ? '✅ Result is relevant' : '❌ Result is not relevant', stage: 'evaluate-result' }, id: 'evaluate-result' });
      return parsed.data
    } catch (error) {
      log.error('Error evaluating result:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      })
      const errorMessage =
        error instanceof Error ? error.message : String(error)

      evalSpan.recordException(new Error(errorMessage));
      evalSpan.setStatus({ code: SpanStatusCode.ERROR, message: errorMessage });
      evalSpan.end();

      return {
        isRelevant: false,
        reason: 'Error in evaluation',
      }
    }
  },
})

export type EvaluateResultUITool = InferUITool<typeof evaluateResultTool>;
