import type { InferUITool} from "@mastra/core/tools";
import { createTool } from "@mastra/core/tools";
import { z } from 'zod';
import { trace, SpanStatusCode } from "@opentelemetry/api";
import { editorAgent } from '../agents/editorAgent';
export const editorTool = createTool({
  id: 'editor-agent',
  description:
    'Calls the editor agent to edit and improve content across multiple formats including blog posts, technical documentation, business communications, creative writing, and general content.',
  inputSchema: z.object({
    content: z.string().describe('The content to be edited'),
    contentType: z
      .enum(['blog', 'technical', 'business', 'creative', 'general'])
      .optional()
      .describe(
        "The type of content being edited (defaults to 'general')"
      ),
    instructions: z
      .string()
      .optional()
      .describe('Specific editing instructions or focus areas'),
    tone: z
      .enum(['professional', 'casual', 'formal', 'engaging', 'technical'])
      .optional()
      .describe('Desired tone for the edited content'),
  }),
  outputSchema: z.object({
    editedContent: z.string().describe('The edited and improved content'),
    contentType: z.string().describe('The identified content type'),
    changes: z.array(z.string()).describe('List of key changes made'),
    suggestions: z
      .array(z.string())
      .optional()
      .describe('Additional suggestions for improvement'),
  }),
  execute: async (inputData, context) => {
    await context?.writer?.custom({ type: 'data-tool-agent', data: { message: '📝 Starting editor agent' }, id: 'editor-agent' });
    const { content, contentType = 'general', instructions, tone } = inputData
    const writer = context?.writer;

    const tracer = trace.getTracer('editor-agent-tool');
    const span = tracer.startSpan('editor-agent', {
      attributes: {
        contentType,
        contentLength: content.length,
        hasInstructions: typeof instructions === 'string' && instructions.trim().length > 0,
        tone: tone ?? 'not-specified',
        operation: 'editor-agent-run'
      }
    });

    try {
      // Direct agent usage

      // Build the prompt with context
      let prompt = `Edit the following content`
      if (contentType !== 'general') {
        prompt += ` (content type: ${contentType})`
      }
      if (tone) {
        prompt += ` with a ${tone} tone`
      }
      if (typeof instructions === 'string' && instructions.trim().length > 0) {
        prompt += `. Additional instructions: ${instructions}`
      }
      prompt += `:\n\n${content}`

      await writer?.custom({ type: 'data-tool-agent', data: { message: '🤖 Generating edited content' }, id: 'editor-agent' });
      const result = await editorAgent.generate(prompt)

      // Parse the structured response from the editor agent
      let parsedResult
      try {
        parsedResult = JSON.parse(result.text)
      } catch {
        // Fallback for non-JSON responses
        parsedResult = {
          editedContent: result.text,
          contentType,
          changes: ['Content edited and improved'],
          suggestions: [],
        }
      }

      span.end();

      await writer?.custom({ type: 'data-tool-agent', data: { message: '✅ Editing complete' }, id: 'editor-agent' });
      return {
        editedContent:
          parsedResult.editedContent ??
          parsedResult.copy ??
          result.text,
        contentType: parsedResult.contentType ?? contentType,
        changes: parsedResult.changes ?? [
          'Content edited and improved',
        ],
        suggestions: parsedResult.suggestions ?? [],
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'
      span.recordException(error instanceof Error ? error : new Error(errorMsg));
      span.setStatus({ code: SpanStatusCode.ERROR, message: errorMsg });
      span.end();
      throw new Error(`Failed to edit content: ${errorMsg}`)
    }
  },
})

export type EditorAgentUITool = InferUITool<typeof editorTool>;
