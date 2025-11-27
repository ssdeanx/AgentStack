import { Agent } from '@mastra/core/agent';
import { InternalSpans } from '@mastra/core/ai-tracing';
import { gemini3Pro, pgMemory } from '../config';
import { geminiLM } from '../config/acp-providers';
import { supermemoryTools } from "@supermemory/tools/ai-sdk"

export const acpAgent = new Agent({
  id: 'acp-agent',
  name: 'ACP Agent',
  description: 'A ACP assistant that can help manage ACP-related tasks',
  instructions: ({ runtimeContext }) => {
    const userId = runtimeContext?.get('userId');
    return {
      role: 'system',
      content: `You are a helpful ACP assistant. You help users manage their ACP-related tasks efficiently.

Your capabilities:
-

Current user: ${userId ?? 'anonymous'}`,
      providerOptions: {
        gemini: {
          thinkingConfig: {
            thinkingLevel: 'low',
            includeThoughts: true,
            thinkingBudget: -1,
          },
        },
      },
    };
  },
  model: gemini3Pro,
  memory: pgMemory,
  tools: {
	...supermemoryTools(process.env.SUPERMEMORY_API_KEY ?? '', {
		containerTags: ['acp-agent']
	}),
  },
  options: { tracingPolicy: { internal: InternalSpans.AGENT } },
});
