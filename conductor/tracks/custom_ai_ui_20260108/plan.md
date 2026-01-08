# Plan: Implement Custom AI UI Components for Mastra Tools

## Phase 1: Financial Tools UI
- [x] Task: Create `FinancialQuoteCard` component in `src/components/ai-elements/tools/financial-tools.tsx`
  - **Sub-task:** Write unit tests for `FinancialQuoteCard` (mocking shadcn components).
  - **Sub-task:** Implement the component to display symbol, price, and percentage change.
- [x] Task: Create `FinancialChart` component using Recharts
  - **Sub-task:** Write unit tests ensuring data prop mapping.
  - **Sub-task:** Implement line chart visualization for time-series data.
- [x] Task: Register financial tools in `src/components/ai-elements/tools/index.ts`
  - **Sub-task:** Export new components.
  - **Sub-task:** Map tool IDs (e.g., `polygon-stock-quotes`) to the new components.
- [x] Task: Conductor - User Manual Verification 'Phase 1: Financial Tools UI' (Protocol in workflow.md)

## Phase 2: GitHub Tools UI
- [x] Task: Create `RepositoryCard` component in `src/components/ai-elements/tools/github-tools.tsx`
  - **Sub-task:** Write tests for repo metadata display.
  - **Sub-task:** Implement card with stats (stars, forks) and link.
- [x] Task: Create `PullRequestList` component
  - **Sub-task:** Write tests for list rendering and empty states.
  - **Sub-task:** Implement collapsible list of PRs with status badges.
- [x] Task: Register GitHub tools in `src/components/ai-elements/tools/index.ts`
  - **Sub-task:** Map `github:listRepositories` and `github:listPullRequests` to components.
- [x] Task: Conductor - User Manual Verification 'Phase 2: GitHub Tools UI' (Protocol in workflow.md)

## Phase 3: Weather Tool UI
- [x] Task: Create `WeatherCard` component in `src/components/ai-elements/tools/weather-tool.tsx`
  - **Sub-task:** Write tests for different weather conditions (icons/colors).
  - **Sub-task:** Implement card showing temp, humidity, and condition icon.
- [x] Task: Register Weather tool
  - **Sub-task:** Map `get-weather` tool ID to `WeatherCard`.
- [x] Task: Conductor - User Manual Verification 'Phase 3: Weather Tool UI' (Protocol in workflow.md)

## Phase 4: Research & Search Tools UI
- [x] Task: Create `ArxivPaperCard` component in `src/components/ai-elements/tools/research-tools.tsx`
  - **Sub-task:** Write tests for paper metadata display.
  - **Sub-task:** Implement card with title, authors, summary, and PDF link.
- [x] Task: Create `SearchResultList` component
  - **Sub-task:** Write tests for list of search results.
  - **Sub-task:** Implement list of snippets with links and source favicons.
- [x] Task: Register Research and Search tools in `src/components/ai-elements/tools/index.ts`
  - **Sub-task:** Map `arxiv:search` and `serpapi:search` to components.
- [x] Task: Conductor - User Manual Verification 'Phase 4: Research & Search Tools UI' (Protocol in workflow.md)

## Phase 5: Component Depth Expansion
- [x] Task: Expand Financial Tools
  - **Sub-task:** Create `CompanyProfileCard` (sector, market cap, description) for `polygon-stock-fundamentals` / `finnhub-company`.
  - **Sub-task:** Update `financial-tools.tsx` and tests.
- [x] Task: Expand GitHub Tools
  - **Sub-task:** Create `CommitHistoryList` for `github:listCommits`.
  - **Sub-task:** Update `github-tools.tsx` and tests.
- [x] Task: Expand Weather Tools
  - **Sub-task:** Create `ForecastView` (3-day forecast rows) for `get-weather` (if forecast available).
  - **Sub-task:** Update `weather-tool.tsx` and tests.
- [x] Task: Expand Research Tools
  - **Sub-task:** Create `NewsCarousel` for `serpapi-news-trends` / `finnhub-company-news`.
  - **Sub-task:** Update `research-tools.tsx` and tests.
- [ ] Task: Register new expanded components in `index.ts` and `agent-tools.tsx`.

## Phase 6: Financial & Research Tool Expansion
- [ ] Task: Add components for Financial Technical Indicators
  - **Sub-task:** Create `TechnicalIndicatorCard` for `finnhub-technical` (e.g., RSI, MACD).
  - **Sub-task:** Update `financial-tools.tsx` and tests.
- [ ] Task: Add components for Crypto Data
  - **Sub-task:** Create `CryptoQuoteCard` for `polygon-crypto-quotes`.
  - **Sub-task:** Update `financial-tools.tsx` and tests.
- [ ] Task: Add components for News Analysis
  - **Sub-task:** Create `CompanyNewsList` for `finnhub-company` news function.
  - **Sub-task:** Update `research-tools.tsx` and tests.
- [ ] Task: Add components for Shopping Search Results
  - **Sub-task:** Create `ShoppingProductCard` for `serpapi-shopping`.
  - **Sub-task:** Update `research-tools.tsx` and tests.
- [ ] Task: Register new components in `index.ts` and `agent-tools.tsx`.

## Phase 7: Data Integration
- [ ] Task: Implement CSV Parser Component
  - **Sub-task:** Create `CsvParserCard` for CSV file parsing.
  - **Sub-task:** Update `data-tools.tsx` and tests.
- [ ] Task: Implement JSON Parser Component
  - **Sub-task:** Create `JsonParserCard` for JSON file parsing.
  - **Sub-task:** Update `data-tools.tsx` and tests.
- [ ] Task: Implement PDF Parser Component
  - **Sub-task:** Create `PdfParserCard` for PDF text extraction.
  - **Sub-task:** Update `data-tools.tsx` and tests.
- [ ] Task: Register Data Integration tools in `index.ts` and `agent-tools.tsx`.

## Phase 8: RAG Pipeline
- [ ] Task: Implement Chunking Component
  - **Sub-task:** Create `TextChunkerCard` for text chunking.
  - **Sub-task:** Update `rag-tools.tsx` and tests.
- [ ] Task: Implement Embedding Component
  - **Sub-task:** Create `EmbeddingGeneratorCard` for generating embeddings.
  - **Sub-task:** Update `rag-tools.tsx` and tests.
- [ ] Task: Implement Vector Search Component
  - **Sub-task:** Create `VectorSearchCard` for querying vector databases.
  - **Sub-task:** Update `rag-tools.tsx` and tests.
- [ ] Task: Register RAG Pipeline tools in `index.ts` and `agent-tools.tsx`.

## Phase 9: Code Execution
- [ ] Task: Implement Script Runner Component
  - **Sub-task:** Create `ScriptRunnerCard` for executing scripts (e.g., Python, JS).
  - **Sub-task:** Update `code-tools.tsx` and tests.
- [ ] Task: Implement Interpreter Component
  - **Sub-task:** Create `CodeInterpreterCard` for interactive code execution.
  - **Sub-task:** Update `code-tools.tsx` and tests.
- [ ] Task: Register Code Execution tools in `index.ts` and `agent-tools.tsx`.
