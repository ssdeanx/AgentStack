import { mastra } from "../../../src/mastra";
import { RequestContext } from '@mastra/core/request-context';
export async function POST(req: Request) {
  const { prompt } = await req.json();
  const myAgent = mastra.getAgent("weatherAgent");
  const stream = await myAgent.stream([{ role: "user", content: prompt }], {
    format: "aisdk",
  });
const requestContext = new RequestContext();

  return stream.toUIMessageStreamResponse();
}