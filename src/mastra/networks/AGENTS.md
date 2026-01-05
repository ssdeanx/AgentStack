<!-- AGENTS-META {"title":"Mastra Networks","version":"2.0.0","applies_to":"/src/mastra/networks","last_updated":"2025-11-26T00:00:00Z","status":"stable"} -->

# Agent Networks (`/src/mastra/networks`)

## Persona

Network Architect — objective: Design and implement agent routing networks that coordinate multiple specialized agents.

## Purpose

Networks are routing agents that coordinate multiple specialized agents to handle complex tasks. They analyze requests and delegate to the most appropriate agent or workflow.

## Current Networks (13 files)

| File                              | Export                         | Purpose                                                                | Agents Coordinated                                                                                      | Workflows Integrated                                                    |
| --------------------------------- | ------------------------------ | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `index.ts`                        | `agentNetwork`                 | Primary network: routes to research, stock, weather, content agents    | research, stockAnalysis, weather, copywriter, editor, report                                            | weatherWorkflow                                                         |
| `dataPipelineNetwork.ts`          | `dataPipelineNetwork`          | Data processing: CSV/JSON operations, import/export/transform          | dataExport, dataIngestion, dataTransformation, report                                                   | stockAnalysisWorkflow                                                   |
| `reportGenerationNetwork.ts`      | `reportGenerationNetwork`      | Report coordination: research → transform → report workflows           | dataIngestion, dataTransformation, research, report                                                     | weatherWorkflow, financialReport, researchSynthesis, learningExtraction |
| `researchPipelineNetwork.ts`      | `researchPipelineNetwork`      | Research lifecycle: arXiv → PDF → chunk → index → query                | researchPaper, documentProcessing, knowledgeIndexing, research                                          | documentProcessingWorkflow, contentReviewWorkflow                       |
| `contentCreationNetwork.ts`       | `contentCreationNetwork`       | Content creation: writing, editing, strategy, scripting                | copywriter, editor, contentStrategist, scriptWriter, evaluation                                         | contentStudioWorkflow, contentReviewWorkflow                            |
| `codingTeamNetwork.ts`            | `codingTeamNetwork`            | Software development: architecture, review, testing, refactoring       | codeArchitect, codeReviewer, testEngineer, refactoring, documentProcessing, knowledgeIndexing           | repoIngestionWorkflow, specGenerationWorkflow                           |
| `financialIntelligenceNetwork.ts` | `financialIntelligenceNetwork` | Financial analysis: stocks, charts, market intelligence                | stockAnalysis, research, chartSupervisor, chartDataProcessor, chartGenerator, chartTypeAdvisor, report  | financialReportWorkflow, stockAnalysisWorkflow                          |
| `learningNetwork.ts`              | `learningNetwork`              | Educational content: learning extraction, knowledge indexing, research | learningExtraction, knowledgeIndexing, research, documentProcessing, evaluation                         | learningExtractionWorkflow, researchSynthesisWorkflow                   |
| `marketingAutomationNetwork.ts`   | `marketingAutomationNetwork`   | Marketing campaigns: content, SEO, social media, global expansion      | socialMedia, seo, copywriter, contentStrategist, research, translation                                  | contentStudioWorkflow, contentReviewWorkflow                            |
| `devopsNetwork.ts`                | `devopsNetwork`                | DevOps lifecycle: development, testing, deployment, monitoring         | codeArchitect, codeReviewer, testEngineer, refactoring, packagePublisher, projectManagement, evaluation | repoIngestionWorkflow, specGenerationWorkflow                           |
| `businessIntelligenceNetwork.ts`  | `businessIntelligenceNetwork`  | Business intelligence: data analysis, visualization, insights          | dataIngestion, dataTransformation, report, stockAnalysis, research, evaluation, chartSupervisor         | financialReportWorkflow, stockAnalysisWorkflow                          |
| `securityNetwork.ts`              | `securityNetwork`              | Security assessment: code review, compliance, vulnerability management | codeReviewer, evaluation, research, report                                                              | -                                                                       |

## Network Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     agentNetwork (Primary)                      │
│  Routes: research | stock | weather | content | general         │
└─────────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
┌───────────────┐   ┌──────────────────┐   ┌────────────────────┐
│dataPipelineNet│   │reportGenerationNet│   │researchPipelineNet │
│               │   │                  │   │                    │
│ CSV/JSON ops  │   │ Multi-source     │   │ arXiv → Index      │
│ Import/Export │   │ Report workflows │   │ PDF → RAG          │
└───────────────┘   └──────────────────┘   └────────────────────┘
        │                     │                     │
        └─────────────────────┼─────────────────────┘
                              ▼
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
┌───────────────┐   ┌──────────────────┐   ┌────────────────────┐
│contentCreation│   │codingTeamNetwork│   │financialIntelNet   │
│Network        │   │                  │   │                    │
│ Writing/Editing│   │ Dev workflows   │   │ Market analysis    │
│ Strategy/Script│   │ Code review     │   │ Charts/Reports     │
└───────────────┘   └──────────────────┘   └────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
┌───────────────┐   ┌──────────────────┐   ┌────────────────────┐
│marketingAuto  │   │   devopsNetwork  │   │businessIntelNet    │
│Network        │   │                  │   │                    │
│ Campaign orch │   │ CI/CD pipelines  │   │ Data analytics     │
│ Content/SEO   │   │ Infrastructure   │   │ Visualization      │
└───────────────┘   └──────────────────┘   └────────────────────┘
        │                     │                     │
        └─────────────────────┼─────────────────────┘
                              ▼
                    ┌─────────────────────┐
                    │   learningNetwork   │
                    │                     │
                    │ Educational content │
                    │ Knowledge indexing │
                    │ Learning extraction│
                    └─────────────────────┘
                              │
                              ▼
                    ┌─────────────────────┐
                    │  securityNetwork    │
                    │                     │
                    │ Code security       │
                    │ Compliance          │
                    │ Vulnerability mgmt  │
                    └─────────────────────┘
