import { trace, SpanStatusCode } from "@opentelemetry/api";
import { createTool } from '@mastra/core/tools'
import { z } from 'zod'
import { log } from '../config/logger'
import type { RequestContext } from '@mastra/core/request-context';

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
  execute: async (inputData, context) => {
    const writer = context?.writer;
    const requestContext = context?.requestContext;


    await writer?.custom({ type: 'data-tool-progress', data: { status: 'in-progress', message: '🔐 Verifying JWT authentication', stage: 'jwt-auth' }, id: 'jwt-auth' });
    const jwt = (requestContext as RequestContext<JwtAuthContext>)?.get(
      'jwt'
    )

    // Create a span for tracing
    const tracer = trace.getTracer('tools/jwt-auth');
    const span = tracer.startSpan('jwt-auth-tool', {
      attributes: { hasJwt: !!jwt },
    });

    if (!jwt) {
      const error = new Error('JWT not found in runtime context')
      span?.recordException(error);
      span?.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
      span?.end();
      throw error
    }

    try {
      //            const result = await AuthenticationService.verifyJWT(jwt)
      span?.setAttribute('success', true);
      span?.end();
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
      span?.recordException(new Error(errorMessage));
      span?.setStatus({ code: SpanStatusCode.ERROR, message: errorMessage });
      span?.end();
      throw new Error('JWT verification failed: Unknown error')
    }
  },
})
