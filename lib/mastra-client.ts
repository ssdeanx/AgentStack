import { MastraClient } from '@mastra/client-js'

// Optional AbortController to support request cancellation across the client
export const Abort = new AbortController()
export const MASTRA_API_BASE_URL =
    process.env.NEXT_PUBLIC_MASTRA_API_URL ?? 'http://localhost:4111'

/**
 * Client-side Mastra SDK instance for frontend use.
 * Use this in React components to interact with the Mastra API.
 *
 * For server-side streaming in API routes, import createAgentStreamResponse
 * directly from "@/lib/client-stream-to-ai-sdk" instead.
 */
export const mastraClient = new MastraClient({
    baseUrl: MASTRA_API_BASE_URL,
    retries: 3,
    backoffMs: 300,
    maxBackoffMs: 5000,
    abortSignal: Abort.signal,
    headers: {},
    credentials: 'include',
})
