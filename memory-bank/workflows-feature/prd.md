# PRD: Network-Ready Workflows (Master Level)

## Overview

Create 6 production-ready workflows that showcase ALL Mastra workflow capabilities including streaming, AI tracing, and advanced control flow patterns. Each workflow demonstrates a specific technique for comprehensive reference implementation.

## Problem Statement

The current AgentStack has:

- 23 agents with diverse capabilities
- 30+ tools (financial APIs, research, document processing)
- 4 networks for routing and coordination
- Only 5 workflows, leaving many agents/tools underutilized
- **No workflows demonstrating streaming or AI tracing patterns**
- **No comprehensive reference for all workflow control flow techniques**

**Gap:** Missing production-grade workflows that showcase Mastra's full workflow API capabilities.

## Objectives

1. Create 6 workflows, each demonstrating a unique control flow technique
2. Implement workflow streaming with `writer` events in all workflows
3. Integrate AI tracing with `tracingContext` child spans
4. Design workflows with clear schemas for network routing
5. Enable both standalone execution and network-orchestrated use
6. Create comprehensive reference implementation for Mastra workflows

## Target Workflows

### 1. Stock Analysis Workflow
**Technique:** Sequential enrichment with `.then()` + Step retries
**Purpose:** Automated stock analysis combining multiple data sources
**Utilizes:** polygon-tools, finnhub-tools, stockAnalysisAgent, reportAgent
**Network Integration:** agentNetwork, dataPipelineNetwork
**Key Features:**

- `.then()` chaining for sequential data enrichment
- `retries: 3` on API-calling steps for resilience
- Writer events for progress streaming
- Child spans for external API call tracing

### 2. Document Processing Workflow
**Technique:** Conditional branching with `.branch()` + `.map()`
**Purpose:** Full document ingestion → chunking → indexing pipeline
**Utilizes:** pdfToMarkdownTool, mastraChunker, knowledgeIndexingAgent
**Network Integration:** researchPipelineNetwork, dataPipelineNetwork
**Key Features:**

- `.branch()` for PDF vs text handling
- `.map()` for schema transformation between steps
- Chunking progress via writer events
- Child spans for PDF parsing and indexing

### 3. Content Review Workflow
**Technique:** Quality loop with `.dowhile()` + iteration tracking
**Purpose:** Content creation with iterative quality review loop
**Utilizes:** researchAgent, copywriterAgent, editorAgent, evaluationAgent
**Network Integration:** reportGenerationNetwork
**Key Features:**

- `.dowhile()` loop until quality threshold met
- `stateSchema` for iteration count and score history
- Max iterations safeguard (throw Error)
- Stream each iteration's feedback in real-time
- Tracing metadata: iteration number, score evolution

### 4. Financial Report Workflow
**Technique:** Parallel execution with `.parallel()` + merge
**Purpose:** Comprehensive multi-source financial reports
**Utilizes:** polygon-tools, finnhub-tools, serpapi, stockAnalysisAgent, reportAgent
**Network Integration:** agentNetwork, reportGenerationNetwork
**Key Features:**

- `.parallel()` for concurrent data fetching (3 sources)
- Step IDs for accessing parallel results in merge step
- Parent span for parallel operation, child spans per fetch
- Parallel progress events via writer

### 5. Research Synthesis Workflow (NEW)
**Technique:** Array iteration with `.foreach()` + concurrency control
**Purpose:** Multi-topic research with synthesis across sources
**Utilizes:** researchAgent, researchPaperAgent, reportAgent
**Network Integration:** researchPipelineNetwork, reportGenerationNetwork
**Key Features:**

- `.foreach()` for iterating over topic array
- `concurrency: 2` for rate limiting
- Per-topic progress via writer events
- Child span per topic with semantic search metadata

### 6. Learning Extraction Workflow (NEW)
**Technique:** Human-in-the-loop with `suspend()`/`resume()` + nested workflow
**Purpose:** Extract learnings from content with human approval
**Utilizes:** learningExtractionAgent, evaluationAgent, documentProcessingAgent
**Network Integration:** dataPipelineNetwork
**Key Features:**

