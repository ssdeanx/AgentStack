import { Agent } from "@mastra/core/agent";
import { GoogleVoice } from "@mastra/voice-google";
import { pgMemory } from '../config';
import { InternalSpans } from '@mastra/core/observability';

const instructions1 = `
You are an AI note assistant tasked with providing concise, structured summaries of their content... // omitted for brevity
`;

export const noteTakerAgent = new Agent({
  id: "noteTakerAgent",
  name: "Note Taker Agent",
  instructions: instructions1,
  memory: pgMemory,
//  tools: [],
  model: "google/gemini-3-flash-preview",
  options: {
    tracingPolicy: {
      internal: InternalSpans.ALL
    }
  },
  voice: new GoogleVoice(), // Add OpenAI voice provider with default configuration
});
