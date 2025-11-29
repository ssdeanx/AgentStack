import { mastra } from "../../../src/mastra";
import { RuntimeContext } from "@mastra/core/runtime-context";

export async function POST(req: Request) {
  const { messages, data } = await req.json();
  const myAgent = mastra.getAgent("weatherAgent");

  const runtimeContext = new RuntimeContext();

  if (data) {
    for (const [key, value] of Object.entries(data)) {
      runtimeContext.set(key, value);
    }
  }

  const stream = await myAgent.stream(messages, {
    runtimeContext,
    format: "aisdk",
  });
  return stream.toUIMessageStreamResponse();
}