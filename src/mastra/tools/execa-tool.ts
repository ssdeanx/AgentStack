import type { InferUITool } from '@mastra/core/tools'
import { createTool } from '@mastra/core/tools'
import { SpanType } from "@mastra/core/observability";
import chalk from 'chalk'
import type { ExecaError as ExecaErrorType } from 'execa'
import execa from 'execa'
import { Transform } from 'stream'
import { z } from 'zod'
import { log } from '../config/logger'
import type { RequestContext } from '@mastra/core/request-context'

export interface ExecaContext extends RequestContext {
    userId?: string
}

// Create transform stream that applies chalk
const colorTransform = new Transform({
    transform(chunk, _encoding, callback) {
        // Convert chunk to string and apply chalk
        const colored = chalk.blue(chunk.toString())
        this.push(colored)
        callback()
    },
})

export const execaTool = createTool({
    id: 'execaTool',
    description: 'Execa System Tool',
    inputSchema: z.object({
        command: z.string(),
        args: z.array(z.string()),
        cwd: z.string().optional().describe('Current working directory'),
        timeout: z.number().optional().describe('Timeout in milliseconds'),
        env: z
            .record(z.string(), z.string())
            .optional()
            .describe('Environment variables'),
    }),
    outputSchema: z.object({
        message: z.string(),
    }),

    execute: async (inputData, context) => {
        const writer = context?.writer
        const requestContext = context?.requestContext as ExecaContext | undefined
        const tracingContext = context?.tracingContext

        const span = tracingContext?.currentSpan?.createChildSpan({
            type: SpanType.TOOL_CALL,
            name: 'execa-tool',
            input: inputData,
            metadata: {
                'tool.id': 'execaTool',
                'tool.input.command': inputData.command,
                'user.id': requestContext?.userId,
            },
        })

        const { command, args, cwd, timeout, env } = inputData
        await writer?.custom({
            type: 'data-tool-progress',
            data: {
                status: 'in-progress',
                message: `💻 Executing command: ${command} ${args.join(' ')}`,
                stage: 'execaTool',
            },
            id: 'execaTool',
        })
        try {
            log.info(
                chalk.green(`Running command: ${command} ${args.join(' ')}`)
            )
            const optionsEnv: NodeJS.ProcessEnv = {
                ...process.env,
                ...(env ?? {}),
            }
            const result = await execa(command, args, {
                all: true,
                stdio: 'pipe',
                cwd,
                timeout,
                env: optionsEnv,
            })
            const output = result.all ?? ''
            await writer?.custom({
                type: 'data-tool-progress',
                data: {
                    status: 'done',
                    message: '✅ Command executed successfully',
                    stage: 'execaTool',
                },
                id: 'execaTool',
            })
            span?.update({
                output: { success: true, outputLength: output.length },
                metadata: {
                    'tool.output.success': true,
                    'tool.output.outputLength': output.length,
                }
            })
            span?.end()
            return { message: chalk.green(output) }
        } catch (e) {
            const errorMsg = e instanceof Error ? e.message : String(e)
            log.error(errorMsg)
            span?.error({
                error: e instanceof Error ? e : new Error(errorMsg),
                endSpan: true,
            })
            const execaErr = e as ExecaErrorType
            if (e instanceof Error && 'all' in e) {
                return {
                    message:
                        execaErr.all ?? execaErr.message ?? 'Command failed',
                }
            }
            return { message: errorMsg || 'Error' }
        }
    },
    onInputStart: ({ toolCallId, messages, abortSignal }) => {
        log.info('Execa tool input streaming started', {
            toolCallId,
            messageCount: messages.length,
            abortSignal: abortSignal?.aborted,
            hook: 'onInputStart',
        })
    },
    onInputDelta: ({ inputTextDelta, toolCallId, messages, abortSignal }) => {
        log.info('Execa tool received input chunk', {
            toolCallId,
            inputTextDelta,
            messageCount: messages.length,
            abortSignal: abortSignal?.aborted,
            hook: 'onInputDelta',
        })
    },
    onInputAvailable: ({ input, toolCallId, messages, abortSignal }) => {
        log.info('Execa tool received complete input', {
            toolCallId,
            messageCount: messages.length,
            command: input.command,
            argsCount: input.args.length,
            abortSignal: abortSignal?.aborted,
            hook: 'onInputAvailable',
        })
    },
    onOutput: ({ output, toolCallId, toolName, abortSignal }) => {
        log.info('Execa tool completed', {
            toolCallId,
            toolName,
            outputLength: output.message.length,
            abortSignal: abortSignal?.aborted,
            hook: 'onOutput',
        })
    },
})


export type ExecaUITool = InferUITool<typeof execaTool>
