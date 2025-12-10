import { trace } from "@opentelemetry/api";
import { createTool } from "@mastra/core/tools";
import { readFileSync, writeFileSync } from 'fs';
import { z } from 'zod';
import { log } from '../config/logger';
import type { RequestContext } from '@mastra/core/request-context';

export const fsTool = createTool({
  id: 'fsTool',
  description: 'File System Tool',
  inputSchema: z.object({
    action: z.string(),
    file: z.string(),
    data: z.string(),
  }),
  outputSchema: z.object({
    message: z.string(),
  }),
  execute: async (inputData, context) => {
    const writer = context?.writer;
    const tracingContext = context?.tracingContext;

    const span = tracingContext?.currentSpan?.createChildSpan({
      type: AISpanType.TOOL_CALL,
      name: 'fs-tool',
      input: { action: inputData.action, file: inputData.file },
    });

    const { action, file, data } = inputData
    await writer?.custom({ type: 'data-tool-progress', data: { message: `💾 FS ${action} on ${file}` } });
    try {
      switch (action) {
        case 'write':
          writeFileSync(file, data)
          break
        case 'read':
          return { message: readFileSync(file, 'utf8') }
        case 'append':
          writeFileSync(file, data, { flag: 'a' })
          break
        default:
          return { message: 'Invalid action' }
      }
      await writer?.custom({ type: 'data-tool-progress', data: { message: '✅ FS operation complete' } });
      span?.end({ output: { success: true } });
      return { message: 'Success' }
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : String(e);
      await writer?.custom({ type: 'data-tool-progress', data: { message: `❌ FS error: ${errorMsg}` } });
      log.error(
        `FS operation failed: ${errorMsg}`
      );
      span?.error({ error: e instanceof Error ? e : new Error(errorMsg), endSpan: true });
      return {
        message: `Error: ${errorMsg}`,
      };
    }
  },
})
