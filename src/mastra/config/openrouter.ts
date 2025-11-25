import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import { logError } from './logger'

const openrouter = createOpenRouter({
    apiKey: process.env.OPENROUTER_API_KEY,
})

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