- `suspend()` with `suspendSchema` for human approval request
- `resumeSchema` for approval input
- Nested workflow pattern for validation step
- Full trace context propagation across suspend/resume
- Writer events for approval status

## Streaming Requirements

All workflows MUST implement streaming using the `writer` argument:

```typescript
execute: async ({ inputData, writer, tracingContext }) => {
  // Step start event
  await writer?.write({ 
    type: 'step-start', 
    stepId: 'fetch-data',
    timestamp: Date.now()
  });
  
  // Progress events during execution
  await writer?.write({ 
    type: 'progress', 
    percent: 50,
    message: 'Fetching stock data...'
  });
  
  // Step complete event
  await writer?.write({ 
    type: 'step-complete', 
    stepId: 'fetch-data',
    success: true,
    duration: Date.now() - startTime
  });
  
  return result;
}
```

**Event Types to Implement:**

- `step-start`: Beginning of step execution
- `progress`: Incremental progress updates (0-100%)
- `step-complete`: Successful step completion
- `step-error`: Step failure information
- `iteration`: Loop iteration info (for dowhile/foreach)
- `parallel-progress`: Status of parallel branches
- `suspend-request`: HITL approval needed

## AI Tracing Requirements

All workflows MUST integrate with Mastra's AI tracing:

```typescript
execute: async ({ inputData, tracingContext }) => {
  // Create child span for sub-operation
  const span = tracingContext.currentSpan?.createChildSpan({
    type: 'generic',
    name: 'polygon-api-call',
    input: { symbol: inputData.symbol },
    metadata: { 
      service: 'polygon',
      endpoint: '/v1/ticker'
    }
  });
  
  try {
    const result = await polygonClient.getStockData(inputData.symbol);
    span?.end({ 
      output: result,
      metadata: { 
        responseTime: Date.now() - start,
        dataPoints: result.length 
      }
    });
    return result;
  } catch (error) {
    span?.error({ error, endSpan: true });
    throw error;
  }
}
```

**Workflow Options:**

```typescript
const workflow = createWorkflow({
  id: 'stock-analysis-workflow',
  options: {
    tracingPolicy: { 
      internal: InternalSpans.NONE  // Show all spans
    },
    validateInputs: true
  }
})
```

## Network Integration Matrix

| Workflow | Primary Network | Secondary Network | Key Agents |
|----------|-----------------|-------------------|------------|
| stockAnalysisWorkflow | agentNetwork | dataPipelineNetwork | stockAnalysisAgent, reportAgent |
| documentProcessingWorkflow | researchPipelineNetwork | dataPipelineNetwork | knowledgeIndexingAgent, documentProcessingAgent |
| contentReviewWorkflow | reportGenerationNetwork | - | researchAgent, copywriterAgent, editorAgent, evaluationAgent |
| financialReportWorkflow | agentNetwork | reportGenerationNetwork | stockAnalysisAgent, reportAgent |
| researchSynthesisWorkflow | researchPipelineNetwork | reportGenerationNetwork | researchAgent, researchPaperAgent |
| learningExtractionWorkflow | dataPipelineNetwork | - | learningExtractionAgent, evaluationAgent |

## Success Criteria

- [ ] All 6 workflows implemented with proper Zod schemas
- [ ] Each workflow demonstrates its designated control flow technique
- [ ] All workflows implement streaming via `writer` argument
- [ ] All workflows integrate AI tracing with child spans
- [ ] Workflows registered in mastra/index.ts
- [ ] Networks updated to include new workflows
- [ ] Each workflow has clear inputSchema/outputSchema for routing
- [ ] Workflows follow existing codebase patterns
- [ ] Step-level retries configured for API-calling steps
- [ ] Error handling with proper span error recording

## Non-Goals

- Creating new agents (use existing)
- Modifying existing tools
- Adding new dependencies
- Modifying existing network routing logic (only add workflows)
