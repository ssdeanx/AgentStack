import type { GoogleGenerativeAIProviderMetadata, GoogleGenerativeAIProviderOptions } from '@ai-sdk/google';
import { google } from '@ai-sdk/google';
import { Agent } from '@mastra/core/agent';
import type { RequestContext } from '@mastra/core/request-context';
import { googleAI } from '../config/google';
import { log } from '../config/logger';
import { pgMemory } from '../config/pg-storage';

import { TokenLimiterProcessor } from '@mastra/core/processors';

export type UserTier = 'free' | 'pro' | 'enterprise'
export interface EditorRuntimeContext {
  'user-tier': UserTier
  language: 'en' | 'es' | 'ja' | 'fr'
}
log.info('Initializing Editor Agent...')

export const editorAgent = new Agent({
  id: 'editorAgent',
  name: 'Editor',
  description:
    'A versatile content editor that improves clarity, coherence, and quality across various content types including technical writing, documentation, emails, reports, and creative content.',
  instructions: ({ requestContext }: { requestContext: RequestContext<EditorRuntimeContext> }) => {
    // runtimeContext is read at invocation time
    const userTier = requestContext.get('user-tier') ?? 'free'
    const language = requestContext.get('language') ?? 'en'
    return {
      role: 'system',
      content: `
# Content Editor
User: ${userTier} | Lang: ${language}

## Primary Function
Refine clarity, coherence, grammar, and style across Technical, Business, Creative, and Academic content.

## Style Guidelines
- Correct grammar, spelling, and punctuation.
- Improve flow and readability.
- Ensure consistent tone and voice.
- Eliminate jargon or explain it.
- Adapt language level to audience.

## Process
1. **Analyze**: Identify type, purpose, and audience.
2. **Edit**: Apply specific principles while preserving author's voice.
3. **Enhance**: Suggest structural improvements.

## Rules
- **Tool Efficiency**: Do NOT use the same tool repetitively or back-to-back for the same query.
`,
      providerOptions: {
        google: {
          thinkingConfig: {
            includeThoughts: true,
            thinkingBudget: -1,
          },
          responseModalities: ['TEXT'],
        } satisfies GoogleGenerativeAIProviderOptions,
      }
    }
  },
  model: ({ requestContext }: { requestContext: RequestContext<EditorRuntimeContext> }) => {
    const userTier = requestContext.get('user-tier') ?? 'free'
    if (userTier === 'enterprise') {
      // higher quality (chat style) for enterprise
      return google.chat('gemini-3-pro-preview')
    } else if (userTier === 'pro') {
      // Chat bison for pro as well
      return googleAI
    }
    // cheaper/faster model for free tier
    return google.chat('gemini-2.5-flash-preview-09-2025')
  },
  memory: pgMemory,
//  tools: [],
  scorers: {

  },
  workflows: {},
  maxRetries: 5,
  outputProcessors: [new TokenLimiterProcessor(1048576)]
})

// Attempt to resolve provider metadata from available SDK objects
// Some SDKs expose provider metadata on the model instance (googleAI) or on the provider (google)
// Define a lightweight type for provider metadata to avoid using `any`.
export type ProviderMetadataMap = { google?: GoogleGenerativeAIProviderMetadata } & Record<string, unknown>;

export const providerMetadata: ProviderMetadataMap | undefined =
  ((googleAI as unknown) as { providerMetadata?: ProviderMetadataMap })?.providerMetadata ??
  ((google as unknown) as { providerMetadata?: ProviderMetadataMap })?.providerMetadata;

