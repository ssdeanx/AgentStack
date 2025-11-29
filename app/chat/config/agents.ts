/**
 * Agent Configuration System
 * Centralized configuration for all 26+ Mastra agents with UI feature flags.
 */

export type AgentCategory =
  | 'core'
  | 'research'
  | 'content'
  | 'data'
  | 'financial'
  | 'diagram'
  | 'utility'

export interface AgentFeatures {
  reasoning: boolean
  chainOfThought: boolean
  tools: boolean
  sources: boolean
  canvas: boolean
  artifacts: boolean
  fileUpload: boolean
}

export interface AgentConfig {
  id: string
  name: string
  description: string
  category: AgentCategory
  features: AgentFeatures
  icon?: string
}

const defaultFeatures: AgentFeatures = {
  reasoning: false,
  chainOfThought: false,
  tools: false,
  sources: false,
  canvas: false,
  artifacts: false,
  fileUpload: false,
}

export const AGENT_CONFIGS: Record<string, AgentConfig> = {
  // Core Agents
  weatherAgent: {
    id: 'weatherAgent',
    name: 'Weather Agent',
    description: 'Get weather forecasts and activity suggestions for any location',
    category: 'core',
    features: { ...defaultFeatures, tools: true },
  },
  a2aCoordinatorAgent: {
    id: 'a2aCoordinatorAgent',
    name: 'A2A Coordinator',
    description: 'Orchestrates and routes tasks across multiple specialized agents',
    category: 'core',
    features: { ...defaultFeatures, chainOfThought: true, tools: true },
  },

  // Research Agents
  researchAgent: {
    id: 'researchAgent',
    name: 'Research Agent',
    description: 'Conducts web research with source citations and analysis',
    category: 'research',
    features: {
      ...defaultFeatures,
      reasoning: true,
      chainOfThought: true,
      tools: true,
      sources: true
    },
  },
  researchPaperAgent: {
    id: 'researchPaperAgent',
    name: 'Research Paper Agent',
    description: 'Search arXiv, download papers, and parse PDFs to markdown',
    category: 'research',
    features: {
      ...defaultFeatures,
      reasoning: true,
      chainOfThought: true,
      tools: true,
      sources: true,
      artifacts: true
    },
  },
  documentProcessingAgent: {
    id: 'documentProcessingAgent',
    name: 'Document Processing Agent',
    description: 'Convert PDFs to markdown and chunk documents for RAG',
    category: 'research',
    features: {
      ...defaultFeatures,
      chainOfThought: true,
      tools: true,
      sources: true,
      artifacts: true,
      fileUpload: true
    },
  },
  knowledgeIndexingAgent: {
    id: 'knowledgeIndexingAgent',
    name: 'Knowledge Indexing Agent',
    description: 'Index documents into PgVector for semantic search',
    category: 'research',
    features: { ...defaultFeatures, chainOfThought: true, tools: true },
  },

  // Content Agents
  copywriterAgent: {
    id: 'copywriterAgent',
    name: 'Copywriter Agent',
    description: 'Professional content writing and copy generation',
    category: 'content',
    features: { ...defaultFeatures, reasoning: true, artifacts: true },
  },
  editorAgent: {
    id: 'editorAgent',
    name: 'Editor Agent',
    description: 'Reviews and improves written content with suggestions',
    category: 'content',
    features: { ...defaultFeatures, reasoning: true, artifacts: true },
  },
  contentStrategistAgent: {
    id: 'contentStrategistAgent',
    name: 'Content Strategist Agent',
    description: 'Develops content strategies and editorial plans',
    category: 'content',
    features: { ...defaultFeatures, reasoning: true, chainOfThought: true },
  },
  scriptWriterAgent: {
    id: 'scriptWriterAgent',
    name: 'Script Writer Agent',
    description: 'Writes scripts for video, audio, and presentations',
    category: 'content',
    features: { ...defaultFeatures, reasoning: true, artifacts: true },
  },
  reportAgent: {
    id: 'reportAgent',
    name: 'Report Agent',
    description: 'Generates formatted reports from processed data',
    category: 'content',
    features: { 
      ...defaultFeatures, 
      chainOfThought: true, 
      tools: true, 
      sources: true, 
      artifacts: true 
    },
  },

  // Data Pipeline Agents
  dataExportAgent: {
    id: 'dataExportAgent',
    name: 'Data Export Agent',
    description: 'Convert JSON to CSV, file writing, backup, and validation',
    category: 'data',
    features: { 
      ...defaultFeatures, 
      chainOfThought: true, 
      tools: true, 
      artifacts: true 
    },
  },
  dataIngestionAgent: {
    id: 'dataIngestionAgent',
    name: 'Data Ingestion Agent',
    description: 'CSV parsing, file reading, and structure validation',
    category: 'data',
    features: { 
      ...defaultFeatures, 
      chainOfThought: true, 
      tools: true, 
      fileUpload: true 
    },
  },
  dataTransformationAgent: {
    id: 'dataTransformationAgent',
    name: 'Data Transformation Agent',
    description: 'CSV↔JSON↔XML transformations and data restructuring',
    category: 'data',
    features: { ...defaultFeatures, chainOfThought: true, tools: true },
  },

  // Financial Agents
  stockAnalysisAgent: {
    id: 'stockAnalysisAgent',
    name: 'Stock Analysis Agent',
    description: 'Analyze stocks with technical and fundamental analysis',
    category: 'financial',
    features: { 
      ...defaultFeatures, 
      reasoning: true, 
      chainOfThought: true, 
      tools: true, 
      sources: true, 
      artifacts: true 
    },
  },
  chartTypeAdvisorAgent: {
    id: 'chartTypeAdvisorAgent',
    name: 'Chart Type Advisor',
    description: 'Recommends optimal chart types for financial data',
    category: 'financial',
    features: { ...defaultFeatures, reasoning: true },
  },
  chartDataProcessorAgent: {
    id: 'chartDataProcessorAgent',
    name: 'Chart Data Processor',
    description: 'Transforms financial API data into Recharts format',
    category: 'financial',
    features: { ...defaultFeatures, chainOfThought: true, tools: true },
  },
  chartGeneratorAgent: {
    id: 'chartGeneratorAgent',
    name: 'Chart Generator',
    description: 'Generates Recharts React component code',
    category: 'financial',
    features: { ...defaultFeatures, tools: true, artifacts: true },
  },
  chartSupervisorAgent: {
    id: 'chartSupervisorAgent',
    name: 'Chart Supervisor',
    description: 'Orchestrates the chart creation pipeline',
    category: 'financial',
    features: { 
      ...defaultFeatures, 
      reasoning: true, 
      chainOfThought: true, 
      tools: true, 
      artifacts: true 
    },
  },

  // Diagram Agents
  csvToExcalidrawAgent: {
    id: 'csvToExcalidrawAgent',
    name: 'CSV to Excalidraw Agent',
    description: 'Converts CSV data to Excalidraw diagrams',
    category: 'diagram',
    features: { 
      ...defaultFeatures, 
      chainOfThought: true, 
      tools: true, 
      canvas: true, 
      artifacts: true 
    },
  },
  imageToCsvAgent: {
    id: 'imageToCsvAgent',
    name: 'Image to CSV Agent',
    description: 'Extracts tabular data from images using OCR',
    category: 'diagram',
    features: { 
      ...defaultFeatures, 
      chainOfThought: true, 
      tools: true, 
      artifacts: true, 
      fileUpload: true 
    },
  },
  excalidrawValidatorAgent: {
    id: 'excalidrawValidatorAgent',
    name: 'Excalidraw Validator',
    description: 'Validates and fixes Excalidraw diagram schemas',
    category: 'diagram',
    features: { ...defaultFeatures, tools: true, canvas: true },
  },

  // Utility Agents
  evaluationAgent: {
    id: 'evaluationAgent',
    name: 'Evaluation Agent',
    description: 'Evaluates and scores agent performance and content quality',
    category: 'utility',
    features: { 
      ...defaultFeatures, 
      reasoning: true, 
      chainOfThought: true, 
      tools: true, 
      artifacts: true 
    },
  },
  learningExtractionAgent: {
    id: 'learningExtractionAgent',
    name: 'Learning Extraction Agent',
    description: 'Extracts learnings and insights from content',
    category: 'utility',
    features: { ...defaultFeatures, reasoning: true, tools: true },
  },
  dane: {
    id: 'dane',
    name: 'Dane',
    description: 'Utility agent for development and testing workflows',
    category: 'utility',
    features: { ...defaultFeatures, tools: true },
  },
  sqlAgent: {
    id: 'sqlAgent',
    name: 'SQL Agent',
    description: 'SQL query generation and database operations',
    category: 'utility',
    features: { ...defaultFeatures, tools: true, artifacts: true },
  },
}

