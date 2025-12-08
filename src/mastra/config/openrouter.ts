import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import { logError } from './logger'

const openrouter = createOpenRouter({
    apiKey: process.env.OPENROUTER_API_KEY,
})

// OpenRouter Models organized by provider - all with reasoning settings
export const openRouterModels = {
  // Anthropic via OpenRouter
  anthropicClaudeSonnet45: openrouter('anthropic/claude-sonnet-4.5', {
    includeReasoning: true,
    extraBody: { reasoning: { max_tokens: 20000 }, stream: true },
    usage: { include: true },
  }),
  anthropicClaudeOpus45: openrouter('anthropic/claude-opus-4.5', {
    includeReasoning: true,
    extraBody: { reasoning: { max_tokens: 20000 }, stream: true },
    usage: { include: true },
  }),
  anthropicClaudeHaiku45: openrouter('anthropic/claude-haiku-4.5', {
    includeReasoning: true,
    extraBody: { reasoning: { max_tokens: 20000 }, stream: true },
    usage: { include: true },
  }),
  anthropicClaude37Sonnet: openrouter('anthropic/claude-3.7-sonnet', {
    includeReasoning: true,
    extraBody: { reasoning: { max_tokens: 20000 }, stream: true },
    usage: { include: true },
  }),
  anthropicClaude35Haiku: openrouter('anthropic/claude-3.5-haiku', {
    includeReasoning: true,
    extraBody: { reasoning: { max_tokens: 20000 }, stream: true },
    usage: { include: true },
  }),

  // Google via OpenRouter
  googleGemini25Flash: openrouter('google/gemini-2.5-flash', {
    includeReasoning: true,
    extraBody: { reasoning: { max_tokens: 20000 }, stream: true },
    usage: { include: true },
  }),
  googleGemini25FlashLite: openrouter('google/gemini-2.5-flash-lite', {
    includeReasoning: true,
    extraBody: { reasoning: { max_tokens: 20000 }, stream: true },
    usage: { include: true },
  }),
  googleGemini25Pro: openrouter('google/gemini-2.5-pro', {
    includeReasoning: true,
    extraBody: { reasoning: { max_tokens: 20000 }, stream: true },
    usage: { include: true },
  }),
  googleGemini3ProPreview: openrouter('google/gemini-3-pro-preview', {
    includeReasoning: true,
    extraBody: { reasoning: { max_tokens: 20000 }, stream: true },
    usage: { include: true },
  }),
  googleGemma327bIt: openrouter('google/gemma-3-27b-it', {
    includeReasoning: true,
    extraBody: { reasoning: { max_tokens: 20000 }, stream: true },
    usage: { include: true },
  }),

  // DeepSeek via OpenRouter
  deepseekR1Free: openrouter('deepseek/deepseek-r1:free', {
    includeReasoning: true,
    extraBody: { reasoning: { max_tokens: 20000 }, stream: true },
    usage: { include: true },
  }),
  deepseekR10528Free: openrouter('deepseek/deepseek-r1-0528:free', {
    includeReasoning: true,
    extraBody: { reasoning: { max_tokens: 20000 }, stream: true },
    usage: { include: true },
  }),
  deepseekChatV31: openrouter('deepseek/deepseek-chat-v3.1', {
    includeReasoning: true,
    extraBody: { reasoning: { max_tokens: 20000 }, stream: true },
    usage: { include: true },
  }),
  deepseekV31Terminus: openrouter('deepseek/deepseek-v3.1-terminus', {
    includeReasoning: true,
    extraBody: { reasoning: { max_tokens: 20000 }, stream: true },
    usage: { include: true },
  }),
  deepseekR1DistillLlama70b: openrouter('deepseek/deepseek-r1-distill-llama-70b', {
    includeReasoning: true,
    extraBody: { reasoning: { max_tokens: 20000 }, stream: true },
    usage: { include: true },
  }),

  // Meta Llama via OpenRouter
  metaLlama3370bInstructFree: openrouter('meta-llama/llama-3.3-70b-instruct:free', {
    includeReasoning: true,
    extraBody: { reasoning: { max_tokens: 20000 }, stream: true },
    usage: { include: true },
  }),
  metaLlama3211bVisionInstruct: openrouter('meta-llama/llama-3.2-11b-vision-instruct', {
    includeReasoning: true,
    extraBody: { reasoning: { max_tokens: 20000 }, stream: true },
    usage: { include: true },
  }),
  metaLlama4ScoutFree: openrouter('meta-llama/llama-4-scout:free', {
    includeReasoning: true,
    extraBody: { reasoning: { max_tokens: 20000 }, stream: true },
    usage: { include: true },
  }),

  // Qwen via OpenRouter
  qwenQwen3CoderFree: openrouter('qwen/qwen3-coder:free', {
    includeReasoning: true,
    extraBody: { reasoning: { max_tokens: 20000 }, stream: true },
    usage: { include: true },
  }),
  qwenQwen3Coder: openrouter('qwen/qwen3-coder', {
    includeReasoning: true,
    extraBody: { reasoning: { max_tokens: 20000 }, stream: true },
    usage: { include: true },
  }),
  qwenQwen3CoderFlash: openrouter('qwen/qwen3-coder-flash', {
    includeReasoning: true,
    extraBody: { reasoning: { max_tokens: 20000 }, stream: true },
    usage: { include: true },
  }),
  qwenQwen3Max: openrouter('qwen/qwen3-max', {
    includeReasoning: true,
    extraBody: { reasoning: { max_tokens: 20000 }, stream: true },
    usage: { include: true },
  }),
  qwenQwen3235bA22bFree: openrouter('qwen/qwen3-235b-a22b:free', {
    includeReasoning: true,
    extraBody: { reasoning: { max_tokens: 20000 }, stream: true },
    usage: { include: true },
  }),
  qwenQwQ32bFree: openrouter('qwen/qwq-32b:free', {
    includeReasoning: true,
    extraBody: { reasoning: { max_tokens: 20000 }, stream: true },
    usage: { include: true },
  }),
  qwenQwen25Vl72bInstructFree: openrouter('qwen/qwen2.5-vl-72b-instruct:free', {
    includeReasoning: true,
    extraBody: { reasoning: { max_tokens: 20000 }, stream: true },
    usage: { include: true },
  }),

  // xAI Grok via OpenRouter
  xaiGrok3: openrouter('x-ai/grok-3', {
    includeReasoning: true,
    extraBody: { reasoning: { max_tokens: 20000 }, stream: true },
    usage: { include: true },
  }),
  xaiGrok3Mini: openrouter('x-ai/grok-3-mini', {
    includeReasoning: true,
    extraBody: { reasoning: { max_tokens: 20000 }, stream: true },
    usage: { include: true },
  }),
  xaiGrok4: openrouter('x-ai/grok-4', {
    includeReasoning: true,
    extraBody: { reasoning: { max_tokens: 20000 }, stream: true },
    usage: { include: true },
  }),
  xaiGrok4Fast: openrouter('x-ai/grok-4-fast', {
    includeReasoning: true,
    extraBody: { reasoning: { max_tokens: 20000 }, stream: true },
    usage: { include: true },
  }),

  // Mistral via OpenRouter
  mistralMistralMedium31: openrouter('mistralai/mistral-medium-3.1', {
    includeReasoning: true,
    extraBody: { reasoning: { max_tokens: 20000 }, stream: true },
    usage: { include: true },
  }),
  mistralMistralSmall32Free: openrouter('mistralai/mistral-small-3.2-24b-instruct:free', {
    includeReasoning: true,
    extraBody: { reasoning: { max_tokens: 20000 }, stream: true },
    usage: { include: true },
  }),
  mistralDevstralSmallFree: openrouter('mistralai/devstral-small-2505:free', {
    includeReasoning: true,
    extraBody: { reasoning: { max_tokens: 20000 }, stream: true },
    usage: { include: true },
  }),
  mistralCodestral: openrouter('mistralai/codestral-2508', {
    includeReasoning: true,
    extraBody: { reasoning: { max_tokens: 20000 }, stream: true },
    usage: { include: true },
  }),

  // OpenAI via OpenRouter
  openaiGptOss20bFree: openrouter('openai/gpt-oss-20b:free', {
    includeReasoning: true,
    extraBody: { reasoning: { max_tokens: 20000 }, stream: true },
    usage: { include: true },
  }),
  openaiGpt41: openrouter('openai/gpt-4.1', {
    includeReasoning: true,
    extraBody: { reasoning: { max_tokens: 20000 }, stream: true },
    usage: { include: true },
  }),
  openaiGpt41Mini: openrouter('openai/gpt-4.1-mini', {
    includeReasoning: true,
    extraBody: { reasoning: { max_tokens: 20000 }, stream: true },
    usage: { include: true },
  }),
  openaiGpt5: openrouter('openai/gpt-5', {
    includeReasoning: true,
    extraBody: { reasoning: { max_tokens: 20000 }, stream: true },
    usage: { include: true },
  }),
  openaiGpt5Mini: openrouter('openai/gpt-5-mini', {
    includeReasoning: true,
    extraBody: { reasoning: { max_tokens: 20000 }, stream: true },
    usage: { include: true },
  }),
  openaiO4Mini: openrouter('openai/o4-mini', {
    includeReasoning: true,
    extraBody: { reasoning: { max_tokens: 20000 }, stream: true },
    usage: { include: true },
  }),

  // MoonshotAI Kimi via OpenRouter
  moonshotKimiK2Free: openrouter('moonshotai/kimi-k2:free', {
    includeReasoning: true,
    extraBody: { reasoning: { max_tokens: 20000 }, stream: true },
    usage: { include: true },
  }),
  moonshotKimiK2Thinking: openrouter('moonshotai/kimi-k2-thinking', {
    includeReasoning: true,
    extraBody: { reasoning: { max_tokens: 20000 }, stream: true },
    usage: { include: true },
  }),
  moonshotKimiDev72bFree: openrouter('moonshotai/kimi-dev-72b:free', {
    includeReasoning: true,
    extraBody: { reasoning: { max_tokens: 20000 }, stream: true },
    usage: { include: true },
  }),

  // MiniMax via OpenRouter
  minimaxMinimax01: openrouter('minimax/minimax-01', {
    includeReasoning: true,
    extraBody: { reasoning: { max_tokens: 20000 }, stream: true },
    usage: { include: true },
  }),
  minimaxMinimaxM1: openrouter('minimax/minimax-m1', {
    includeReasoning: true,
    extraBody: { reasoning: { max_tokens: 20000 }, stream: true },
    usage: { include: true },
  }),
  minimaxMinimaxM2: openrouter('minimax/minimax-m2', {
    includeReasoning: true,
    extraBody: { reasoning: { max_tokens: 20000 }, stream: true },
    usage: { include: true },
  }),

  // Nous Research via OpenRouter
  nousHermes4405b: openrouter('nousresearch/hermes-4-405b', {
    includeReasoning: true,
    extraBody: { reasoning: { max_tokens: 20000 }, stream: true },
    usage: { include: true },
  }),
  nousHermes470b: openrouter('nousresearch/hermes-4-70b', {
    includeReasoning: true,
    extraBody: { reasoning: { max_tokens: 20000 }, stream: true },
    usage: { include: true },
  }),

  // Nvidia via OpenRouter
  nvidiaNemotronNano9bV2: openrouter('nvidia/nemotron-nano-9b-v2', {
    includeReasoning: true,
    extraBody: { reasoning: { max_tokens: 20000 }, stream: true },
    usage: { include: true },
  }),

  // GLM via OpenRouter
  zAiGlm45: openrouter('z-ai/glm-4.5', {
    includeReasoning: true,
    extraBody: { reasoning: { max_tokens: 20000 }, stream: true },
    usage: { include: true },
  }),
  zAiGlm45AirFree: openrouter('z-ai/glm-4.5-air:free', {
    includeReasoning: true,
    extraBody: { reasoning: { max_tokens: 20000 }, stream: true },
    usage: { include: true },
  }),
  zAiGlm46: openrouter('z-ai/glm-4.6', {
    includeReasoning: true,
    extraBody: { reasoning: { max_tokens: 20000 }, stream: true },
    usage: { include: true },
  }),

  // Other Free Models
  amazonNova2LiteV1Free: openrouter('amazon/nova-2-lite-v1:free', {
    includeReasoning: true,
    extraBody: { reasoning: { max_tokens: 20000 }, stream: true },
    usage: { include: true },
  }),
  googleGemma29bItFree: openrouter('google/gemma-2-9b-it:free', {
    includeReasoning: true,
    extraBody: { reasoning: { max_tokens: 20000 }, stream: true },
    usage: { include: true },
  }),
  microsoftMaiDsR1Free: openrouter('microsoft/mai-ds-r1:free', {
    includeReasoning: true,
    extraBody: { reasoning: { max_tokens: 20000 }, stream: true },
    usage: { include: true },
  }),
  thudmGlmZ132bFree: openrouter('thudm/glm-z1-32b:free', {
    includeReasoning: true,
    extraBody: { reasoning: { max_tokens: 20000 }, stream: true },
    usage: { include: true },
  }),
};

// Model selector function
export function getOpenRouterModel(modelId: keyof typeof openRouterModels) {
  return openRouterModels[modelId];
}

export const openQwenAI = openrouter('qwen/qwen3-coder:free', {
    includeReasoning: true,
    extraBody: {
        reasoning: { max_tokens: 20000 },
        stream: true,
    },
    usage: { include: true },
})

export const openGLMAI = openrouter('z-ai/glm-4.5-air:free', {
    includeReasoning: true,
    extraBody: {
        reasoning: { max_tokens: 20000 },
        stream: true,
    },
    usage: { include: true },
})

export const openAIFree = openrouter('openai/gpt-oss-20b:free', {
    includeReasoning: true,
    extraBody: {
        reasoning: { max_tokens: 20000 },
        stream: true,
    },
    usage: { include: true },
})

export default openrouter
