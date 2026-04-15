import { libsqlQueryTool, libsqlgraphQueryTool } from './../config/libsql';
import { libsqlChunker, mdocumentChunker } from './../tools/document-chunking.tool';
import type { GoogleGenerativeAIProviderOptions } from '@ai-sdk/google'
import type { Message, Thread } from 'chat'
import { Agent } from '@mastra/core/agent'
import { log } from '../config/logger'
import { evaluateResultTool } from '../tools/evaluateResultTool'
import { extractLearningsTool } from '../tools/extractLearningsTool'
import { fetchTool } from '../tools/fetch.tool'
import { binanceSpotMarketDataTool } from '../tools/binance-crypto-market.tool'
import { coinbaseExchangeMarketDataTool } from '../tools/coinbase-exchange-crypto.tool'
import { discordWebhookTool } from '../tools/discord-webhook.tool'
import { finnhubQuotesTool } from '../tools/finnhub-tools'
import { polygonStockQuotesTool } from '../tools/polygon-tools'
import {
  googleFinanceTool,
  googleScholarTool,
} from '../tools/serpapi-academic-local.tool'
import {
  googleNewsLiteTool,
  googleTrendsTool,
} from '../tools/serpapi-news-trends.tool'
import { stooqStockQuotesTool } from '../tools/stooq-stock-market-data.tool'
import { yahooFinanceStockQuotesTool } from '../tools/yahoo-finance-stock.tool'

// Scorers
import { InternalSpans } from '@mastra/core/observability'
import type { ChannelHandlers } from '@mastra/core/channels'
import * as workspaces from '../workspaces'
import {
  getLanguageFromContext,
  getRoleFromContext,
  type AgentRequestContext,
} from './request-context'
import { researchArxivDownloadWorkflow } from '../workflows/research/research-arxiv-download.workflow'
import { researchArxivSearchWorkflow } from '../workflows/research/research-arxiv-search.workflow'
import { LibsqlMemory } from '../config/libsql'
import { listRepositories } from '../tools/github';
import * as browsers from '../browsers';
import { createGitHubAdapter } from '@chat-adapter/github'
import { createDiscordAdapter } from '@chat-adapter/discord'
import { google } from '../config/google'
import {
  ToolSearchProcessor,
  //TokenLimiter
} from '@mastra/core/processors'
//const github = createGitHubAdapter({
//  //appId: process.env.GITHUB_APP_ID!,
//  //privateKey: process.env.GITHUB_PRIVATE_KEY!,
// // webhookSecret: process.env.GITHUB_WEBHOOK_SECRET!,
//});

/**
 * Enables the GitHub channel only when the webhook secret and at least one
 * supported authentication path are configured in the environment.
 */
function isGitHubChannelConfigured(): boolean {
  const hasWebhookSecret = Boolean(process.env.GITHUB_WEBHOOK_SECRET?.trim())
  const hasToken = Boolean(process.env.GITHUB_TOKEN?.trim())
  const hasAppAuth = Boolean(
    process.env.GITHUB_APP_ID?.trim() &&
      process.env.GITHUB_PRIVATE_KEY?.trim()
  )

  return hasWebhookSecret && (hasToken || hasAppAuth)
}

const researchAgentChannelAdapters = {
  discord: {
    adapter: createDiscordAdapter(),
    gateway: false,
  },
  ...(isGitHubChannelConfigured()
    ? {
        github: {
          adapter: createGitHubAdapter({
            userName:
              process.env.GITHUB_BOT_USERNAME?.trim() ?? 'research-agent',
          }),
          gateway: false,
          cards: false,
        },
      }
    : {}),
}

/**
 * Normalizes the message text available from channel adapters so handler logic
 * can make lightweight decisions without depending on one platform shape.
 */
function getChannelMessageText(message: {
  text?: string
  content?: unknown
}): string {
  if (typeof message.text === 'string' && message.text.trim().length > 0) {
    return message.text.trim()
  }

  if (typeof message.content === 'string' && message.content.trim().length > 0) {
    return message.content.trim()
  }

  return ''
}

/**
 * Detects low-signal follow-up messages that do not warrant another full
 * research pass when the agent is already subscribed to the thread.
 */
