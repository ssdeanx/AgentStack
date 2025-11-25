import { Agent } from '@mastra/core/agent'
import { InternalSpans } from '@mastra/core/ai-tracing'

import { googleAI3 } from '../config/google'
import { pgMemory } from '../config/pg-storage'
import { log } from '../config/logger'

import { researchPaperAgent } from '../agents/researchPaperAgent'
import { documentProcessingAgent } from '../agents/documentProcessingAgent'
import { knowledgeIndexingAgent } from '../agents/knowledgeIndexingAgent'
import { researchAgent } from '../agents/researchAgent'

log.info('Initializing Research Pipeline Network...')

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
`
    },
    model: googleAI3,
    memory: pgMemory,
    agents: {
        researchPaperAgent,
        documentProcessingAgent,
        knowledgeIndexingAgent,
        researchAgent,
    },
    options: {
        tracingPolicy: { internal: InternalSpans.ALL },
    },
})

log.info('Research Pipeline Network initialized')
