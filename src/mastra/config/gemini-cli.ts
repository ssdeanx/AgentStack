import { createGeminiProvider } from 'ai-sdk-provider-gemini-cli'
import { logError } from './logger'
import os from 'os'
import { withSupermemory } from "@supermemory/tools/ai-sdk"

const useApiKey =
    (process.env.GOOGLE_GENERATIVE_AI_API_KEY !== undefined) ||
    process.env.NODE_ENV === 'production'
const gemini = createGeminiProvider({
    authType: useApiKey ? 'api-key' : 'oauth-personal', // Use OAuth in dev, production use API key
    apiKey: useApiKey ? process.env.GOOGLE_GENERATIVE_AI_API_KEY ?? '' : undefined, // Provide API key if using API key auth
    cacheDir: process.env.GEMINI_OAUTH_CACHE ?? os.homedir() + '/.gemini/oauth-cache', // directory to store cached tokens
})

// Gemini CLI Models organized by capabilities
export const geminiCliModels = {
  // Pro models with full features
  gemini25Pro: gemini('gemini-2.5-pro', {
    contextWindow: 1048576, // 1MB
    maxTokens: 65536,
    supportsStreaming: true,
    thinkingBudget: -1,
    showThoughts: true,
    codeexecution: true,
    structuredOutput: true,
    functionCalling: true,
    urlContext: true
  }),
  gemini3Pro: gemini('gemini-3-pro-preview', {
    contextWindow: 1048576, // 1MB
    maxTokens: 65536,
    supportsStreaming: true,
    thinkingBudget: -1,
    showThoughts: true,
    codeexecution: true,
    structuredOutput: true,
    functionCalling: true,
    urlContext: true
  }),

  // Flash models for speed
  gemini25Flash: gemini('gemini-2.5-flash', {
    contextWindow: 1048576, // 1MB
    maxTokens: 65536,
    supportsStreaming: true,
    thinkingBudget: -1,
    codeexecution: true,
    showThoughts: true,
    structuredOutput: true,
    grounding: true,
    functionCalling: true,
    urlContext: true
  }),
  gemini25FlashLite: gemini('gemini-2.5-flash-lite', {
    contextWindow: 1048576, // 1MB
    maxTokens: 64000,
    supportsStreaming: true,
    thinkingBudget: -1,
    showThoughts: true,
    //codeexecution: true,
    structuredOutput: true,
    grounding: true,
    functionCalling: true,
    urlContext: true
  }),

  // Image generation models
  gemini25FlashImage: gemini('gemini-2.5-flash-image-preview', {
    maxTokens: 8192,
    supportsStreaming: true,
  }),

  // Audio/Video models
  gemini25FlashAudioDialog: gemini('gemini-2.5-flash-preview-native-audio-dialog', {
    maxTokens: 8192,
    supportsStreaming: true,
  }),
  gemini25FlashTTS: gemini('gemini-2.5-flash-preview-tts', {
    maxTokens: 8192,
    supportsStreaming: true,
  }),
  gemini25FlashAudioThinking: gemini('gemini-2.5-flash-exp-native-audio-thinking-dialog', {
    maxTokens: 8192,
    supportsStreaming: true,
  }),
};

// Model selector function
export function getGeminiCliModel(modelId: keyof typeof geminiCliModels) {
  return geminiCliModels[modelId];
}

// Enhanced models with memory
export const googleWithMemory = withSupermemory(geminiCliModels.gemini3Pro, "geminiCLI", {
   conversationId: "geminiCLI-conversation",
   verbose: true,
   mode: "full",
   addMemory: "always"
});

// Backward compatibility exports
export const geminiAI = geminiCliModels.gemini25Pro;
export const {gemini3Pro} = geminiCliModels;
export const geminiAIFlash = geminiCliModels.gemini25Flash;
export const geminiAIFlashLite = geminiCliModels.gemini25FlashLite;
export const geminiAIFlashimg = geminiCliModels.gemini25FlashImage;
export const geminiAIv = geminiCliModels.gemini25FlashAudioDialog;
export const geminiAIv2 = geminiCliModels.gemini25FlashTTS;
export const geminiAIv3 = geminiCliModels.gemini25FlashAudioThinking;

