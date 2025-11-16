import { describe, it, expect, beforeEach } from 'vitest'
import { modelRegistry, ModelProvider, ModelCapability } from '../model-registry'

// Ensure deterministic tests
beforeEach(() => {
    modelRegistry.clearForTests()
})

describe('ModelRegistry', () => {
    it('registers providers and models, respects api key env', () => {
        // ensure env var is not set initially
        delete process.env.TEST_API

        modelRegistry.registerProvider({ provider: ModelProvider.OPENROUTER, apiKeyEnvVar: 'TEST_API' })

        modelRegistry.registerModel(
            {
                id: 'test-openrouter-model',
                name: 'Test OpenRouter',
                provider: ModelProvider.OPENROUTER,
                capabilities: [ModelCapability.TEXT],
                contextWindow: 1024,
                costTier: 'low',
                maxTokens: 4096,
            }
        )

        // API key missing; model should be marked unavailable
        const models = modelRegistry.getAvailableModels({ provider: ModelProvider.OPENROUTER })
        expect(models.length).toBe(0)

        // Set env and register model again
        process.env.TEST_API = 'ok'
        modelRegistry.registerModel(
            {
                id: 'test-openrouter-model-2',
                name: 'Test OpenRouter 2',
                provider: ModelProvider.OPENROUTER,
                capabilities: [ModelCapability.TEXT],
                contextWindow: 1024,
                costTier: 'low',
                maxTokens: 4096,
            }
        )

        const available = modelRegistry.getAvailableModels({ provider: ModelProvider.OPENROUTER })
        expect(available.some((m) => m.id === 'test-openrouter-model-2')).toBe(true)
    })

    it('marks models as unavailable when provider is not registered', () => {
        // Register a model for a provider that is not yet registered
        modelRegistry.registerModel({
            id: 'unregistered-model',
            name: 'Unregistered',
            provider: ModelProvider.GOOGLE,
            capabilities: [ModelCapability.TEXT],
            contextWindow: 1024,
            costTier: 'free',
            maxTokens: 2048,
        })

        const all = modelRegistry.getAllModels()
        const m = all.find((x) => x.id === 'unregistered-model')
        expect(m).toBeDefined()
        expect(m?.isAvailable).toBe(false)
    })
})
