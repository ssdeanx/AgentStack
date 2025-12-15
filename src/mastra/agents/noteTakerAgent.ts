import { Agent } from "@mastra/core/agent";
import { GoogleVoice } from "@mastra/voice-google";
import { pgMemory, pgQueryTool } from '../config';

const instructions = `
You are an AI note assistant tasked with providing concise, structured summaries of their content... // omitted for brevity
`;

export const noteTakerAgent = new Agent({
  id: "noteTakerAgent",
  name: "Note Taker Agent",
  instructions: instructions,
  memory: pgMemory,
  tools: [pgQueryTool],
  model: "google/gemini-2.5-flash-lite-preview-09-2025",
  voice: new GoogleVoice(), // Add OpenAI voice provider with default configuration
});
