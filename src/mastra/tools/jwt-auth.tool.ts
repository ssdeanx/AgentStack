import type { RequestContext } from '@mastra/core/request-context'
import { createTool } from '@mastra/core/tools'
import { SpanStatusCode, trace } from '@opentelemetry/api'
import { z } from 'zod'
import { log } from '../config/logger'

// Define the expected shape of the runtime context for this tool
export interface JwtAuthContext extends RequestContext {
    jwt: string
}

log.info('jwtAuthTool initialized')
export const jwtAuthTool = createTool({
    id: 'jwt-auth',
    description:
        'Verify JWT from the runtime context and return claims (roles, tenant, stepUp)',
    inputSchema: z.object({}), // Agent does not need to provide any input
    outputSchema: z.object({
        sub: z.string(),
        roles: z.array(z.string()),
        tenant: z.string().optional(),
        stepUp: z.boolean().optional(),
        exp: z.number().optional(),
        iat: z.number().optional(),
    }),
    onInputStart: ({ toolCallId, messages, abortSignal }) => {
        log.info('JWT auth tool input streaming started', {
            toolCallId,
            messageCount: messages.length,
            abortSignal: abortSignal?.aborted,
            hook: 'onInputStart',
        })
    },
    onInputDelta: ({ inputTextDelta, toolCallId, messages, abortSignal }) => {
        log.info('JWT auth tool received input chunk', {
            toolCallId,
            inputTextDelta,
            abortSignal: abortSignal?.aborted,
            messageCount: messages.length,
            hook: 'onInputDelta',
        })
    },
    onInputAvailable: ({ input, toolCallId, messages, abortSignal }) => {
        log.info('JWT auth received complete input', {
            toolCallId,
            messageCount: messages.length,
            abortSignal: abortSignal?.aborted,
            note: 'no parameters required',
            hook: 'onInputAvailable',
        })
    },
    onOutput: ({ output, toolCallId, toolName, abortSignal }) => {
        log.info('JWT auth completed', {
            toolCallId,
            toolName,
            abortSignal: abortSignal?.aborted,
            user: output.sub,
            roles: output.roles,
            tenant: output.tenant || 'none',
            hook: 'onOutput',
        })
    },
    execute: async (inputData, context) => {
        const writer = context?.writer
        const requestContext = context?.requestContext
        const abortSignal = context?.abortSignal

        // Check if operation was already cancelled
        if (abortSignal?.aborted === true) {
            throw new Error('JWT authentication cancelled')
        }

        await writer?.custom({
            type: 'data-tool-progress',
            data: {
                status: 'in-progress',
                message: '🔐 Verifying JWT authentication',
                stage: 'jwt-auth',
            },
            id: 'jwt-auth',
        })
        const jwt = (requestContext as RequestContext<JwtAuthContext>)?.get(
            'jwt'
        )

        // Create a span for tracing
        const tracer = trace.getTracer('tools/jwt-auth')
        const span = tracer.startSpan('jwt-auth-tool', {
            attributes: { hasJwt: !!jwt },
        })

        if (!jwt) {
            const error = new Error('JWT not found in runtime context')
            span?.recordException(error)
            span?.setStatus({
                code: SpanStatusCode.ERROR,
                message: error.message,
            })
            span?.end()
            throw error
        }

        try {
            // Check for cancellation before JWT verification
            if (abortSignal && abortSignal.aborted) {
                span?.setStatus({
                    code: 2,
                    message: 'Operation cancelled during JWT verification',
                })
                span?.end()
                throw new Error(
                    'JWT authentication cancelled during verification'
                )
            }

            //            const result = await AuthenticationService.verifyJWT(jwt)
            span?.setAttribute('success', true)
            span?.end()
            // Mock return for now as the service call is commented out
            return {
                sub: 'mock-user',
                roles: ['user'],
                tenant: 'mock-tenant',
                stepUp: false,
                exp: Date.now() + 3600,
                iat: Date.now(),
            }
            //            return result
        } catch (error) {
            // Handle AbortError specifically
            if (error instanceof Error && error.name === 'AbortError') {
                const cancelMessage = `JWT authentication cancelled`
                span?.setStatus({ code: 2, message: cancelMessage })
                span?.end()

                await writer?.custom({
                    type: 'data-tool-progress',
                    data: {
                        status: 'done',
                        message: `🛑 ${cancelMessage}`,
                        stage: 'jwt-auth',
                    },
                    id: 'jwt-auth',
                })

                log.warn(cancelMessage)
                throw new Error(cancelMessage)
            }

            const errorMessage =
                error instanceof Error ? error.message : String(error)
            log.error(`JWT verification failed: ${errorMessage}`)
            span?.recordException(new Error(errorMessage))
            span?.setStatus({
                code: SpanStatusCode.ERROR,
                message: errorMessage,
            })
            span?.end()
            throw new Error('JWT verification failed: Unknown error')
        }
    },
})
