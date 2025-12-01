import { AISpanType, InternalSpans } from '@mastra/core/ai-tracing';
import { InferUITool, createTool } from "@mastra/core/tools";
import chalk from 'chalk';
import { execa, ExecaError } from 'execa';
import { Transform } from 'stream';
import { z } from 'zod';
import { log } from '../config/logger';
import type { TracingContext } from '@mastra/core/ai-tracing';
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
    }),
    outputSchema: z.object({
        message: z.string(),
    }),

    execute: async ({ context, writer, tracingContext }: { context: { command: string; args: string[] }, writer?: any, tracingContext?: TracingContext }) => {
        const span = tracingContext?.currentSpan?.createChildSpan({
            type: AISpanType.TOOL_CALL,
            name: 'execa-tool',
            input: { command: context.command, args: context.args },
            tracingPolicy: { internal: InternalSpans.TOOL }
        });

        const { command, args } = context
        await writer?.write({ type: 'progress', data: { message: `💻 Executing command: ${command} ${args.join(' ')}` } });
        try {
            log.info(
                chalk.green(`Running command: ${command} ${args.join(' ')}`)
            )
            const result = await execa(command, args, {
                all: true,
                stdio: 'pipe',
            })
            const output = result.all ?? ''
            await writer?.write({ type: 'progress', data: { message: '✅ Command executed successfully' } });
            span?.end({ output: { success: true, outputLength: output.length } });
            return { message: chalk.green(output) }
        } catch (e) {
            const errorMsg = e instanceof Error ? e.message : String(e);
            log.error(errorMsg)
            span?.error({ error: e instanceof Error ? e : new Error(errorMsg), endSpan: true });
            if (e instanceof ExecaError) {
                return { message: e.all ?? e.message ?? 'Command failed' }
            }
            return { message: 'Error' }
        }
    },
})

export type ExecaUITool = InferUITool<typeof execaTool>;