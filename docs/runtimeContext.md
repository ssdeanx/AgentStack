# Runtime Context

# 1) src/mastra/tools/support-tools.ts

```ts
import type { RuntimeContext } from '@mastra/core/runtime-context'
import type { SupportRuntimeContext } from '../agents/support-agent'

export const knowledgeBase = {
  name: 'knowledge-base',
  description: 'Search internal knowledge base and return compact results',
  run: async (query: string, execCtx: { runtimeContext?: RuntimeContext<SupportRuntimeContext> }) => {
    const lang = execCtx?.runtimeContext?.get('language') ?? 'en'
    // Implement your KB search; here we just return a stub
    return { text: `KB results for "${query}" (language: ${lang})` }
  }
}

export const ticketSystem = {
  name: 'ticket-system',
  description: 'Create and fetch tickets from the internal ticket system',
  run: async (input: any, execCtx: { runtimeContext?: RuntimeContext<SupportRuntimeContext> }) => {
    const tier = execCtx?.runtimeContext?.get('user-tier') ?? 'free'
    // Return a stub ticket
    return { ticketId: `TICKET-${tier.toUpperCase()}-123`, status: 'created' }
  }
}

export const advancedAnalytics = {
  name: 'advanced-analytics',
  description: 'Perform advanced analytics; only available to pro/enterprise',
  run: async (input: any, execCtx: { runtimeContext?: RuntimeContext<SupportRuntimeContext> }) => {
    const tier = execCtx?.runtimeContext?.get('user-tier')
    if (tier !== 'pro' && tier !== 'enterprise') {
      throw new Error('Not allowed: advanced analytics for your tier')
    }
    // return dummy analytics
    return { text: `Advanced analytics result for account tier: ${tier}` }
  }
}

export const customIntegration = {
  name: 'custom-integration',
  description: 'Enterprise-only integration helper (e.g., call webhooks)',
  run: async (payload: any, execCtx: { runtimeContext?: RuntimeContext<SupportRuntimeContext> }) => {
    const tier = execCtx?.runtimeContext?.get('user-tier')
    if (tier !== 'enterprise') throw new Error('Not allowed: custom integration for your tier')
    // call out to webhook or integrate, return stub
    return { status: 'ok', detail: 'Webhook invoked (stub)' }
  }
}
```

# src/mastra/agents/support-agent.ts

```ts
import { Agent } from '@mastra/core/agent'
import { RuntimeContext } from '@mastra/core/runtime-context'
import { Memory } from '@mastra/memory'
import { LibSQLStore } from '@mastra/libsql'
import { TokenLimiterProcessor } from '@mastra/core/processors'
import { CharacterLimiterProcessor } from '../processors/character-limiter'
import { responseQualityScorer } from '../scorers/response-quality'
import { knowledgeBase, ticketSystem, advancedAnalytics, customIntegration } from '../tools/support-tools'

// Runtime context typings
export type UserTier = 'free' | 'pro' | 'enterprise'
export type SupportRuntimeContext = {
  'user-tier': UserTier
  language: 'en' | 'es' | 'ja' | 'fr'
}

// Dynamic Agent definition using runtimeContext
export const supportAgent = new Agent({
  id: 'support',
  name: 'dynamic-support-agent',
  description: 'AI support agent that adapts to user subscription tiers',
  instructions: async ({ runtimeContext }: { runtimeContext: RuntimeContext<SupportRuntimeContext> }) => {
    // runtimeContext is read at invocation time
    const userTier = runtimeContext.get('user-tier') ?? 'free'
    const language = runtimeContext.get('language') ?? 'en'

    return {
      role: 'system',
      content: `You are a customer support agent for our SaaS platform.
      The current user is on the ${userTier} tier and prefers ${language} language.
      ${userTier === 'free' ? '- Provide basic support and documentation links.' : ''}
      ${userTier === 'pro' ? '- Offer detailed technical support and best practices.' : ''}
      ${userTier === 'enterprise' ? '- Provide priority support with custom solutions and dedicated assistance.' : ''}
      Always reply in ${language}.`
    }
  },

  // Model selection based on runtimeContext -> using Google models
  model: ({ runtimeContext }: { runtimeContext: RuntimeContext<SupportRuntimeContext> }) => {
    const userTier = runtimeContext.get('user-tier') ?? 'free'
    if (userTier === 'enterprise') {
      // higher quality (chat style) for enterprise
      return 'google/chat-bison@001'
    } else if (userTier === 'pro') {
      // Chat bison for pro as well
      return 'google/chat-bison@001'
    }
    // cheaper/faster model for free tier
    return 'google/text-bison@001'
  },

  // Tools per tier
  tools: ({ runtimeContext }: { runtimeContext: RuntimeContext<SupportRuntimeContext> }) => {
    const userTier = runtimeContext.get('user-tier') ?? 'free'
    const baseTools = [knowledgeBase, ticketSystem]
    if (userTier === 'pro' || userTier === 'enterprise') baseTools.push(advancedAnalytics)
    if (userTier === 'enterprise') baseTools.push(customIntegration)
    return baseTools
  },

  // Per-tier memory configuration
  memory: ({ runtimeContext }: { runtimeContext: RuntimeContext<SupportRuntimeContext> }) => {
    const userTier = runtimeContext.get('user-tier') ?? 'free'
    if (userTier === 'enterprise') {
      return new Memory({
        storage: new LibSQLStore({ url: 'file:enterprise.db' }),
        options: { semanticRecall: { topK: 15, messageRange: 8 }, workingMemory: { enabled: true } }
      })
    } else if (userTier === 'pro') {
      return new Memory({
        storage: new LibSQLStore({ url: 'file:pro.db' }),
        options: { semanticRecall: { topK: 8, messageRange: 4 }, workingMemory: { enabled: true } }
      })
    }
    return new Memory({
      storage: new LibSQLStore({ url: 'file:free.db' }),
      options: { semanticRecall: { topK: 3, messageRange: 2 }, workingMemory: { enabled: false } }
    })
  },

  // Input processing: tokens/characters per tier
  inputProcessors: ({ runtimeContext }: { runtimeContext: RuntimeContext<SupportRuntimeContext> }) => {
    const userTier = runtimeContext.get('user-tier') ?? 'free'
    if (userTier === 'enterprise') return []
    if (userTier === 'pro') return [new CharacterLimiterProcessor(2000)]
    return [new CharacterLimiterProcessor(500)]
  },

  // Output processors: token limits per tier
  outputProcessors: ({ runtimeContext }: { runtimeContext: RuntimeContext<SupportRuntimeContext> }) => {
    const userTier = runtimeContext.get('user-tier') ?? 'free'
    if (userTier === 'enterprise') return [new TokenLimiterProcessor({ limit: 2000, strategy: 'truncate' })]
    if (userTier === 'pro') return [new TokenLimiterProcessor({ limit: 500, strategy: 'truncate' })]
    return [new TokenLimiterProcessor({ limit: 100, strategy: 'truncate' })]
  },

  // Scorers applied only for enterprise
  scorers: ({ runtimeContext }: { runtimeContext: RuntimeContext<SupportRuntimeContext> }) => {
    const userTier = runtimeContext.get('user-tier') ?? 'free'
    if (userTier === 'enterprise') {
      return [responseQualityScorer]
    }
    return []
  }
})
```
