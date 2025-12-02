import { toAISdkFormat } from "@mastra/ai-sdk";
import type { ChunkType, MastraModelOutput } from "@mastra/core/stream";
import { createUIMessageStream } from "ai";
import { mastra } from "./mastra";

// Client SDK agent stream
const response = await mastra.stream({
  messages: "What is the weather in Tokyo",
});

const chunkStream: ReadableStream<ChunkType> = new ReadableStream<ChunkType>({
  start(controller) {
    response
      .processDataStream({
        onChunk: async (chunk: ChunkType) => {
          controller.enqueue(chunk as ChunkType);
        },
      })
      .finally(() => controller.close());
  },
});

const uiMessageStream = createUIMessageStream({
  execute: async ({ writer }) => {
    for await (const part of toAISdkFormat(
      chunkStream as unknown as MastraModelOutput,
      { from: "agent" },
    )) {
      writer.write(part);
    }
  },
});

for await (const part of uiMessageStream) {
  console.log(part);
}
