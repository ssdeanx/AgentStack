import { trace, SpanStatusCode } from "@opentelemetry/api";
import { createTool } from "@mastra/core/tools";
import { promises as fsPromises } from 'node:fs';
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


    const tracer = trace.getTracer('tools/fs-tool');
    const span = tracer.startSpan('fs-tool', {
      attributes: { action: inputData.action, file: inputData.file },
    });

    const { action, file, data } = inputData
    await writer?.custom({ type: 'data-tool-progress', data: {  status: 'in-progress', message: `💾 FS ${action} on ${file}`, stage: 'fsTool' }, id: 'fsTool' });
    try {
      switch (action) {
        case 'write':
          await fsPromises.writeFile(file, data)
          break
        case 'read': {
          const readContent = await fsPromises.readFile(file, 'utf8')
          return { message: readContent }
        }
        case 'append':
          await fsPromises.appendFile(file, data)
          break
        default:
          return { message: 'Invalid action' }
      }
      await writer?.custom({ type: 'data-tool-progress', data: { status: 'done', message: '✅ FS operation complete', stage: 'fsTool' }, id: 'fsTool' });
      span?.setAttribute('success', true);
      span?.end();
      return { message: 'Success' }
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : String(e);
      await writer?.custom({ type: 'data-tool-progress', data: { status: 'done', message: `❌ FS error: ${errorMsg}`, stage: 'fsTool' }, id: 'fsTool' });
      log.error(
        `FS operation failed: ${errorMsg}`
      );
      span?.recordException(e instanceof Error ? e : new Error(errorMsg));
      span?.setStatus({ code: SpanStatusCode.ERROR, message: errorMsg });
      span?.end();
      return {
        message: `Error: ${errorMsg}`,
      };
    }
  },
})
