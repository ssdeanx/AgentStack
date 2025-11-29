import { mastra } from "../../../src/mastra";
import { RuntimeContext } from "@mastra/core/runtime-context";
export async function POST(req: Request) {
  const { prompt } = await req.json();
  const myAgent = mastra.getAgent("weatherAgent");
  const stream = await myAgent.stream([{ role: "user", content: prompt }], {
    format: "aisdk",
  });
const runtimeContext = new RuntimeContext();

  return stream.toUIMessageStreamResponse();
}