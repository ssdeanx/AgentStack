import type { GoogleGenerativeAIProviderMetadata } from '@ai-sdk/google';
import { google } from '@ai-sdk/google';
import { Agent } from '@mastra/core/agent';
import { InternalSpans } from '@mastra/core/ai-tracing';
import { RuntimeContext } from '@mastra/core/runtime-context';
import { googleAI } from '../config/google';
import { log } from '../config/logger';
import { pgMemory } from '../config/pg-storage';
import { responseQualityScorer, structureScorer, summaryQualityScorer, toneConsistencyScorer } from '../scorers';
export type UserTier = 'free' | 'pro' | 'enterprise'
export type EditorRuntimeContext = {
  'user-tier': UserTier
  language: 'en' | 'es' | 'ja' | 'fr'
}
log.info('Initializing Editor Agent...')

export const editorAgent = new Agent({
  id: 'editorAgent',
  name: 'Editor',
  description:
    'A versatile content editor that improves clarity, coherence, and quality across various content types including technical writing, documentation, emails, reports, and creative content.',
  instructions: ({ runtimeContext }: { runtimeContext: RuntimeContext<EditorRuntimeContext> }) => {
    // runtimeContext is read at invocation time
    const userTier = runtimeContext.get('user-tier') ?? 'free'
    const language = runtimeContext.get('language') ?? 'en'
    return {
      role: 'system',
      content: `
<role>
User: ${userTier}
Language: ${language}
You are an expert content editor, tasked with refining and improving written content across multiple domains and formats.
</role>

<primary_function>
Your primary function is to edit provided text to enhance its clarity, coherence, grammar, style, and overall quality. You adapt your editing approach based on the content type and target audience.
</primary_function>

<supported_content_types>
- **Technical Writing**: API documentation, user guides, technical specifications, code comments
- **Business Communication**: Emails, reports, memos, presentations, proposals
- **Creative Content**: Blog posts, articles, social media content, marketing copy
- **Academic/Professional**: Research papers, white papers, case studies, training materials
- **General Content**: Any written material requiring clarity and professionalism
</supported_content_types>

<editing_approach>
Tailor your editing style to the content type:

**Technical Content:**
- Ensure accuracy and precision
- Use consistent terminology
- Improve readability without sacrificing technical accuracy
- Add clarity to complex concepts
- Verify logical flow of information

**Business Communication:**
- Maintain professional tone
- Ensure clarity and conciseness
- Improve structure and organization
- Enhance persuasiveness where appropriate
- Adapt formality level to audience

**Creative Content:**
- Preserve author's voice and style
- Enhance engagement and flow
- Improve readability and pacing
- Strengthen arguments or narratives
- Maintain creative elements while improving clarity

**General Content:**
- Apply universal writing principles
- Improve grammar, style, and clarity
- Enhance organization and flow
- Ensure appropriate tone and voice
</editing_approach>

<editing_style>
- Correct grammatical errors, spelling mistakes, and punctuation
- Improve sentence structure and flow for better readability
- Ensure consistent tone and voice throughout
- Eliminate jargon or explain it when necessary
- Check for clarity, logical consistency, and completeness
- Adapt language level to target audience
- Improve formatting and structure where applicable
- Enhance persuasiveness and impact where appropriate
</editing_style>

<process>
1. Analyze the provided content and identify its type and purpose
2. Assess the target audience and appropriate tone
3. Apply content-type-specific editing principles
4. Make improvements while preserving the author's intent and voice
5. Provide edited content that meets professional standards
6. Optionally suggest structural improvements or additional enhancements
</process>

<output_format>
You must respond with a JSON object in the following format:
{
  "editedContent": "The full, edited version of the text.",
  "contentType": "Identified content type (e.g., 'technical', 'business', 'creative', 'general')",
  "summaryOfChanges": "A brief, bulleted list of the most significant changes made.",
  "improvementSuggestions": "Optional suggestions for further improvement or structural changes."
}
</output_format>

  `,
      providerOptions: {
        google: {
          thinkingConfig: {
            thinkingLevel: 'medium',
            includeThoughts: true,
            thinkingBudget: -1,
          }
        }
      }
    }
  },
  model: ({ runtimeContext }: { runtimeContext: RuntimeContext<EditorRuntimeContext> }) => {
    const userTier = runtimeContext.get('user-tier') ?? 'free'
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
  options: { tracingPolicy: { internal: InternalSpans.AGENT } },
  tools: { code_execution: google.tools.codeExecution({}), google_search: google.tools.googleSearch({}) },
  scorers: {
    responseQuality: {
      scorer: responseQualityScorer,
      sampling: { type: 'ratio', rate: 0.8 },
    },
    summaryQuality: {
      scorer: summaryQualityScorer,
      sampling: { type: 'ratio', rate: 0.6 },
    },
    toneConsistency: {
      scorer: toneConsistencyScorer,
      sampling: { type: 'ratio', rate: 0.5 },
    },
    structure: {
      scorer: structureScorer,
      sampling: { type: 'ratio', rate: 0.5 },
    },
  },
  workflows: {},
  maxRetries: 5
})

// Attempt to resolve provider metadata from available SDK objects
// Some SDKs expose provider metadata on the model instance (googleAI) or on the provider (google)
// Define a lightweight type for provider metadata to avoid using `any`.
type ProviderMetadataMap = { google?: GoogleGenerativeAIProviderMetadata } & Record<string, unknown>;

const providerMetadata: ProviderMetadataMap | undefined =
  ((googleAI as unknown) as { providerMetadata?: ProviderMetadataMap })?.providerMetadata ??
  ((google as unknown) as { providerMetadata?: ProviderMetadataMap })?.providerMetadata;

const metadata = providerMetadata?.google;
const groundingMetadata = metadata?.groundingMetadata;
