/**
 * Network Configuration System
 * Centralized configuration for all 4 Mastra agent networks with UI metadata.
 */

export type NetworkCategory = "routing" | "pipeline" | "research"

export interface NetworkAgent {
  id: string
  name: string
  description: string
  role: string
}

export interface NetworkFeatures {
  realTimeRouting: boolean
  multiAgent: boolean
  streaming: boolean
}

export interface NetworkConfig {
  id: string
  name: string
  description: string
  category: NetworkCategory
  features: NetworkFeatures
  agents: NetworkAgent[]
}

const defaultFeatures: NetworkFeatures = {
  realTimeRouting: true,
  multiAgent: true,
  streaming: true,
}

export const NETWORK_CONFIGS: Record<string, NetworkConfig> = {
  "agent-network": {
    id: "agent-network",
    name: "Agent Network",
    description: "Routes requests to specialized agents based on query analysis",
    category: "routing",
    features: { ...defaultFeatures },
    agents: [
      { id: "researchAgent", name: "Research Agent", description: "Web research with citations", role: "researcher" },
      { id: "contentStrategistAgent", name: "Content Strategist", description: "Content planning", role: "strategist" },
      { id: "copywriterAgent", name: "Copywriter", description: "Content writing", role: "writer" },
      { id: "editorAgent", name: "Editor", description: "Content review", role: "editor" },
      { id: "weatherAgent", name: "Weather Agent", description: "Weather forecasts", role: "utility" },
    ],
  },
  "data-pipeline-network": {
    id: "data-pipeline-network",
    name: "Data Pipeline Network",
    description: "Orchestrates data ingestion, transformation, and export",
    category: "pipeline",
    features: { ...defaultFeatures },
    agents: [
      { id: "dataIngestionAgent", name: "Data Ingestion", description: "CSV parsing and file reading", role: "ingestion" },
      { id: "dataTransformationAgent", name: "Data Transformation", description: "CSV↔JSON↔XML transforms", role: "transform" },
      { id: "dataExportAgent", name: "Data Export", description: "File writing and backup", role: "export" },
    ],
  },
  "report-generation-network": {
    id: "report-generation-network",
    name: "Report Generation Network",
    description: "Coordinates research, analysis, and report compilation",
    category: "pipeline",
    features: { ...defaultFeatures },
    agents: [
      { id: "researchAgent", name: "Research Agent", description: "Gather source materials", role: "research" },
      { id: "evaluationAgent", name: "Evaluation Agent", description: "Analyze and score content", role: "analysis" },
      { id: "reportAgent", name: "Report Agent", description: "Generate formatted reports", role: "output" },
    ],
  },
  "research-pipeline-network": {
    id: "research-pipeline-network",
    name: "Research Pipeline Network",
    description: "Multi-source research aggregation and synthesis",
    category: "research",
    features: { ...defaultFeatures },
    agents: [
      { id: "researchAgent", name: "Research Agent", description: "Web search and data gathering", role: "gather" },
      { id: "researchPaperAgent", name: "Research Paper Agent", description: "ArXiv search and PDF parsing", role: "papers" },
      { id: "documentProcessingAgent", name: "Document Processing", description: "PDF to markdown conversion", role: "process" },
      { id: "knowledgeIndexingAgent", name: "Knowledge Indexing", description: "Vector database indexing", role: "index" },
    ],
  },
}

export const CATEGORY_LABELS: Record<NetworkCategory, string> = {
  routing: "Intelligent Routing",
  pipeline: "Data Pipelines",
  research: "Research & Knowledge",
}

export const CATEGORY_ORDER: NetworkCategory[] = ["routing", "pipeline", "research"]

export function getNetworkConfig(networkId: string): NetworkConfig | undefined {
  return NETWORK_CONFIGS[networkId]
}

export function getNetworksByCategory(): Record<NetworkCategory, NetworkConfig[]> {
  const grouped: Record<NetworkCategory, NetworkConfig[]> = {
    routing: [],
    pipeline: [],
    research: [],
  }

  for (const config of Object.values(NETWORK_CONFIGS)) {
    grouped[config.category].push(config)
  }

  return grouped
}

export function getAllNetworkIds(): string[] {
  return Object.keys(NETWORK_CONFIGS)
}

export type NetworkId = keyof typeof NETWORK_CONFIGS