function isAcknowledgementOnlyMessage(messageText: string): boolean {
  return /^(thanks|thank you|resolved|done|fixed|closed|lgtm|sgtm|looks good)[.!]?$/i.test(
    messageText.trim()
  )
}

/**
 * Detects GitHub-backed channel threads from the Chat SDK thread ID format.
 */
function isGitHubThread(thread: Thread): boolean {
  return thread.id.startsWith('github:')
}

type ResearchChannelEvent =
  | 'direct-message'
  | 'mention'
  | 'subscribed-message'

/**
 * Centralizes research-channel hook behavior so every handler logs the same
 * metadata and applies the same low-signal suppression rules.
 */
async function handleResearchChannelEvent(
  event: ResearchChannelEvent,
  thread: Thread,
  message: Message,
  defaultHandler: (thread: Thread, message: Message) => Promise<void>,
  options?: {
    skipAcknowledgements?: boolean
  }
): Promise<void> {
  const messageText = getChannelMessageText(message)
  const acknowledgementOnly = isAcknowledgementOnlyMessage(messageText)
  const githubThread = isGitHubThread(thread)

  log.info('Research channel event', {
    event,
    threadId: thread.id,
    platform: githubThread ? 'github' : 'chat',
    textLength: messageText.length,
    acknowledgementOnly,
  })

  if (options?.skipAcknowledgements && acknowledgementOnly) {
    log.info('Research channel event skipped', {
      event,
      threadId: thread.id,
      reason: 'acknowledgement-only',
      platform: githubThread ? 'github' : 'chat',
    })
    return
  }

  await defaultHandler(thread, message)
}

const researchChannelHandlers: ChannelHandlers = {
  onDirectMessage: async (thread, message, defaultHandler) => {
    await handleResearchChannelEvent(
      'direct-message',
      thread,
      message,
      defaultHandler
    )
  },
  onMention: async (thread, message, defaultHandler) => {
    await handleResearchChannelEvent(
      'mention',
      thread,
      message,
      defaultHandler,
      {
        skipAcknowledgements: true,
      }
    )
  },
  onSubscribedMessage: async (thread, message, defaultHandler) => {
    await handleResearchChannelEvent(
      'subscribed-message',
      thread,
      message,
      defaultHandler,
      {
        skipAcknowledgements: true,
      }
    )
  },
}

/**
 * Returns the shared workspace used by the research agent.
 */
function getResearchAgentWorkspace() {
  return workspaces.mainWorkspace
}

/**
 * Returns the deterministic browser configured for research verification.
 */
function getResearchAgentBrowser() {
  return browsers.agentBrowser
}

type ResearchPhase = 'initial' | 'followup' | 'validation'
const RESEARCH_PHASE_CONTEXT_KEY = 'researchPhase' as const

export type ResearchRuntimeContext = AgentRequestContext<{
  [RESEARCH_PHASE_CONTEXT_KEY]?: ResearchPhase
}>

function getResearchPhaseFromContext(requestContext: {
  get: (key: string) => unknown
}): ResearchPhase {
  const researchPhase = requestContext.get(RESEARCH_PHASE_CONTEXT_KEY)

  return researchPhase === 'followup' || researchPhase === 'validation'
    ? researchPhase
    : 'initial'
}

log.info('Initializing Research Agent...')

const researchAgentTools = {
  fetchTool,
  googleScholarTool,
  googleNewsLiteTool,
  googleTrendsTool,
  mdocumentChunker,
  libsqlChunker,
  libsqlQueryTool,
  libsqlgraphQueryTool,
  listRepositories,
  extractLearningsTool,
  evaluateResultTool,
  polygonStockQuotesTool,
  finnhubQuotesTool,
  googleFinanceTool,
  binanceSpotMarketDataTool,
  coinbaseExchangeMarketDataTool,
  discordWebhookTool,
  stooqStockQuotesTool,
  yahooFinanceStockQuotesTool,
}

/**
 * Research Agent.
 *
 * Conducts multi-step web research, synthesis, and citation-backed analysis.
 */
