import { mastra } from "../../../src/mastra";
import { RequestContext } from "@mastra/core/request-context";
import { toAISdkStream } from "@mastra/ai-sdk";
import { createUIMessageStream, createUIMessageStreamResponse } from "ai";

export async function POST(req: Request) {
  const { messages, data, id } = await req.json();

  const agentId: string =
    (typeof data?.agentId === "string" && data.agentId.length > 0 ? data.agentId : undefined) ??
    (typeof id === "string" && id.length > 0 ? id : undefined) ??
    "weatherAgent";

  const myAgent = mastra.getAgent(agentId);

  const requestContext = new RequestContext();

  if (data) {
    for (const [key, value] of Object.entries(data)) {
      requestContext.set(key, value);
    }
  }

  const stream = await myAgent.stream(messages, { requestContext });

  const uiStream = createUIMessageStream({
    originalMessages: messages,
    execute: async ({ writer }) => {
      const aiStream = toAISdkStream(stream, { from: "agent" }) as any;

      if (typeof aiStream[Symbol.asyncIterator] === "function") {
        for await (const part of aiStream as AsyncIterable<any>) {
          await writer.write(part);
        }
      } else if (typeof aiStream.getReader === "function") {
        const reader = aiStream.getReader();
        try {
          while (true) {
            const { value, done } = await reader.read();
            if (done) {break;}
            await writer.write(value);
          }
        } finally {
          reader.releaseLock?.();
        }
      }
    },
  });

  return createUIMessageStreamResponse({ stream: uiStream });
}