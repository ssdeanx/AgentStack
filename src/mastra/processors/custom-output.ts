import type {
  Processor,
  MastraDBMessage,
  RequestContext,
} from "@mastra/core";

export class CustomOutputProcessor implements Processor {
  id = "custom-output";

  async processOutputResult({
    messages,
    context,
  }: {
    messages: MastraDBMessage[];
    context: RequestContext;
  }): Promise<MastraDBMessage[]> {
    // Transform messages after the LLM generates them
    return messages.filter((msg) => msg.role !== "system");
  }

  async processOutputStream({
    stream,
    context,
  }: {
    stream: ReadableStream;
    context: RequestContext;
  }): Promise<ReadableStream> {
    // Transform streaming responses
    return stream;
  }
}