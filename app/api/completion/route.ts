import { mastra } from "../../../src/mastra";

export async function POST(req: Request) {
  const { prompt } = await req.json();
  const myAgent = mastra.getAgent("weatherAgent");
  const stream = await myAgent.stream([{ role: "user", content: prompt }], {
    format: "aisdk",
  });

  return stream.toUIMessageStreamResponse();
}