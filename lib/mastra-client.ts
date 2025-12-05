import { MastraClient } from "@mastra/client-js";

export const mastraClient = new MastraClient({
  baseUrl: process.env.NEXT_PUBLIC_MASTRA_API_URL || "http://localhost:4111",
  retries: 3,
  backoffMs: 300,
  maxBackoffMs: 5000,
  abortSignal: undefined,
  headers: {},
  credentials: "same-origin",
});

export { createAgentStreamResponse } from "./client-stream-to-ai-sdk";
export type { StreamToAISdkOptions } from "./client-stream-to-ai-sdk";
