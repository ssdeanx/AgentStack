
import type { InferUITool } from "@mastra/core/tools";
import { createTool } from "@mastra/core/tools";
import chalk from 'chalk';
import execa from 'execa';
import type { ExecaError as ExecaErrorType } from 'execa';
import { trace } from "@opentelemetry/api";
import { Transform } from 'stream';
import { z } from 'zod';
import { log } from '../config/logger';
import type { RequestContext } from '@mastra/core/request-context';

// Create transform stream that applies chalk
const colorTransform = new Transform({
  transform(chunk, _encoding, callback) {
    // Convert chunk to string and apply chalk
    const colored = chalk.blue(chunk.toString());
    this.push(colored);
    callback();
  },
});

export const execaTool = createTool({
  id: 'execaTool',
  description: 'Execa System Tool',
  inputSchema: z.object({
    command: z.string(),
    args: z.array(z.string()),
    cwd: z.string().optional().describe('Current working directory'),
    timeout: z.number().optional().describe('Timeout in milliseconds'),
    env: z.record(z.string(), z.string()).optional().describe('Environment variables'),
  }),
  outputSchema: z.object({
    message: z.string(),
  }),

  execute: async (inputData, context) => {
    const writer = context?.writer;
    const requestContext = context?.requestContext;

    const tracer = trace.getTracer('execa-tool', '1.0.0');
    const span = tracer.startSpan('execa-tool', {
      attributes: {
        'tool.id': 'execa-tool',
        'tool.input.command': inputData.command,
        'tool.input.args': inputData.args.join(' '),
      }
    });

    const { command, args, cwd, timeout, env } = inputData
    await writer?.custom({ type: 'data-tool-progress', data: { status: 'in-progress', message: `💻 Executing command: ${command} ${args.join(' ')}`, stage: 'execaTool' }, id: 'execaTool' });
    try {
      log.info(
        chalk.green(`Running command: ${command} ${args.join(' ')}`)
      )
      const optionsEnv: NodeJS.ProcessEnv = { ...process.env, ...(env ?? {}) };
      const result = await execa(command, args, {
        all: true,
        stdio: 'pipe',
        cwd,
        timeout,
        env: optionsEnv,
      })
      const output = result.all ?? ''
      await writer?.custom({ type: 'data-tool-progress', data: { status: 'done', message: '✅ Command executed successfully', stage: 'execaTool' }, id: 'execaTool' });
      span.setAttributes({
        'tool.output.success': true,
        'tool.output.outputLength': output.length,
      });
      span.end();
      return { message: chalk.green(output) }
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : String(e);
      log.error(errorMsg)
      span.recordException(e instanceof Error ? e : new Error(errorMsg));
      span.setStatus({ code: 2, message: errorMsg });
      span.end();
      const execaErr = e as ExecaErrorType;
      if (e instanceof Error && 'all' in e) {
        return { message: execaErr.all ?? execaErr.message ?? 'Command failed' }
      }
      return { message: errorMsg || 'Error' }
    }
  },
})

export type ExecaUITool = InferUITool<typeof execaTool>;
