import { MastraClient } from "@mastra/client-js";

// Optional AbortController to support request cancellation across the client
export const mastraAbortController = new AbortController();

/**
 * Client-side Mastra SDK instance for frontend use.
 * Use this in React components to interact with the Mastra API.
 *
 * For server-side streaming in API routes, import createAgentStreamResponse
 * directly from "@/lib/client-stream-to-ai-sdk" instead.
 */
export const mastraClient = new MastraClient({
  baseUrl: process.env.NEXT_PUBLIC_MASTRA_API_URL ?? "http://localhost:4111",
  retries: 3,
  backoffMs: 300,
  maxBackoffMs: 5000,
  abortSignal: mastraAbortController.signal,
  headers: {},
  credentials: "same-origin"
});
