import {
  createUIMessageStream,
  createUIMessageStreamResponse,
} from "ai";
import { toAISdkFormat } from "@mastra/ai-sdk";
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
  memory?: {
    thread?: string | { id: string; resourceId?: string };
    resource?: string;
    options?: {
      lastMessages?: number;
      semanticRecall?: boolean;
      workingMemory?: { enabled?: boolean };
    };
  };
  maxSteps?: number;
}

type MastraAgent = {
  stream: (
    messages: unknown,
    options?: {
      format?: string;
      threadId?: string;
      resourceId?: string;
      memory?: AgentStreamOptions["memory"];
      maxSteps?: number;
    }
  ) => Promise<MastraModelOutput & { toUIMessageStreamResponse?: () => Response }>;
};

type MastraInstance = {
  getAgent: (id: string) => MastraAgent;
} & Record<string, any>;

/**
 * Creates a streaming Response for Next.js API routes using server-side Mastra agent.
 * 
 * IMPORTANT: This should be used in API routes with the SERVER-SIDE mastra instance,
 * not the client SDK. The client SDK (MastraClient) is for frontend use only.
 * 
 * @example
 * ```ts
 * // app/api/chat/route.ts
 * import { mastra } from "@/src/mastra";
 * import { createAgentStreamResponse } from "@/lib/client-stream-to-ai-sdk";
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
  mastra: MastraInstance,
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

  // Preferred: Use built-in AI SDK format
  if (streamOptions.format === "aisdk") {
    const stream = await agent.stream(messages, streamOptions);
    if (stream.toUIMessageStreamResponse) {
      return stream.toUIMessageStreamResponse();
    }
  }

  // Fallback: Manual transformation with toAISdkFormat
  const stream = await agent.stream(messages, {
    threadId: options?.threadId,
    resourceId: options?.resourceId,
    memory: options?.memory,
    maxSteps: options?.maxSteps,
  });
  
  const uiMessageStream = createUIMessageStream({
    execute: async ({ writer }) => {
      const aiSdkStream = toAISdkFormat(stream, { from: "agent" });
      const reader = aiSdkStream.getReader();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          writer.write(value);
        }
      } finally {
        reader.releaseLock();
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
  _client: unknown,
  _options: StreamToAISdkOptions
): Promise<Response> {
  throw new Error(
    "createMastraStreamResponse is deprecated. Use createAgentStreamResponse with " +
    "the server-side mastra instance instead. See: https://mastra.ai/docs/frameworks/agentic-uis/ai-sdk"
  );
}