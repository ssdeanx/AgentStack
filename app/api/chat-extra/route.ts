import { mastra } from "../../../src/mastra";
import { RequestContext } from '@mastra/core/request-context';

export async function POST(req: Request) {
  const { messages, data } = await req.json();
  const myAgent = mastra.getAgent("weatherAgent");

  const requestContext = new RequestContext();

  if (data) {
    for (const [key, value] of Object.entries(data)) {
      requestContext.set(key, value);
    }
  }

  const stream = await myAgent.stream(messages, {
    requestContext,
    format: "aisdk",
  });
  return stream.toUIMessageStreamResponse();
}