import { Agent } from '@mastra/core/agent';
import { InternalSpans } from '@mastra/core/ai-tracing';
import { googleAIFlashLite, pgMemory } from '../config';
import { supermemoryTools } from "@supermemory/tools/ai-sdk"
import { mcpTools } from '../mcp/mcp-client';
import { browserTool, clickAndExtractTool, extractTablesTool, fillFormTool, googleSearch, monitorPageTool, pdfGeneratorTool, screenshotTool } from '../tools/browser-tool';

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
        google: {
          thinkingConfig: {
            thinkingLevel: 'low',
            includeThoughts: true,
            thinkingBudget: -1,
          },
          media_resolution: "MEDIA_RESOLUTION_MEDIUM",
          maxOutputTokens: 64000,
        },
      },
    };
  },
  model: googleAIFlashLite,
  memory: pgMemory,
  tools: {
  browserTool,
  screenshotTool,
  pdfGeneratorTool,
  clickAndExtractTool,
  fillFormTool,
  googleSearch,
  extractTablesTool,
  monitorPageTool,
	...supermemoryTools(process.env.SUPERMEMORY_API_KEY ?? '', {
		containerTags: ['acp-agent']
	}),
  },
  options: { tracingPolicy: { internal: InternalSpans.AGENT } },
});