```

## How Networks Work

1. **Request Analysis**: Network analyzes user intent and keywords
2. **Agent Selection**: Routes to most appropriate specialist agent
3. **Workflow Integration**: Can invoke workflows for multi-step tasks
4. **Result Synthesis**: Combines agent outputs into unified response

## Routing Triggers

### agentNetwork

- **Research**: "research", "find out", "learn about"
- **Stock Analysis**: "stock", "crypto", "market", "finance"
- **Weather**: "weather" + "what to do"
- **Content**: "write", "copywrite", "edit"

### dataPipelineNetwork

- **Export**: "export", "create csv", "save as csv"
- **Import**: "import", "read csv", "parse csv"
- **Transform**: "convert", "transform", "restructure"

### reportGenerationNetwork

- **Research Report**: topic research → synthesis
- **Data Analysis**: import → transform → report
- **Financial Report**: multi-source financial data

### researchPipelineNetwork

- **Paper Search**: arXiv search and download
- **Document Processing**: PDF → markdown → chunks
- **Knowledge Indexing**: vector store indexing

### contentCreationNetwork

- **Content Writing**: blog posts, marketing copy, articles
- **Content Editing**: proofreading, style improvement, clarity
- **Content Strategy**: audience analysis, SEO optimization
- **Script Writing**: video scripts, presentations, dialogue

### codingTeamNetwork

- **Architecture**: system design, technical specifications
- **Code Review**: quality assessment, bug detection, best practices
- **Testing**: test planning, automation, coverage analysis
- **Refactoring**: code improvement, optimization, maintainability

### financialIntelligenceNetwork

- **Stock Analysis**: technical/fundamental analysis, recommendations
- **Market Research**: news analysis, economic indicators
- **Chart Generation**: financial visualizations, technical charts
- **Financial Reports**: comprehensive market intelligence

### learningNetwork

- **Learning Extraction**: key insights from educational content
- **Knowledge Indexing**: building searchable knowledge bases
- **Research Synthesis**: multi-topic educational research
- **Content Evaluation**: quality assessment of learning materials

### marketingAutomationNetwork

- **Campaign Strategy**: multi-channel marketing orchestration
- **Content Marketing**: SEO-optimized content creation pipeline
- **Social Media Automation**: platform-specific content and scheduling
- **Global Marketing**: multilingual campaign management

### devopsNetwork

- **CI/CD Pipeline**: automated build, test, and deployment
- **Infrastructure as Code**: automated infrastructure management
- **Monitoring & Observability**: system health and performance tracking
- **Security Integration**: DevSecOps practices and compliance

### businessIntelligenceNetwork

- **Data Integration**: automated data ingestion and transformation
- **Analytics & Insights**: descriptive, predictive, and prescriptive analytics
- **Visualization & Reporting**: interactive dashboards and automated reports
- **Business Intelligence**: strategic insights and decision support

### securityNetwork

- **Code Security**: SAST, SCA, and secrets detection
- **Compliance Management**: regulatory compliance and audit preparation
- **Vulnerability Management**: automated scanning and remediation
- **Threat Detection**: security monitoring and incident response

## How to add a network

1. Create network file in `src/mastra/networks/` following the established pattern:
    - Import required agents and workflows
    - Define clear routing instructions with agent capabilities and triggers
    - Include workflow patterns for complex multi-step tasks
    - Add comprehensive guidelines for agent coordination

2. Export from `index.ts`

3. Register in `src/mastra/index.ts` networks object

4. Update AGENTS.md documentation with new network details

## Best practices

- Keep routing logic clear and deterministic
- Use specific trigger keywords for each agent
- Chain agents for complex multi-step workflows
- Preserve context when passing between agents
- Log routing decisions for debugging

---

## Change Log

| Version | Date (UTC) | Changes                                                       |
| ------- | ---------- | ------------------------------------------------------------- |
| 2.0.0   | 2025-11-26 | Major update: 4 networks with workflows, architecture diagram |
| 1.0.0   | 2025-11-14 | Initial version with agentNetwork                             |
