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
    | 'business'
    | 'coding'

export interface AgentFeatures {
    reasoning: boolean
    chainOfThought: boolean
    tools: boolean
    sources: boolean
    canvas: boolean
    artifacts: boolean
    fileUpload: boolean
    plan: boolean
    task: boolean
    confirmation: boolean
    checkpoint: boolean
    queue: boolean
    codeBlocks: boolean
    images: boolean
    webPreview: boolean
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
    plan: false,
    task: false,
    confirmation: false,
    checkpoint: false,
    queue: false,
    codeBlocks: true,
    images: true,
    webPreview: false,
}

export const AGENT_CONFIGS: Record<string, AgentConfig> = {
    // Core Agents
    "weatherAgent": {
        id: 'weatherAgent',
        name: 'Weather Agent',
        description:
            'Get weather forecasts and activity suggestions for any location',
        category: 'core',
        features: {
            ...defaultFeatures,
            tools: true,
            canvas: true,
            task: true,
            plan: true,
            webPreview: true,
            chainOfThought: true,
            sources: true,
            reasoning: true,
        },
    },
    "agentNetwork": {
        id: 'agentNetwork',
        name: 'Agent Network',
        description:
            'Routes requests to specialized agents based on query analysis',
        category: 'core',
        features: { ...defaultFeatures, chainOfThought: true, tools: true },
    },

    // Research Agents
    "researchAgent": {
        id: 'researchAgent',
        name: 'Research Agent',
        description: 'Conducts web research with source citations and analysis',
        category: 'research',
        features: {
            ...defaultFeatures,
            reasoning: true,
            chainOfThought: true,
            tools: true,
            sources: true,
            plan: true,
            task: true,
        },
    },
    "researchPaperAgent": {
        id: 'researchPaperAgent',
        name: 'Research Paper Agent',
        description:
            'Search arXiv, download papers, and parse PDFs to markdown',
        category: 'research',
        features: {
            ...defaultFeatures,
            reasoning: true,
            chainOfThought: true,
            tools: true,
            sources: true,
            artifacts: true,
            task: true,
            plan: true,
        },
    },
    "documentProcessingAgent": {
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
            fileUpload: true,
            task: true,
            plan: true,
        },
    },
    "knowledgeIndexingAgent": {
        id: 'knowledgeIndexingAgent',
        name: 'Knowledge Indexing Agent',
        description: 'Index documents into the live vector store for semantic search',
        category: 'research',
        features: {
            ...defaultFeatures,
            chainOfThought: true,
            tools: true,
            artifacts: true,
            fileUpload: true,
            task: true,
            plan: true,
        },
    },

    // Content Agents
    "copywriterAgent": {
        id: 'copywriterAgent',
        name: 'Copywriter Agent',
        description: 'Professional content writing and copy generation',
        category: 'content',
        features: {
            ...defaultFeatures,
            reasoning: true,
            artifacts: true,
            task: true,
            plan: true,
        },
    },
    "editorAgent": {
        id: 'editorAgent',
        name: 'Editor Agent',
        description: 'Reviews and improves written content with suggestions',
        category: 'content',
        features: {
            ...defaultFeatures,
            reasoning: true,
            artifacts: true,
            task: true,
            plan: true,
        },
    },
    "contentStrategistAgent": {
        id: 'contentStrategistAgent',
        name: 'Content Strategist Agent',
        description: 'Develops content strategies and editorial plans',
        category: 'content',
        features: {
            ...defaultFeatures,
            reasoning: true,
            chainOfThought: true,
            task: true,
            plan: true,
        },
    },
    "scriptWriterAgent": {
        id: 'scriptWriterAgent',
        name: 'Script Writer Agent',
        description: 'Writes scripts for video, audio, and presentations',
        category: 'content',
        features: {
            ...defaultFeatures,
            reasoning: true,
            artifacts: true,
            task: true,
            plan: true,
        },
    },
    "reportAgent": {
        id: 'reportAgent',
        name: 'Report Agent',
        description: 'Generates formatted reports from processed data',
        category: 'content',
        features: {
            ...defaultFeatures,
            chainOfThought: true,
            tools: true,
            sources: true,
            artifacts: true,
            task: true,
            plan: true,
        },
    },

    // Data Pipeline Agents
    "dataExportAgent": {
        id: 'dataExportAgent',
        name: 'Data Export Agent',
        description:
            'Convert JSON to CSV, file writing, backup, and validation',
        category: 'data',
        features: {
            ...defaultFeatures,
            chainOfThought: true,
            tools: true,
            artifacts: true,
            task: true,
            plan: true,
        },
    },
    "dataIngestionAgent": {
        id: 'dataIngestionAgent',
        name: 'Data Ingestion Agent',
        description: 'CSV parsing, file reading, and structure validation',
        category: 'data',
        features: {
            ...defaultFeatures,
            chainOfThought: true,
            tools: true,
            fileUpload: true,
            task: true,
            plan: true,
        },
    },
    "dataTransformationAgent": {
        id: 'dataTransformationAgent',
        name: 'Data Transformation Agent',
        description: 'CSV↔JSON↔XML transformations and data restructuring',
        category: 'data',
        features: {
            ...defaultFeatures,
            chainOfThought: true,
            tools: true,
            task: true,
            plan: true,
        },
    },

    // Financial Agents
    "stockAnalysisAgent": {
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
            artifacts: true,
            task: true,
            plan: true,
        },
    },
    "chartTypeAdvisorAgent": {
        id: 'chartTypeAdvisorAgent',
        name: 'Chart Type Advisor',
        description: 'Recommends optimal chart types for financial data',
        category: 'financial',
        features: {
            ...defaultFeatures,
            reasoning: true,
            task: true,
            plan: true,
            webPreview: true,
        },
    },
    "chartDataProcessorAgent": {
        id: 'chartDataProcessorAgent',
        name: 'Chart Data Processor',
        description: 'Transforms financial API data into Recharts format',
        category: 'financial',
        features: {
            ...defaultFeatures,
            chainOfThought: true,
            tools: true,
            task: true,
            plan: true,
            webPreview: true,
        },
    },
    "chartGeneratorAgent": {
        id: 'chartGeneratorAgent',
        name: 'Chart Generator',
        description: 'Generates Recharts React component code',
        category: 'financial',
        features: {
            ...defaultFeatures,
            tools: true,
            artifacts: true,
            task: true,
            plan: true,
            webPreview: true,
        },
    },
    "chartSupervisorAgent": {
        id: 'chartSupervisorAgent',
        name: 'Chart Supervisor',
        description: 'Orchestrates the chart creation pipeline',
        category: 'financial',
        features: {
            ...defaultFeatures,
            reasoning: true,
            chainOfThought: true,
            tools: true,
            artifacts: true,
            task: true,
            plan: true,
            webPreview: true,
        },
    },

    // Graphing & Analysis Agents
    "graphSupervisorAgent": {
        id: 'graphSupervisorAgent',
        name: 'Graph Supervisor',
        description: 'Coordinates graph-based analysis and chart workflows',
        category: 'financial',
        features: {
            ...defaultFeatures,
            reasoning: true,
            chainOfThought: true,
            tools: true,
            artifacts: true,
            plan: true,
        },
    },
    "technicalAnalysisAgent": {
        id: 'technicalAnalysisAgent',
        name: 'Technical Analysis Agent',
        description: 'Performs technical indicators and signal detection for market data',
        category: 'financial',
        features: {
            ...defaultFeatures,
            reasoning: true,
            chainOfThought: true,
            tools: true,
            sources: true,
            task: true,
            plan: true,
        },
    },
    "chartJsAgent": {
        id: 'chartJsAgent',
        name: 'Chart.js Agent',
        description: 'Generates interactive Chart.js component code for visualizations',
        category: 'financial',
        features: {
            ...defaultFeatures,
            tools: true,
            artifacts: true,
            webPreview: true,
            task: true,
            plan: true,
        },
    },
    "mappingAgent": {
        id: 'mappingAgent',
        name: 'Mapping Agent',
        description: 'Creates geospatial and mapping visualizations',
        category: 'diagram',
        features: {
            ...defaultFeatures,
            tools: true,
            canvas: true,
            artifacts: true,
            webPreview: true,
            task: true,
        },
    },
    "fetchAgent": {
        id: 'fetchAgent',
        name: 'Fetch Agent',
        description: 'Lightweight data fetcher for external APIs and datasets',
        category: 'utility',
        features: { ...defaultFeatures, tools: true },
    },
    "finnhubAgent": {
        id: 'finnhubAgent',
        name: 'Finnhub Agent',
        description: 'Retrieves market and financial data from Finnhub APIs',
        category: 'financial',
        features: { ...defaultFeatures, tools: true, sources: true },
    },
    "codeGraphAgent": {
        id: 'codeGraphAgent',
        name: 'Code Graph Agent',
        description: 'Analyzes repository structure and generates dependency graphs',
        category: 'coding',
        features: {
            ...defaultFeatures,
            tools: true,
            artifacts: true,
            chainOfThought: true,
            task: true,
        },
    },
    "codeMetricsAgent": {
        id: 'codeMetricsAgent',
        name: 'Code Metrics Agent',
        description: 'Computes project-level code health metrics and reports',
        category: 'coding',
        features: {
            ...defaultFeatures,
            tools: true,
            artifacts: true,
            task: true,
            plan: true,
        },
    },

    // Marketing & Support Agents
    "socialMediaAgent": {
        id: 'socialMediaAgent',
        name: 'Social Media Agent',
        description: 'Creates and schedules social media content and strategies',
        category: 'content',
        features: {
            ...defaultFeatures,
            reasoning: true,
            tools: true,
            artifacts: true,
            task: true,
            plan: true,
        },
    },
    "seoAgent": {
        id: 'seoAgent',
        name: 'SEO Agent',
        description: 'Provides SEO analysis and content optimization suggestions',
        category: 'content',
        features: {
            ...defaultFeatures,
            reasoning: true,
            tools: true,
            sources: true,
            task: true,
        },
    },
    "translationAgent": {
        id: 'translationAgent',
        name: 'Translation Agent',
        description: 'Translates content and adapts tone for target audiences',
        category: 'content',
        features: { ...defaultFeatures, tools: true, artifacts: true },
    },
    "customerSupportAgent": {
        id: 'customerSupportAgent',
        name: 'Customer Support Agent',
        description: 'Handles customer queries and support ticket drafting',
        category: 'utility',
        features: { ...defaultFeatures, tools: true, task: true },
    },
    "projectManagementAgent": {
        id: 'projectManagementAgent',
        name: 'Project Management Agent',
        description: 'Assists with task breakdowns, timelines, and status reports',
        category: 'utility',
        features: { ...defaultFeatures, tools: true, task: true, plan: true },
    },

    // Diagram Agents
    "csvToExcalidrawAgent": {
        id: 'csvToExcalidrawAgent',
        name: 'CSV to Excalidraw Agent',
        description: 'Converts CSV data to Excalidraw diagrams',
        category: 'diagram',
        features: {
            ...defaultFeatures,
            chainOfThought: true,
            tools: true,
            canvas: true,
            artifacts: true,
            fileUpload: true,
            task: true,
            plan: true,
            webPreview: true,
        },
    },
    "imageToCsvAgent": {
        id: 'imageToCsvAgent',
        name: 'Image to CSV Agent',
        description: 'Extracts tabular data from images using OCR',
        category: 'diagram',
        features: {
            ...defaultFeatures,
            chainOfThought: true,
            tools: true,
            artifacts: true,
            fileUpload: true,
            task: true,
            plan: true,
        },
    },
    "excalidrawValidatorAgent": {
        id: 'excalidrawValidatorAgent',
        name: 'Excalidraw Validator',
        description: 'Validates and fixes Excalidraw diagram schemas',
        category: 'diagram',
        features: {
            ...defaultFeatures,
            tools: true,
            canvas: true,
            task: true,
            plan: true,
        },
    },

    // Utility Agents
    "evaluationAgent": {
        id: 'evaluationAgent',
        name: 'Evaluation Agent',
        description:
            'Evaluates and scores agent performance and content quality',
        category: 'utility',
        features: {
            ...defaultFeatures,
            reasoning: true,
            chainOfThought: true,
            tools: true,
            artifacts: true,
            task: true,
            plan: true,
        },
    },
    "learningExtractionAgent": {
        id: 'learningExtractionAgent',
        name: 'Learning Extraction Agent',
        description: 'Extracts learnings and insights from content',
        category: 'utility',
        features: {
            ...defaultFeatures,
            reasoning: true,
            tools: true,
            task: true,
            plan: true,
        },
    },
    "daneNewContributor": {
        id: 'daneNewContributor',
        name: 'Dane New Contributor',
        description: 'Helps new contributors get started with the project',
        category: 'utility',
        features: { ...defaultFeatures, tools: true, task: true, plan: true },
    },

    // Business & Legal Agents
    "legalResearchAgent": {
        id: 'legalResearchAgent',
        name: 'Legal Research Agent',
        description:
            'Conducts thorough research using authoritative legal sources',
        category: 'business',
        features: {
            ...defaultFeatures,
            reasoning: true,
            tools: true,
            sources: true,
            task: true,
            plan: true,
        },
    },
    "contractAnalysisAgent": {
        id: 'contractAnalysisAgent',
        name: 'Contract Analysis Agent',
        description:
            'Reviews and analyzes legal documents for risks and compliance',
        category: 'business',
        features: {
            ...defaultFeatures,
            reasoning: true,
            tools: true,
            artifacts: true,
            task: true,
            plan: true,
        },
    },
    "complianceMonitoringAgent": {
        id: 'complianceMonitoringAgent',
        name: 'Compliance Monitoring Agent',
        description: 'Monitors regulatory compliance and identifies risks',
        category: 'business',
        features: {
            ...defaultFeatures,
            reasoning: true,
            tools: true,
            task: true,
            plan: true,
        },
    },
    "businessStrategyAgent": {
        id: 'businessStrategyAgent',
        name: 'Business Strategy Agent',
        description: 'Coordinates legal compliance with business objectives',
        category: 'business',
        features: {
            ...defaultFeatures,
            reasoning: true,
            tools: true,
            task: true,
            plan: true,
        },
    },

    // Coding Team Agents
    "codeArchitectAgent": {
        id: 'codeArchitectAgent',
        name: 'Code Architect Agent',
        description:
            'Expert in software architecture, design patterns, and implementation planning',
        category: 'coding',
        features: {
            ...defaultFeatures,
            reasoning: true,
            tools: true,
            chainOfThought: true,
            task: true,
            plan: true,
        },
    },
    "codeReviewerAgent": {
        id: 'codeReviewerAgent',
        name: 'Code Reviewer Agent',
        description:
            'Expert code reviewer focusing on quality, security, and best practices',
        category: 'coding',
        features: {
            ...defaultFeatures,
            reasoning: true,
            tools: true,
            task: true,
            plan: true,
        },
    },
    "testEngineerAgent": {
        id: 'testEngineerAgent',
        name: 'Test Engineer Agent',
        description:
            'Expert in test generation, coverage analysis, and testing strategies',
        category: 'coding',
        features: {
            ...defaultFeatures,
            reasoning: true,
            tools: true,
            task: true,
            plan: true,
        },
    },
    "refactoringAgent": {
        id: 'refactoringAgent',
        name: 'Refactoring Agent',
        description:
            'Expert in safe code refactoring, optimization, and quality improvement',
        category: 'coding',
        features: {
            ...defaultFeatures,
            reasoning: true,
            tools: true,
            task: true,
            plan: true,
        },
    },
    "codingTeamNetwork": {
        id: 'codingTeamNetwork',
        name: 'Coding Team Network',
        description: 'Network of coding agents for collaborative development',
        category: 'coding',
        features: { ...defaultFeatures, chainOfThought: true, tools: true },
    },

    // Additional Utility Agents
    "acpAgent": {
        id: 'acpAgent',
        name: 'ACP Agent',
        description:
            'Assistant for managing ACP-related tasks and data operations',
        category: 'utility',
        features: { ...defaultFeatures, tools: true, task: true, plan: true },
    },
    "daneCommitMessage": {
        id: 'daneCommitMessage',
        name: 'Dane Commit Message',
        description: 'Generate commit messages for engineers',
        category: 'utility',
        features: { ...defaultFeatures, tools: false },
    },
    "daneIssueLabeler": {
        id: 'daneIssueLabeler',
        name: 'Dane Issue Labeler',
        description: 'Label issues based on their content',
        category: 'utility',
        features: { ...defaultFeatures, tools: false },
    },
    "daneLinkChecker": {
        id: 'daneLinkChecker',
        name: 'Dane Link Checker',
        description: 'Check links for broken links',
        category: 'utility',
        features: { ...defaultFeatures, tools: false },
    },
    "daneChangeLog": {
        id: 'daneChangeLog',
        name: 'Dane Package Publisher',
        description: 'Publish packages to npm',
        category: 'utility',
        features: { ...defaultFeatures, tools: false },
    },
    "dane": {
        id: 'dane',
        name: 'Dane',
        description: 'Personal assistant and best friend',
        category: 'utility',
        features: { ...defaultFeatures, tools: true },
    },
    "calendarAgent": {
        id: 'calendarAgent',
        name: 'Calendar Agent',
        description:
            'A helpful calendar assistant that can view, analyze, and help manage your schedule',
        category: 'utility',
        features: { ...defaultFeatures, tools: true },
    },
    "danePackagePublisher": {
        id: 'danePackagePublisher',
        name: 'Dane Package Publisher',
        description: 'Specialized agent for managing pnpm package publications',
        category: 'utility',
        features: { ...defaultFeatures, tools: true },
    },
    "imageAgent": {
        id: 'imageAgent',
        name: 'Image Generator',
        description: 'Expert in generating images based on user requirements',
        category: 'diagram',
        features: { ...defaultFeatures, tools: false, images: true },
    },

    // Misc Utility Agents
    "bgColorAgent": {
        id: 'bgColorAgent',
        name: 'Background Color Agent',
        description: 'Suggests accessible color palettes and background suggestions',
        category: 'utility',
        features: { ...defaultFeatures, tools: true, artifacts: true, images: true },
    },
    "noteTakerAgent": {
        id: 'noteTakerAgent',
        name: 'Note Taker',
        description: 'Creates meeting notes and concise summaries, and stores them into memory',
        category: 'utility',
        features: {
            ...defaultFeatures,
            tools: true,
            artifacts: true,
            task: true,
            plan: true,
        },
    },

    // A2A / Coordinator Agents
    "a2aCoordinatorAgent": {
        id: 'a2aCoordinatorAgent',
        name: 'A2A Coordinator',
        description: 'Coordinates agent-to-agent orchestration and task routing',
        category: 'utility',
        features: {
            ...defaultFeatures,
            chainOfThought: true,
            tools: true,
            task: true,
            plan: true,
        },
    },
    "codingA2ACoordinator": {
        id: 'codingA2ACoordinator',
        name: 'Coding A2A Coordinator',
        description: 'Coordinates coding agents and code review workflows',
        category: 'coding',
        features: {
            ...defaultFeatures,
            chainOfThought: true,
            tools: true,
            task: true,
            plan: true,
        },
    },

    // Network entries referenced by Mastra setup
    "dataPipelineNetwork": {
        id: 'dataPipelineNetwork',
        name: 'Data Pipeline Network',
        description: 'Orchestrates data pipeline agents for ingestion and export',
        category: 'data',
        features: { ...defaultFeatures, chainOfThought: true, tools: true },
    },
    "reportGenerationNetwork": {
        id: 'reportGenerationNetwork',
        name: 'Report Generation Network',
        description: 'Orchestrates agents that create and format reports',
        category: 'content',
        features: { ...defaultFeatures, chainOfThought: true, tools: true },
    },
    "researchPipelineNetwork": {
        id: 'researchPipelineNetwork',
        name: 'Research Pipeline Network',
        description: 'Routes research requests through specialized research agents',
        category: 'research',
        features: { ...defaultFeatures, chainOfThought: true, tools: true, sources: true },
    },
    "contentCreationNetwork": {
        id: 'contentCreationNetwork',
        name: 'Content Creation Network',
        description: 'Coordinates content production agents and workflows',
        category: 'content',
        features: { ...defaultFeatures, chainOfThought: true, tools: true, artifacts: true },
    },
    "financialIntelligenceNetwork": {
        id: 'financialIntelligenceNetwork',
        name: 'Financial Intelligence Network',
        description: 'Routes financial analysis tasks to the correct agents',
        category: 'financial',
        features: { ...defaultFeatures, chainOfThought: true, tools: true, sources: true },
    },
    "learningNetwork": {
        id: 'learningNetwork',
        name: 'Learning Network',
        description: 'Coordinates learning-extraction and study agents',
        category: 'utility',
        features: { ...defaultFeatures, chainOfThought: true, tools: true, artifacts: true },
    },
    "marketingAutomationNetwork": {
        id: 'marketingAutomationNetwork',
        name: 'Marketing Automation Network',
        description: 'Orchestrates marketing and automation agents',
        category: 'content',
        features: { ...defaultFeatures, chainOfThought: true, tools: true },
    },
    "devopsNetwork": {
        id: 'devopsNetwork',
        name: 'DevOps Network',
        description: 'Orchestrates DevOps-related agents and automation',
        category: 'utility',
        features: { ...defaultFeatures, chainOfThought: true, tools: true },
    },
    "businessIntelligenceNetwork": {
        id: 'businessIntelligenceNetwork',
        name: 'Business Intelligence Network',
        description: 'Coordinates business intelligence and analytics agents',
        category: 'business',
        features: { ...defaultFeatures, chainOfThought: true, tools: true },
    },
    "securityNetwork": {
        id: 'securityNetwork',
        name: 'Security Network',
        description: 'Routes security-related tasks to monitoring and analysis agents',
        category: 'utility',
        features: { ...defaultFeatures, chainOfThought: true, tools: true },
    },
}

export const DEFAULT_AGENT_ID = Object.keys(AGENT_CONFIGS)[0] || 'weatherAgent'

export const CATEGORY_LABELS: Record<AgentCategory, string> = {
    core: 'Core',
    research: 'Research & Documents',
    content: 'Content Creation',
    data: 'Data Pipeline',
    financial: 'Financial Analysis',
    diagram: 'Diagrams & Visuals',
    utility: 'Utilities',
    business: 'Business & Legal',
    coding: 'Coding Team',
}

export const CATEGORY_ORDER: AgentCategory[] = [
    'core',
    'research',
    'content',
    'data',
    'financial',
    'diagram',
    'utility',
    'business',
    'coding',
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
        business: [],
        coding: [],
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
