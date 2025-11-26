import { Agent } from '@mastra/core/agent';
import { InternalSpans } from '@mastra/core/ai-tracing';
import { pgMemory } from '../config';
import { geminiLM } from '../config/acp-providers';

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
  model: geminiLM,
  memory: pgMemory,
  tools: {
  },
  options: { tracingPolicy: { internal: InternalSpans.AGENT } },
});
