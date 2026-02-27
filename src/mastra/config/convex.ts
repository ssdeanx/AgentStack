import type { GoogleGenerativeAIProviderOptions } from '@ai-sdk/google'
import { ConvexStore, ConvexVector } from '@mastra/convex'
import { ModelRouterEmbeddingModel } from '@mastra/core/llm'
import { Memory } from '@mastra/memory'

const storageCon = new ConvexStore({
    id: 'convex-storage',
    deploymentUrl: process.env.CONVEX_URL!,
    adminAuthToken: process.env.CONVEX_ADMIN_KEY!,
})

const vectorCon = new ConvexVector({
    id: 'convex-vectors',
    deploymentUrl: process.env.CONVEX_URL!,
    adminAuthToken: process.env.CONVEX_ADMIN_KEY!,
})

export const convexMemory = new Memory({
    storage: storageCon,
    vector: vectorCon, // Using PgVector with flat for 3072 dimension embeddings (gemini-embedding-001)
    embedder: new ModelRouterEmbeddingModel('google/gemini-embedding-001'),
    embedderOptions: {
        providerOptions: {
             google: {
                outputDimensions: 3072,
                taskType: 'RETRIEVAL_DOCUMENT',
            }
        },
    },
    options: {
        // Message management
        readOnly: false,
        observationalMemory: {
            enabled: true,
            scope: 'resource', // 'resource' | 'thread'
            model: 'google/gemini-2.5-flash',
            shareTokenBudget: true,
            observation: {
                instruction: 'You are an assistant that observes and remembers important information from the conversation. Pay attention to details, context, and any information that might be useful for future reference.',
                messageTokens: 40_000,
                modelSettings: {
                    temperature: 0.3,
                    maxOutputTokens: 100_000,
                    topK: 40,
                    topP: 0.95,
                },
                providerOptions: {
                    google: {
                        responseModalities: ['TEXT'],
                        thinkingConfig: {
                            includeThoughts: true,
                            thinkingBudget: 364,
                       //     thinkingLevel: 'medium',
                        },
                    } satisfies GoogleGenerativeAIProviderOptions,
                },
            },
            reflection: {
                observationTokens: 90_000,
             },
        },

        lastMessages: parseInt(process.env.MEMORY_LAST_MESSAGES ?? '500'),
        generateTitle: true,
        // Advanced semantic recall with HNSW index configuration
        semanticRecall: {
            topK: parseInt(process.env.SEMANTIC_TOP_K ?? '5'),
            messageRange: {
                before: parseInt(process.env.SEMANTIC_RANGE_BEFORE ?? '3'),
                after: parseInt(process.env.SEMANTIC_RANGE_AFTER ?? '2'),
            },
            scope: 'resource', // 'resource' | 'thread'
            // HNSW index configuration to support high-dimensional embeddings (>2000 dimensions)
            indexConfig: {
          //     type: 'ivfflat', // flat index type (supports dimensions > 4000, unlike HNSW limit of 2000)
          //      metric: 'cosine', // Distance metric for normalized embeddings
          //      ivf: { lists: 3200 }, // IVFFlat configuration
            },
            threshold: 0.75, // Similarity threshold for semantic recall
       //     indexName: 'memory_messages_3072', // Index name for semantic recall
        }
    },
        // Enhanced working memory with supported template
})