export const CATEGORY_LABELS: Record<AgentCategory, string> = {
  core: 'Core',
  research: 'Research & Documents',
  content: 'Content Creation',
  data: 'Data Pipeline',
  financial: 'Financial Analysis',
  diagram: 'Diagrams & Visuals',
  utility: 'Utilities',
}

export const CATEGORY_ORDER: AgentCategory[] = [
  'core',
  'research',
  'content',
  'data',
  'financial',
  'diagram',
  'utility',
]

export function getAgentConfig(agentId: string): AgentConfig | undefined {
  return AGENT_CONFIGS[agentId]
}

export function getAgentsByCategory(): Record<AgentCategory, AgentConfig[]> {
  const grouped: Record<AgentCategory, AgentConfig[]> = {
    core: [],
    research: [],
    content: [],
    data: [],
    financial: [],
    diagram: [],
    utility: [],
  }

  for (const config of Object.values(AGENT_CONFIGS)) {
    grouped[config.category].push(config)
  }

  return grouped
}

export function getAllAgentIds(): string[] {
  return Object.keys(AGENT_CONFIGS)
}

export function getAgentsWithFeature(
  feature: keyof AgentFeatures
): AgentConfig[] {
  return Object.values(AGENT_CONFIGS).filter(
    (config) => config.features[feature]
  )
}
