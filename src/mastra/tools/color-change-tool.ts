import { SpanType } from '@mastra/core/observability'
import type { RequestContext } from '@mastra/core/request-context'
import { createTool } from '@mastra/core/tools'
import z from 'zod'
import { log } from '../config/logger'

export interface ColorChangeRequestContext extends RequestContext {
  theme?: string
  userId?: string
  workspaceId?: string
}

export function changeBgColor(color: string) {
  if (typeof window !== 'undefined') {
    document.body.style.setProperty('--background', color)
  }
}

export const colorChangeTool = createTool({
  id: 'changeColor',
  description: 'Changes the background color',
  inputSchema: z.object({
    color: z.string(),
  }),
  execute: async (input, context) => {
    const { color } = input;
    const writer = context?.writer;
    const abortSignal = context?.abortSignal;
    const tracingContext = context?.tracingContext;
    const requestCtx = context?.requestContext as ColorChangeRequestContext | undefined;
    const userId = requestCtx?.userId;
    const workspaceId = requestCtx?.workspaceId;

    // Respect cancellation early
    if (abortSignal?.aborted ?? false) {
      throw new Error('Change color operation cancelled')
    }

    await writer?.custom({
      type: 'data-tool-progress',
      data: {
        status: 'in-progress',
        message: `🎨 Changing background color to ${color}`,
        stage: 'changeColor',
      },
      id: 'changeColor',
    })

    const span = tracingContext?.currentSpan?.createChildSpan({
      type: SpanType.TOOL_CALL,
      name: 'change-color',
      input: { color },
      metadata: {
        'tool.id': 'changeColor',
        'tool.input.color': color,
        'user.id': userId,
        'workspace.id': workspaceId,
      },
    })

    try {
      // On the server, we just return the color.
      // The client-side UI will handle the actual style change when it receives the tool result or call.

      span?.update({
        output: { success: true, color },
        metadata: {
          'tool.output.success': true,
        },
      })
      span?.end()

      await writer?.custom({
        type: 'data-tool-progress',
        data: {
          status: 'done',
          message: `✅ Background color changed to ${color}`,
          stage: 'changeColor',
        },
        id: 'changeColor',
      })

      return { success: true, color }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)

      span?.error({
        error: error instanceof Error ? error : new Error(errorMessage),
        endSpan: true,
      })

      await writer?.custom({
        type: 'data-tool-progress',
        data: {
          status: 'done',
          message: `Input: color="${color}" - ❌ Failed to change color: ${errorMessage}`,
          stage: 'changeColor',
        },
        id: 'changeColor',
      })

      log.error(`Failed to change background color to ${color}: ${errorMessage}`)
      throw error
    }
  },
  onInputStart: ({ toolCallId, messages, abortSignal }) => {
    log.info('Color change tool input streaming started', {
      toolCallId,
      messageCount: messages.length,
      abortSignal: abortSignal?.aborted,
      hook: 'onInputStart',
    })
  },
  onInputDelta: ({ inputTextDelta, toolCallId, messages, abortSignal }) => {
    log.info('Color change received input chunk', {
      toolCallId,
      inputTextDelta,
      messageCount: messages.length,
      abortSignal: abortSignal?.aborted,
      hook: 'onInputDelta',
    })
  },
  onInputAvailable: ({ input, toolCallId, messages, abortSignal }) => {
    log.info('Color change received complete input', {
      toolCallId,
      messageCount: messages.length,
      abortSignal: abortSignal?.aborted,
      color: input.color,
      hook: 'onInputAvailable',
    })
  },
  onOutput: ({ output, toolCallId, toolName, abortSignal }) => {
    log.info('Color change completed', {
      toolCallId,
      toolName,
      abortSignal: abortSignal?.aborted,
      success: output.success,
      color: output.color,
      hook: 'onOutput',
    })
  },
})
