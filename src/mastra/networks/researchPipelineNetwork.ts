import { Agent } from '@mastra/core/agent'
import { documentProcessingAgent } from '../agents/documentProcessingAgent'
import { knowledgeIndexingAgent } from '../agents/knowledgeIndexingAgent'
import { researchAgent } from '../agents/researchAgent'
import { researchPaperAgent } from '../agents/researchPaperAgent'
import { googleAI3 } from '../config/google'
import { log } from '../config/logger'
import { createSupervisorPatternScorer } from '../scorers/supervisor-scorers'
import { contentReviewWorkflow } from '../workflows/content-review-workflow'
import { documentProcessingWorkflow } from '../workflows/document-processing-workflow'
import { LibsqlMemory } from '../config/libsql'

log.info('Initializing Research Pipeline Network...')

/**
 * Checks that the research pipeline returns a concrete discovery, indexing,
 * retrieval, or synthesis outcome.
 */
const researchPipelineNetworkTaskCompleteScorer =
  createSupervisorPatternScorer({
    id: 'research-pipeline-network-task-complete',
    name: 'Research Pipeline Network Task Completeness',
    description:
      'Checks whether the research pipeline returned a substantive research or indexing result.',
    label: 'Research pipeline response',
    emptyReason: 'No usable research pipeline response was produced.',
    weakReason: 'The response is present but still lacks pipeline detail.',
    strongReasonPrefix: 'This research response is strong because',
    signals: [
      {
        label: 'it includes research or indexing language',
        regex:
          /paper|arxiv|index|chunk|retriev|knowledge|citation|source|synthesis/i,
        weight: 0.4,
      },
    ],
    responseLengthThresholds: [
      { min: 80, weight: 0.2 },
      { min: 160, weight: 0.1 },
    ],
    minParagraphsForStructure: 999,
    structureWeight: 0.15,
    reasoningWeight: 0.05,
    toolWeight: 0.05,
  })

/**
 * Checks that the research-pipeline answer communicates concrete discovery,
 * indexing, or retrieval value plus the next research step.
 */
const researchPipelineNetworkOutcomeScorer =
  createSupervisorPatternScorer({
    id: 'research-pipeline-network-outcome-readiness',
    name: 'Research Pipeline Network Outcome Readiness',
    description:
      'Checks whether the research-pipeline response communicates usable findings, artifacts, or next retrieval actions.',
    label: 'Research pipeline outcome response',
    emptyReason: 'No usable research outcome response was produced.',
    weakReason:
      'The response is present but still needs more actionable research detail.',
    strongReasonPrefix: 'This outcome response is strong because',
    signals: [
      {
        label: 'it references papers, documents, or indexed artifacts',
        regex: /paper|document|chunk|index|knowledge base/i,
        weight: 0.25,
      },
      {
        label: 'it includes retrieval or citation context',
        regex: /retriev|query|search|result|citation/i,
        weight: 0.2,
      },
      {
        label: 'it gives a next retrieval or review step',
        regex: /next step|index next|query next|review|refine/i,
        weight: 0.15,
      },
    ],
    responseLengthThresholds: [
      { min: 150, weight: 0.2 },
      { min: 260, weight: 0.1 },
    ],
    minParagraphsForStructure: 999,
    structureWeight: 0.05,
    reasoningWeight: 0.03,
    toolWeight: 0.02,
  })

/**
 * Research Pipeline Network
 *
 * Coordinates the full research paper lifecycle:
 * 1. ResearchPaperAgent: Search and download papers from arXiv
 * 2. DocumentProcessingAgent: Convert PDFs to markdown, chunk for RAG
 * 3. KnowledgeIndexingAgent: Index chunks into PgVector for retrieval
 * 4. ResearchAgent: Answer questions using indexed knowledge
 *
 * Use this network for:
 * - Building research knowledge bases from academic papers
 * - Literature reviews with automated paper retrieval
 * - Question answering over indexed research content
 * - Research synthesis across multiple papers
 */
