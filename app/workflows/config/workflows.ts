/**
 * Workflow Configuration System
 * Centralized configuration for all 10 Mastra workflows with UI metadata.
 */

export type WorkflowCategory =
  | "content"
  | "data"
  | "financial"
  | "research"
  | "utility"

export interface WorkflowStep {
  id: string
  label: string
  description: string
  content: string
  footer: string
}

export interface WorkflowFeatures {
  realTimeProgress: boolean
  stepExecution: boolean
  exportSvg: boolean
  viewCode: boolean
}

export interface WorkflowConfig {
  id: string
  name: string
  description: string
  category: WorkflowCategory
  features: WorkflowFeatures
  steps: WorkflowStep[]
}

const defaultFeatures: WorkflowFeatures = {
  realTimeProgress: true,
  stepExecution: true,
  exportSvg: true,
  viewCode: true,
}

export const WORKFLOW_CONFIGS: Record<string, WorkflowConfig> = {
  weatherWorkflow: {
    id: "weatherWorkflow",
    name: "Weather Workflow",
    description: "Fetches weather and suggests activities",
    category: "utility",
    features: { ...defaultFeatures },
    steps: [
      {
        id: "fetch-weather",
        label: "Fetch Weather",
        description: "Get forecast from Open-Meteo API",
        content: "Geocoding + weather data retrieval",
        footer: "HTTP API calls",
      },
      {
        id: "plan-activities",
        label: "Plan Activities",
        description: "AI-powered activity suggestions",
        content: "Uses weatherAgent to generate recommendations",
        footer: "Agent: weatherAgent",
      },
    ],
  },
  contentStudioWorkflow: {
    id: "contentStudioWorkflow",
    name: "Content Studio",
    description: "Full content creation pipeline with research, strategy, and review",
    category: "content",
    features: { ...defaultFeatures },
    steps: [
      {
        id: "research-step",
        label: "Research",
        description: "Topic research & data gathering",
        content: "Finds unique angles and trending discussions",
        footer: "Agent: researchAgent",
      },
      {
        id: "evaluation-step",
        label: "Evaluate",
        description: "Relevance evaluation",
        content: "Checks if research matches topic goals",
        footer: "Agent: evaluationAgent",
      },
      {
        id: "learning-step",
        label: "Extract Learning",
        description: "Key insight extraction",
        content: "Identifies most important takeaways",
        footer: "Agent: learningExtractionAgent",
      },
      {
        id: "strategy-step",
        label: "Strategy",
        description: "Content planning",
        content: "Creates title, audience, angle, key points",
        footer: "Agent: contentStrategistAgent",
      },
      {
        id: "hook-step",
        label: "Write Hooks",
        description: "Generate 3 attention hooks",
        content: "Creates compelling opening lines",
        footer: "Agent: scriptWriterAgent",
      },
      {
        id: "body-step",
        label: "Write Body",
        description: "Main content creation",
        content: "Writes the full script body",
        footer: "Agent: scriptWriterAgent",
      },
      {
        id: "review-step",
        label: "Review",
        description: "Quality check (0-100)",
        content: "Scores content, provides feedback",
        footer: "Agent: editorAgent",
      },
      {
        id: "refine-step",
        label: "Refine",
        description: "Iterative improvement",
        content: "Loops until score ≥ 80",
        footer: "Do-While Loop",
      },
    ],
  },
  contentReviewWorkflow: {
    id: "contentReviewWorkflow",
    name: "Content Review",
    description: "Multi-agent content review and editing pipeline",
    category: "content",
    features: { ...defaultFeatures },
    steps: [
      {
        id: "initial-review",
        label: "Initial Review",
        description: "First pass analysis",
        content: "Grammar, structure, clarity check",
        footer: "Agent: editorAgent",
      },
      {
        id: "deep-review",
        label: "Deep Review",
        description: "Comprehensive analysis",
        content: "Fact-checking, tone, consistency",
        footer: "Agent: evaluationAgent",
      },
      {
        id: "final-edit",
        label: "Final Edit",
        description: "Apply all corrections",
        content: "Produces polished final version",
        footer: "Agent: copywriterAgent",
      },
    ],
  },
  documentProcessingWorkflow: {
    id: "documentProcessingWorkflow",
    name: "Document Processing",
    description: "PDF to searchable knowledge base",
    category: "data",
    features: { ...defaultFeatures },
    steps: [
      {
        id: "parse-pdf",
        label: "Parse PDF",
        description: "Extract text from PDF",
        content: "OCR and text extraction",
        footer: "Tool: pdfParser",
      },
      {
        id: "chunk-document",
        label: "Chunk Document",
        description: "Split into semantic chunks",
        content: "Intelligent paragraph splitting",
        footer: "RAG Pipeline",
      },
      {
        id: "generate-embeddings",
        label: "Generate Embeddings",
        description: "Create vector representations",
        content: "OpenAI embeddings API",
        footer: "Vector: pgVector",
      },
      {
        id: "index-knowledge",
        label: "Index Knowledge",
        description: "Store in vector database",
        content: "Upsert to PostgreSQL",
        footer: "Agent: knowledgeIndexingAgent",
      },
    ],
  },
  financialReportWorkflow: {
    id: "financialReportWorkflow",
    name: "Financial Report",
    description: "Stock analysis with chart generation",
    category: "financial",
    features: { ...defaultFeatures },
    steps: [
      {
        id: "fetch-data",
        label: "Fetch Data",
        description: "Get stock market data",
        content: "Alpha Vantage / Yahoo Finance APIs",
        footer: "Tool: stockDataFetcher",
      },
      {
        id: "analyze-data",
        label: "Analyze",
        description: "Technical & fundamental analysis",
        content: "Moving averages, RSI, P/E ratios",
        footer: "Agent: stockAnalysisAgent",
      },
      {
        id: "generate-charts",
        label: "Generate Charts",
        description: "Create Recharts visualizations",
        content: "Line, bar, candlestick charts",
        footer: "Agent: chartGeneratorAgent",
      },
      {
        id: "compile-report",
        label: "Compile Report",
        description: "Assemble final report",
        content: "Markdown with embedded charts",
        footer: "Agent: reportAgent",
      },
    ],
  },
  learningExtractionWorkflow: {
    id: "learningExtractionWorkflow",
    name: "Learning Extraction",
    description: "Extract insights and learnings from content",
    category: "research",
    features: { ...defaultFeatures },
    steps: [
      {
        id: "analyze-content",
        label: "Analyze Content",
        description: "Deep content analysis",
        content: "Identify key themes and concepts",
        footer: "Agent: learningExtractionAgent",
      },
      {
        id: "extract-insights",
        label: "Extract Insights",
        description: "Pull actionable learnings",
        content: "Key takeaways and patterns",
        footer: "Agent: evaluationAgent",
      },
      {
        id: "format-output",
        label: "Format Output",
        description: "Structure learnings",
        content: "Bullet points and summaries",
        footer: "Agent: reportAgent",
      },
    ],
  },
  researchSynthesisWorkflow: {
    id: "researchSynthesisWorkflow",
    name: "Research Synthesis",
    description: "Multi-source research aggregation",
    category: "research",
    features: { ...defaultFeatures },
    steps: [
      {
        id: "gather-sources",
        label: "Gather Sources",
        description: "Collect research materials",
        content: "Web search, papers, articles",
        footer: "Agent: researchAgent",
      },
      {
        id: "analyze-sources",
        label: "Analyze Sources",
        description: "Evaluate credibility",
        content: "Source quality scoring",
        footer: "Agent: evaluationAgent",
      },
      {
        id: "synthesize",
        label: "Synthesize",
        description: "Combine insights",
        content: "Cross-reference and merge findings",
        footer: "Agent: researchPaperAgent",
      },
      {
        id: "generate-report",
        label: "Generate Report",
        description: "Create final synthesis",
        content: "Comprehensive research report",
        footer: "Agent: reportAgent",
      },
    ],
  },
  stockAnalysisWorkflow: {
    id: "stockAnalysisWorkflow",
    name: "Stock Analysis",
    description: "Comprehensive stock evaluation",
    category: "financial",
    features: { ...defaultFeatures },
    steps: [
      {
        id: "fetch-stock-data",
        label: "Fetch Stock Data",
        description: "Get historical prices",
        content: "OHLCV data retrieval",
        footer: "Tool: stockDataFetcher",
      },
      {
        id: "technical-analysis",
        label: "Technical Analysis",
        description: "Chart pattern analysis",
        content: "Support/resistance, trends",
        footer: "Agent: stockAnalysisAgent",
      },
      {
        id: "fundamental-analysis",
        label: "Fundamental Analysis",
        description: "Company financials",
        content: "Revenue, earnings, ratios",
        footer: "Agent: stockAnalysisAgent",
      },
      {
        id: "generate-recommendation",
        label: "Recommendation",
        description: "Buy/sell/hold decision",
        content: "AI-powered investment advice",
        footer: "Agent: stockAnalysisAgent",
      },
    ],
  },
  telephoneGameWorkflow: {
    id: "telephoneGameWorkflow",
    name: "Telephone Game",
    description: "Message transformation through multiple agents",
    category: "utility",
    features: { ...defaultFeatures },
    steps: [
      {
        id: "initial-message",
        label: "Initial Message",
        description: "Starting point",
        content: "Original message input",
        footer: "User Input",
      },
      {
        id: "agent-1-transform",
        label: "Agent 1",
        description: "First transformation",
        content: "Interprets and rewrites",
        footer: "Agent: copywriterAgent",
      },
      {
        id: "agent-2-transform",
        label: "Agent 2",
        description: "Second transformation",
        content: "Re-interprets message",
        footer: "Agent: editorAgent",
      },
      {
        id: "agent-3-transform",
        label: "Agent 3",
        description: "Final transformation",
        content: "Final interpretation",
        footer: "Agent: scriptWriterAgent",
      },
      {
        id: "compare-results",
        label: "Compare",
        description: "Show evolution",
        content: "Side-by-side comparison",
        footer: "Agent: evaluationAgent",
      },
    ],
  },
  changelogWorkflow: {
    id: "changelogWorkflow",
    name: "Changelog",
    description: "Generate changelogs from git commits",
    category: "utility",
    features: { ...defaultFeatures },
    steps: [
      {
        id: "fetch-commits",
        label: "Fetch Commits",
        description: "Get git history",
        content: "Parse commit messages",
        footer: "Tool: gitLog",
      },
      {
        id: "categorize",
        label: "Categorize",
        description: "Group by type",
        content: "Features, fixes, breaking changes",
        footer: "Agent: daneChangeLog",
      },
      {
        id: "generate-changelog",
        label: "Generate",
        description: "Create markdown",
        content: "Formatted changelog output",
        footer: "Agent: daneChangeLog",
      },
    ],
  },
  repoIngestionWorkflow: {
    id: "repoIngestionWorkflow",
    name: "Repository Ingestion",
    description: "Scan and ingest repository files into knowledge base",
    category: "data",
    features: { ...defaultFeatures },
    steps: [
      {
        id: "scan-repo",
        label: "Scan Repository",
        description: "Find files matching pattern",
        content: "Supports local and GitHub repos",
        footer: "Tool: glob/GitHub API",
      },
      {
        id: "ingest-files",
        label: "Ingest Files",
        description: "Chunk and embed documents",
        content: "Batch processing with RAG pipeline",
        footer: "Tool: mdocumentChunker",
      },
    ],
  },
  specGenerationWorkflow: {
    id: "specGenerationWorkflow",
    name: "Spec Generation",
    description: "Generate PRD, architecture, and tasks from requirements",
    category: "research",
    features: { ...defaultFeatures },
    steps: [
      {
        id: "create-plan",
        label: "Create Plan",
        description: "Orchestrate documentation flow",
        content: "SPARC framework planning",
        footer: "Agent: codeArchitectAgent",
      },
      {
        id: "generate-prd",
        label: "Generate PRD",
        description: "Product requirements document",
        content: "User stories, acceptance criteria",
        footer: "Agent: codeArchitectAgent",
      },
      {
        id: "generate-architecture",
        label: "Architect System",
        description: "Technical design document",
        content: "Components, patterns, tech stack",
        footer: "Agent: codeArchitectAgent",
      },
      {
        id: "generate-tasks",
        label: "Generate Tasks",
        description: "Phased development tasks",
        content: "Actionable tickets with DoD",
        footer: "Agent: codeArchitectAgent",
      },
    ],
  },
}

export const CATEGORY_LABELS: Record<WorkflowCategory, string> = {
  content: "Content Creation",
  data: "Data Processing",
  financial: "Financial Analysis",
  research: "Research & Documents",
  utility: "Utilities",
}

export const CATEGORY_ORDER: WorkflowCategory[] = [
  "content",
  "data",
  "financial",
  "research",
  "utility",
]

export function getWorkflowConfig(workflowId: string): WorkflowConfig | undefined {
  return WORKFLOW_CONFIGS[workflowId]
}

export function getWorkflowsByCategory(): Record<WorkflowCategory, WorkflowConfig[]> {
  const grouped: Record<WorkflowCategory, WorkflowConfig[]> = {
    content: [],
    data: [],
    financial: [],
    research: [],
    utility: [],
  }

  for (const config of Object.values(WORKFLOW_CONFIGS)) {
    grouped[config.category].push(config)
  }

  return grouped
}

export function getAllWorkflowIds(): string[] {
  return Object.keys(WORKFLOW_CONFIGS)
}

export type WorkflowId = keyof typeof WORKFLOW_CONFIGS
