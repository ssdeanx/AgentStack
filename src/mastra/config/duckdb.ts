import { DuckDBVector, DuckDBStore } from "@mastra/duckdb";
import { fastembed } from "@mastra/fastembed";

import { Memory } from '@mastra/memory'

export const duckStore = new DuckDBStore({
  id: "duckdb-store",
  path: './store.duckdb', // or './store.duckdb' for file persistence
});

export const duckVector = new DuckDBVector({
  id: "duckdb-vector",
  path: './vectors.duckdb', // or './vectors.duckdb' for file persistence
});

export const duckDBMemory = new Memory({
  storage: duckStore,
  vector: duckVector,
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
        model: "text-embedding-3-small",
        dimensions: 1024,
      },
    },
  },
  options: {
    // Message management
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
    readOnly: false,
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
        threshold: 0.75, // Similarity threshold for semantic recall
        indexName: 'memory_messages_1024', // Index name for semantic recall
    },
    workingMemory: {
      enabled: true,
      scope: 'resource', // 'resource' | 'thread'
      version: 'vnext',
      template: `
# User Context
{{#if user.name}}Name: {{user.name}}{{/if}}
{{#if user.role}}Role: {{user.role}}{{/if}}
{{#if user.language}}Language: {{user.language}}{{/if}}
{{#if user.location}}Location: {{user.location}}{{/if}}
{{#if user.email}}Email: {{user.email}}{{/if}}
{{#if user.organization}}Organization: {{user.organization}}{{/if}}
{{#if user.preferences}}Preferences: {{user.preferences}}{{/if}}
{{#if user.history}}History: {{user.history}}{{/if}}
{{#if user.other}}Other: {{user.other}}{{/if}}

# Conversation Context
{{#if conversation.topic}}Topic: {{conversation.topic}}{{/if}}
{{#if conversation.purpose}}Purpose: {{conversation.purpose}}{{/if}}

# Additional Context
{{#each additionalContext}}
- {{this}}
{{/each}}

## Important Information
{{#each importantInfo}}
- {{this}}
{{/each}}
`,
    },
  },
});