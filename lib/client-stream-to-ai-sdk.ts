import {
  createUIMessageStream,
  createUIMessageStreamResponse,
} from "ai";
import { toAISdkFormat } from "@mastra/ai-sdk";
import type { Mastra } from "@mastra/core/mastra";
import type { AgentExecutionOptions } from "@mastra/core/agent";
import type { MastraModelOutput } from "@mastra/core/stream";

export interface StreamToAISdkOptions {
  agentId: string;
  messages: string | Array<{ role: string; content: string }>;
  threadId?: string;
  resourceId?: string;
}

export interface AgentStreamOptions {
  format?: "aisdk" | "mastra";
  threadId?: string;
  resourceId?: string;
  memory?: AgentExecutionOptions["memory"];
  maxSteps?: number;
}

type StreamResult = MastraModelOutput & { toUIMessageStreamResponse?: () => Response };

function isReadableStream<T>(value: unknown): value is ReadableStream<T> {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as ReadableStream<T>).getReader === "function"
  );
}

async function* asyncIterableFromReadableStream<T>(
  stream: ReadableStream<T>
): AsyncIterable<T> {
  const reader = stream.getReader();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {break;}
      yield value;
    }
  } finally {
    reader.releaseLock();
  }
}

/**
 * Creates a streaming Response for Next.js API routes using server-side Mastra agent.
 *
 * IMPORTANT: This should be used in API 5stra instance,
 * not the client SDK. The client SDK (MastraClient) is for frontend use only.
 *
 * @example
 * ```ts
 * // app/api/chat/route.ts
 * import { mastra } from "@/src/mastra";
 * import { createAgentStreamResponse } from "@/lib/server/agent-stream";
 *
 * export async function POST(req: Request) {
 *   const { messages, agentId, threadId, resourceId, memory } = await req.json();
 *   return createAgentStreamResponse(mastra, agentId, messages, {
 *     threadId,
 *     resourceId,
 *     memory,
 *   });
 * }
 * ```
 *
 * @see https://mastra.ai/docs/frameworks/agentic-uis/ai-sdk
 */
export async function createAgentStreamResponse(
  mastra: Mastra,
  agentId: string,
  messages: unknown,
  options?: AgentStreamOptions
): Promise<Response> {
  const agent = mastra.getAgent(agentId);

  const streamOptions = {
    format: options?.format ?? "aisdk",
    threadId: options?.threadId,
    resourceId: options?.resourceId,
    memory: options?.memory,
    maxSteps: options?.maxSteps,
  };

  // Call agent.stream once and reuse the result
  const stream = await agent.stream(messages, streamOptions) as StreamResult;

  // Preferred: Use built-in AI SDK format when available
  if (streamOptions.format === "aisdk" && stream.toUIMessageStreamResponse) {
    return stream.toUIMessageStreamResponse();
  }

  // Fallback: Manual transformation with toAISdkFormat
  // Handles both ReadableStream and AsyncIterable return types
  const uiMessageStream = createUIMessageStream({
    execute: async ({ writer }) => {
      const aiSdkResult = toAISdkFormat(stream, { from: "agent" });

      // Handle both ReadableStream and AsyncIterable
      const iterable: AsyncIterable<unknown> = isReadableStream(aiSdkResult)
        ? asyncIterableFromReadableStream(aiSdkResult)
        : aiSdkResult;

      for await (const value of iterable) {
        writer.write(value as Parameters<typeof writer.write>[0]);
      }
    },
  });

  return createUIMessageStreamResponse({ stream: uiMessageStream });
}

/**
 * @deprecated Use createAgentStreamResponse with server-side mastra instance instead.
 * This export exists for backward compatibility only.
 */
export async function createMastraStreamResponse(
  client: unknown,
  options: StreamToAISdkOptions
): Promise<Response> {
  throw new Error(
    "createMastraStreamResponse is deprecated. Use createAgentStreamResponse with " +
    "the server-side mastra instance instead. See: https://mastra.ai/docs/frameworks/agentic-uis/ai-sdk"
  );
}
