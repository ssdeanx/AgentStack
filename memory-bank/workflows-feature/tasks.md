# Tasks: Network-Ready Workflows

## Task Breakdown

### TASK-WF001: Stock Analysis Workflow
**Status:** Not Started  
**Effort:** M  
**Files:** `src/mastra/workflows/stock-analysis-workflow.ts`

**Steps:**

1. Create fetchStockDataStep using polygon-tools
2. Create getCompanyNewsStep using finnhub-tools
3. Create runAnalysisStep using stockAnalysisAgent
4. Create generateReportStep using reportAgent
5. Chain steps with `.then()`
6. Export workflow

**Acceptance Criteria:**

- [ ] Input: symbol (string), analysisDepth (enum)
- [ ] Output: analysis object with technicals, sentiment, recommendation
- [ ] Uses existing tools without modification
- [ ] Follows Mastra workflow patterns

---

### TASK-WF002: Document Processing Workflow
**Status:** Not Started  
**Effort:** M  
**Files:** `src/mastra/workflows/document-processing-workflow.ts`

**Steps:**

1. Create loadDocumentStep for source handling
2. Create convertToMarkdownStep using pdfToMarkdownTool
3. Create chunkDocumentStep using mastraChunker
4. Create indexChunksStep using knowledgeIndexingAgent
5. Create generateSummaryStep
6. Use `.branch()` for PDF vs text handling

**Acceptance Criteria:**

- [ ] Input: source object (type, value), chunkStrategy, indexName
- [ ] Output: documentId, chunksCount, indexed status, summary
- [ ] Handles URL, path, and content sources
- [ ] Conditional PDF conversion

---

### TASK-WF003: Content Review Workflow
**Status:** Not Started  
**Effort:** L  
**Files:** `src/mastra/workflows/content-review-workflow.ts`

**Steps:**

1. Create researchTopicStep using researchAgent
2. Create draftContentStep using copywriterAgent
3. Create reviewContentStep using editorAgent
4. Create scoreContentStep using evaluationAgent
5. Create refineContentStep for improvements
6. Use `.dowhile()` for quality loop

**Acceptance Criteria:**

- [ ] Input: topic, contentType, targetAudience, qualityThreshold
- [ ] Output: content, score, iterations count, feedback array
- [ ] Loops until score >= threshold
- [ ] Max iterations safeguard

---

### TASK-WF004: Financial Report Workflow
**Status:** Not Started  
**Effort:** L  
**Files:** `src/mastra/workflows/financial-report-workflow.ts`

**Steps:**

1. Create fetchPriceDataStep using polygon-tools
2. Create fetchCompanyMetricsStep using finnhub-tools
3. Create fetchNewsSentimentStep using serpapi/finnhub
4. Create mergeDataStep to combine parallel results
5. Create analyzeDataStep using stockAnalysisAgent
6. Create generateReportStep using reportAgent
7. Use `.parallel()` for concurrent fetching

**Acceptance Criteria:**

- [ ] Input: symbols array, reportType, includeNews, includeTechnicals
- [ ] Output: reportId, generatedAt, summary, full report, raw data
- [ ] Parallel data fetching
- [ ] Handles multiple symbols

---

### TASK-WF005: Export and Registration
**Status:** Not Started  
**Effort:** S  
**Files:**

- `src/mastra/workflows/index.ts`
- `src/mastra/networks/index.ts`
- `src/mastra/index.ts`

**Steps:**

1. Export all new workflows from workflows/index.ts
2. Update network definitions with new workflows
3. Register workflows in mastra/index.ts

**Acceptance Criteria:**

- [ ] All workflows exported from index.ts
- [ ] Networks include appropriate workflows
- [ ] Workflows registered in Mastra instance

---

### TASK-WF006: Update Memory Bank
**Status:** Not Started  
**Effort:** S  
**Files:**

- `memory-bank/activeContext.md`
- `memory-bank/progress.md`

**Steps:**

1. Update activeContext with new workflows
2. Update progress with implementation status
3. Document integration points

**Acceptance Criteria:**

- [ ] activeContext reflects new workflows
- [ ] progress.md updated with completion status
- [ ] Network integration documented