export const researchPipelineNetwork = new Agent({
  id: 'research-pipeline-network',
  name: 'Research Pipeline Network',
  description: `Coordinates research paper discovery, PDF parsing, document chunking, and knowledge indexing. Routes requests to:
- ResearchPaperAgent: Search arXiv, download papers, parse PDFs to markdown
- DocumentProcessingAgent: Convert PDFs, chunk documents for RAG
- KnowledgeIndexingAgent: Index content into PgVector, semantic search with reranking
- ResearchAgent: General research and information synthesis

Use for: building research knowledge bases, literature reviews, indexing academic papers, semantic search over research content.`,
  instructions: () => {
    return `You are the Research Pipeline Network Coordinator. Your role is to orchestrate complex research workflows by delegating to specialist agents.

## Network Agents

### 1. ResearchPaperAgent (research-paper-agent)
**Capabilities:**
- Search arXiv by keywords, authors, categories
- Download and parse PDFs to markdown
- Extract paper metadata and abstracts
- Handle academic literature retrieval

**Route to this agent when:**
- User wants to search for papers
- User needs to download arXiv papers
- User wants paper content as markdown
- User asks about specific arXiv IDs

### 2. DocumentProcessingAgent (document-processing-agent)
**Capabilities:**
- Convert local PDFs to markdown
- Chunk documents with various strategies
- Extract metadata (titles, summaries, keywords)
- Prepare content for RAG indexing

**Route to this agent when:**
- User has local PDF files to process
- User needs documents chunked
- User wants markdown conversion
- User needs content prepared for indexing

### 3. KnowledgeIndexingAgent (knowledge-indexing-agent)
**Capabilities:**
- Index documents into PgVector
- Generate embeddings for chunks
- Semantic search with reranking
- Build and query knowledge bases

**Route to this agent when:**
- User wants to index content
- User needs semantic search
- User wants to build a knowledge base
- User queries for information in indexed content

### 4. ResearchAgent (research-agent)
**Capabilities:**
- General research synthesis
- Information analysis
- Answer complex questions
- Combine information from multiple sources

**Route to this agent when:**
- User needs research synthesis
- User has general questions
- User wants analysis of findings
- Complex multi-source queries

## Workflow Patterns

### Full Research Pipeline
1. ResearchPaperAgent: Search and download papers
2. DocumentProcessingAgent: Convert and chunk content
3. KnowledgeIndexingAgent: Index into vector store
4. KnowledgeIndexingAgent: Query indexed knowledge

### Literature Review
1. ResearchPaperAgent: Multi-query search across topics
2. ResearchPaperAgent: Download top papers
3. ResearchAgent: Synthesize findings

### Knowledge Base Query
1. KnowledgeIndexingAgent: Semantic search
2. ResearchAgent: Analyze and synthesize results

## Routing Decision Process

1. Analyze the user's request
2. Identify the primary task type:
   - Paper search/download → ResearchPaperAgent
   - PDF conversion/chunking → DocumentProcessingAgent
   - Indexing/search → KnowledgeIndexingAgent
   - Synthesis/analysis → ResearchAgent
3. For multi-step workflows, coordinate sequential delegation
4. Return combined results with clear attribution

## Response Guidelines

- Explain which agent handled each part
- Provide clear progress updates for long workflows
- Include relevant statistics (papers found, chunks indexed, etc.)
- Suggest next steps when appropriate

## Final Answer Contract

- State what was found, processed, indexed, or answered.
- Include the most important research artifact counts or caveats when available.
- End with the best next retrieval, indexing, or synthesis step.
`
  },
  model: googleAI3,
  memory: LibsqlMemory,
  agents: {
    researchPaperAgent,
    documentProcessingAgent,
    knowledgeIndexingAgent,
    researchAgent,
  },
  workflows: {
    documentProcessingWorkflow,
    contentReviewWorkflow,
  },
  // tools: { confirmationTool },
  options: {},
  defaultOptions: {
    maxSteps: 22,
    delegation: {
      onDelegationStart: async context => {
        log.info('Research pipeline network delegating', {
          primitiveId: context.primitiveId,
          iteration: context.iteration,
        })

        await Promise.resolve()

        if (context.primitiveId === 'researchPaperAgent') {
          return {
            proceed: true,
            modifiedPrompt: `${context.prompt}\n\nPrioritize the most relevant papers, include identifiers and publication metadata, and note download or parsing limitations explicitly.`,
          }
        }

        if (context.primitiveId === 'documentProcessingAgent') {
          return {
            proceed: true,
            modifiedPrompt: `${context.prompt}\n\nPreserve document structure, highlight extraction errors, and surface chunking choices that affect downstream retrieval quality.`,
          }
        }

        if (context.primitiveId === 'knowledgeIndexingAgent') {
          return {
            proceed: true,
            modifiedPrompt: `${context.prompt}\n\nFocus on index readiness, retrieval quality, metadata integrity, and any assumptions about embeddings or chunk boundaries.`,
          }
        }

        if (context.primitiveId === 'researchAgent') {
          return {
            proceed: true,
            modifiedPrompt: `${context.prompt}\n\nSynthesize only the evidence that materially answers the research question, and separate verified findings from open questions.`,
          }
        }

        return { proceed: true }
      },
      onDelegationComplete: async context => {
        log.info('Research pipeline delegation complete', {
          primitiveId: context.primitiveId,
          success: context.success,
          duration: context.duration,
        })

        if (context.error) {
          context.bail()
          await Promise.resolve()
          return {
            feedback: `Delegation to ${context.primitiveId} failed: ${String(context.error)}. Recover by reducing the pipeline scope or retrying the failing stage only.`,
          }
        }

        await Promise.resolve()
      },
      messageFilter: ({ messages }) => {
        return messages
          .filter(
            message =>
              !message.content.parts.some(part => part.type === 'tool-invocation')
          )
          .slice(-6)
      },
    },
    isTaskComplete: {
      scorers: [researchPipelineNetworkTaskCompleteScorer, researchPipelineNetworkOutcomeScorer],
      strategy: 'any',
      parallel: true,
      onComplete: async result => {
        log.info('Research pipeline completion check', {
          complete: result.complete,
          score: result.scorers[0]?.score,
        })
        await Promise.resolve()
      },
      suppressFeedback: false,
    },
  },
})

log.info('Research Pipeline Network initialized')
