import { AISpanType, InternalSpans } from '@mastra/core/ai-tracing'
import type { RuntimeContext } from '@mastra/core/runtime-context'
import { createTool } from '@mastra/core/tools'
import { z } from 'zod'
import { log } from '../config/logger'

// Define the expected shape of the runtime context for this tool
export interface JwtAuthContext {
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
  execute: async ({ runtimeContext, tracingContext, writer, context }) => {
    await writer?.custom({ type: 'data-tool-progress', data: { message: '🔐 Verifying JWT authentication' } });
    const jwt = (runtimeContext as RuntimeContext<JwtAuthContext>).get(
      'jwt'
    )

    // Create a span for tracing
    const span = tracingContext?.currentSpan?.createChildSpan({
      type: AISpanType.TOOL_CALL,
      name: 'jwt-auth-tool',
      input: { hasJwt: !!jwt },
      tracingPolicy: { internal: InternalSpans.TOOL }
    })

    if (!jwt) {
      const error = new Error('JWT not found in runtime context')
      span?.error({ error })
      throw error
    }

    try {
      //            const result = await AuthenticationService.verifyJWT(jwt)
      span?.end({
        //                output: { success: true, hasRoles: result.roles?.length > 0 },
      })
      // Mock return for now as the service call is commented out
      return {
        sub: 'mock-user',
        roles: ['user'],
        tenant: 'mock-tenant',
        stepUp: false,
        exp: Date.now() + 3600,
        iat: Date.now()
      }
      //            return result
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error)
      log.error(`JWT verification failed: ${errorMessage}`)
      span?.error({ error: new Error(errorMessage) })
      throw new Error('JWT verification failed: Unknown error')
    }
  },
})