export const researchAgent = new Agent({
  id: 'researchAgent',
  name: 'Research Agent',
  description:
    'An expert research agent that conducts thorough research using web search and analysis tools.',
  instructions: ({ requestContext }) => {
    // runtimeContext is read at invocation time
    const role = getRoleFromContext(requestContext)
    const language = getLanguageFromContext(requestContext)
    const researchPhase = getResearchPhaseFromContext(requestContext)

    return {
      role: 'system',
      content: `
# Senior Research Analyst
Role: ${role} | Lang: ${language} | Phase: ${researchPhase}

## Research Protocol
1. **Plan**: Deconstruct topic into 2-3 specific queries.
2. **Search**: Select the best tool from the Guide for each query.
3. **Process**: Use 'extractLearningsTool' on results to get insights and follow-up questions.
4. **Follow-up**: Execute one round of follow-up research based on Phase 1 insights.
5. **Synthesize**: Provide final answer with citations and confidence levels. STOP after Phase 2.

## Tool Selection Guide
- **Web**: Prefer 'fetchTool' for reliable URL fetch/search to markdown.
- **Live browser verification**: Use the attached browser only when page state, interaction results, or live UI evidence materially matters more than static fetch output.
- **News/Trends**: 'googleNewsLiteTool', 'googleTrendsTool', 'googleFinanceTool'.
- **Academic**: 'googleScholarTool'.
- **Financial**: Use 'polygon*' for stocks/crypto.
- **Financial**: Use 'polygon*' for stocks/crypto when you need paid/commercial feeds; use 'binanceSpotMarketDataTool' for free crypto spot data and batch lookups of 1-10 symbols; use 'coinbaseExchangeMarketDataTool', 'stooqStockQuotesTool', and 'yahooFinanceStockQuotesTool' for free public market data.
- **Internal**: 'libsqlChunker' for embedding any information, 'libsqlQueryTool' for querying embedded knowledge. 'libsqlgraphQueryTool' for complex relational queries.
- **Processing**: use workspace document tools for PDFs, Markdown, and any other filetype in the workspace;
- **Discord**: use 'discordWebhookTool' to post short notifications or summaries to the configured Discord webhook URL.

## Rules
- **Efficiency**: No repetitive or back-to-back tool calls for the same query.
- **Specificity**: Use focused queries; cite sources with confidence levels.
- **Fallback**: If tools fail, use internal knowledge and state failure.
- **GitHub channel delivery**: If the request arrives from a GitHub issue or PR comment thread, respond in concise GitHub-flavored Markdown with a direct answer, bullet findings, source links, and the clearest next action or blocker.
`,
      providerOptions: {
        google: {
          responseModalities: ['TEXT'],
          thinkingConfig: {
            includeThoughts: true,
            thinkingLevel: 'medium',
          },
        } satisfies GoogleGenerativeAIProviderOptions,
      },
    }
  },
  model: ({ requestContext }) => {
    const role = getRoleFromContext(requestContext)

    if (role === 'admin') {
      return google.chat('gemini-3.1-pro-preview')
    }

    return google.chat('gemini-3.1-flash-lite-preview')
  },
  tools: researchAgentTools,
  workflows: { researchArxivDownloadWorkflow, researchArxivSearchWorkflow },
  memory: LibsqlMemory,
  scorers: {
    //  toneConsistency: { scorer: createToneScorer() },
    //  textualDifference: { scorer: createTextualDifferenceScorer() },
    //  completeness: { scorer: createCompletenessScorer() },
  },
  maxRetries: 5,
  options: {
    tracingPolicy: {
      internal: InternalSpans.AGENT,
    },
  },
  //voice: gvoice,
  inputProcessors: [
    new ToolSearchProcessor({
      tools: researchAgentTools,
      search: { topK: 5 },
    }),
    //new TokenLimiter(2048),
  ],
  outputProcessors: [
  //  new TokenLimiterProcessor(128000),
    //     new BatchPartsProcessor({
    //         batchSize: 10,
    //        maxWaitTime: 75,
    //        emitOnNonText: true,
    //     }),
  ],
  workspace: getResearchAgentWorkspace(),
  browser: getResearchAgentBrowser(),
  channels: {
    inlineLinks: ['*'],
    inlineMedia: ['image/*', 'video/*', 'audio/*'],
    adapters: researchAgentChannelAdapters,
    threadContext: {
      maxMessages: 15,
    },
    handlers: researchChannelHandlers,
  },
  //  defaultOptions: {
  //      autoResumeSuspendedTools: true,
  //  },
})
