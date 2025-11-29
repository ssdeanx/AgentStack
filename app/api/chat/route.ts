import { mastra } from "../../../src/mastra";
import { UIMessage, convertToModelMessages } from 'ai';
import { createUIMessageStream, createUIMessageStreamResponse } from "ai";
import { toAISdkFormat } from "@mastra/ai-sdk";
import type { ChunkType, MastraModelOutput } from "@mastra/core/stream";
import { RuntimeContext } from "@mastra/core/runtime-context";
export const maxDuration = 30;
export async function POST(req: Request) {
  const { messages }: {
    messages: UIMessage[];
    } = await req.json();
    const myAgent = mastra.getAgent("weatherAgent");
    const stream = await myAgent.stream(messages, {  });
    const uiMessageStream = createUIMessageStream({
    
      execute: async ({ writer }) => {
        const formatted = toAISdkFormat(stream, { from: "agent" })!;
        const runtimeContext = new RuntimeContext();
        // If the returned object is an async iterable, use for-await
      if (Symbol.asyncIterator in formatted) {
        for await (const part of formatted as AsyncIterable<any>) {
          writer.write(part);
        }
      } else if (typeof (formatted as any).getReader === "function") {
        // If it's a ReadableStream (browser), read via getReader()
        const reader = (formatted as ReadableStream<any>).getReader();
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            writer.write(value);
          }
        } finally {
          reader.releaseLock?.();
        }
      }
    },
  });
  return createUIMessageStreamResponse({
    stream: uiMessageStream,
  });
}
