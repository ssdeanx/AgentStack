//import type { GoogleGenerativeAIProviderOptions } from '@ai-sdk/google'
import { ConvexStore, ConvexVector } from '@mastra/convex'
import { ModelRouterEmbeddingModel } from '@mastra/core/llm'
import { fastembed } from '@mastra/fastembed'
import { Memory } from '@mastra/memory'
import { MastraCompositeStore, FilesystemStore } from '@mastra/core/storage'

import { duckStore } from './duckdb'

export const convexStorage = new ConvexStore({
    id: 'convex-storage',
    deploymentUrl: process.env.CONVEX_URL ?? '',
    adminAuthToken: process.env.CONVEX_ADMIN_KEY ?? '',
})

const storageComposite = new MastraCompositeStore({
  id: 'composite',
    default: convexStorage,
    editor: new FilesystemStore({ dir: '.mastra-storage' }),
        domains: {
          //memory: new MemoryLibSQL({ url: 'file:./local.db' }),
          observability: duckStore.observability,
        }
})



export const convexVector = new ConvexVector({
    id: 'convex-vectors',
    deploymentUrl: process.env.CONVEX_URL ?? '',
    adminAuthToken: process.env.CONVEX_ADMIN_KEY ?? '',
})

export const convexMemory = new Memory({
    storage: storageComposite,
    vector: convexVector, // Using PgVector with flat for 3072 dimension embeddings (gemini-embedding-2-preview)
    embedder: fastembed,
    embedderOptions: {
    telemetry: {
        request: {
            log: true,
            logInputs: true,
            logOutputs: true,
        },
    },
    providerOptions: {
        fastembed: {
            model: "base",
            dimensions: 1024,
            },
        },
    },
    options: {
        // Message management
        readOnly: false,
        observationalMemory: {
            enabled: true,
            scope: 'thread', // 'resource' | 'thread'
            model: 'google/gemma-4-31b-it',
            retrieval: { vector: true, scope: 'thread' },
            shareTokenBudget: false, // Don't share token budget between observation and reflection to preserve context
            observation: {
                instruction: 'You are an assistant that observes and remembers important information from the conversation. Pay attention to details, context, and any information that might be useful for future reference.',
                messageTokens: 50_000,
                bufferTokens: 5_000,
                // Activate to retain 30% of threshold
                bufferActivation: 0.85,
                // Force synchronous observation at 1.5x threshold
                blockAfter: 1.5,
                modelSettings: {
                    temperature: 0.3,
                    maxOutputTokens: 64_000,
                    topK: 40,
                    topP: 0.95,
                },
            },
            reflection: {
                bufferActivation: 0.5,
                // Force synchronous reflection at 1.2x threshold
                blockAfter: 1.2,
                instruction: 'Based on the observations, generate concise and informative reflections that capture important details, context, and insights from the conversation. These reflections should be useful for future reference and help provide context for the assistant.',
                modelSettings: {
                    temperature: 0.3,
                    maxOutputTokens: 64_000,
                    topK: 40,
                    topP: 0.95,
                },
                observationTokens: 40_000,
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
        },
    workingMemory: {
            enabled: true,
            scope: 'resource', // 'resource' | 'thread'
            version: 'vnext',
            template: `# User Context
## Profile
- Name/Role:
- Org/Loc:
- Style/Level:
## Active
- Goals/Projects:
- Recent/Deadlines:
## Insights
- Patterns/Habits:
- Session Focus:
- Action Items:
`,
        },
        // Enhanced working memory with supported template
    },
})
