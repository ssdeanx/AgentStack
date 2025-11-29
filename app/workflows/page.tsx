"use client"

import { useState } from "react"
import Link from "next/link"
import { Canvas } from "@/src/components/ai-elements/canvas"
import { Connection } from "@/src/components/ai-elements/connection"
import { Controls } from "@/src/components/ai-elements/controls"
import { Edge } from "@/src/components/ai-elements/edge"
import {
  Node,
  NodeContent,
  NodeDescription,
  NodeFooter,
  NodeHeader,
  NodeTitle,
} from "@/src/components/ai-elements/node"
import { Panel } from "@/src/components/ai-elements/panel"
import { Toolbar } from "@/src/components/ai-elements/toolbar"
import { Button } from "@/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/ui/select"
import { Badge } from "@/ui/badge"
import {
  ArrowLeftIcon,
  PlayIcon,
  RefreshCwIcon,
  InfoIcon,
  CheckCircle2Icon,
  CircleDotIcon,
  CircleIcon,
} from "lucide-react"

// Workflow definitions with their steps
const WORKFLOWS = {
  weatherWorkflow: {
    id: "weatherWorkflow",
    name: "Weather Workflow",
    description: "Fetches weather and suggests activities",
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
}

type WorkflowKey = keyof typeof WORKFLOWS

// Generate nodes from workflow steps
function generateNodes(workflowId: WorkflowKey) {
  const workflow = WORKFLOWS[workflowId]
  const nodeSpacing = 350

  return workflow.steps.map((step, index) => ({
    id: step.id,
    type: "workflow",
    position: { x: index * nodeSpacing, y: 0 },
    data: {
      label: step.label,
      description: step.description,
      handles: {
        target: index > 0,
        source: index < workflow.steps.length - 1,
      },
      content: step.content,
      footer: step.footer,
      stepIndex: index,
      totalSteps: workflow.steps.length,
    },
  }))
}

// Generate edges connecting workflow steps
function generateEdges(workflowId: WorkflowKey) {
  const workflow = WORKFLOWS[workflowId]

  return workflow.steps.slice(0, -1).map((step, index) => ({
    id: `edge-${index}`,
    source: step.id,
    target: workflow.steps[index + 1].id,
    type: "animated",
  }))
}

// Custom node component
const nodeTypes = {
  workflow: ({
    data,
  }: {
    data: {
      label: string
      description: string
      handles: { target: boolean; source: boolean }
      content: string
      footer: string
      stepIndex: number
      totalSteps: number
    }
  }) => (
    <Node handles={data.handles} className="w-[280px]">
      <NodeHeader>
        <div className="flex items-center justify-between w-full">
          <NodeTitle className="text-sm font-semibold">{data.label}</NodeTitle>
          <Badge variant="outline" className="text-xs">
            {data.stepIndex + 1}/{data.totalSteps}
          </Badge>
        </div>
        <NodeDescription className="text-xs">{data.description}</NodeDescription>
      </NodeHeader>
      <NodeContent>
        <p className="text-sm text-muted-foreground">{data.content}</p>
      </NodeContent>
      <NodeFooter>
        <p className="text-muted-foreground text-xs font-mono">{data.footer}</p>
      </NodeFooter>
      <Toolbar>
        <Button size="sm" variant="ghost" className="h-7 px-2 text-xs">
          <InfoIcon className="size-3 mr-1" />
          Details
        </Button>
        <Button size="sm" variant="ghost" className="h-7 px-2 text-xs">
          <PlayIcon className="size-3 mr-1" />
          Run Step
        </Button>
      </Toolbar>
    </Node>
  ),
}

const edgeTypes = {
  animated: Edge.Animated,
  temporary: Edge.Temporary,
}

export default function WorkflowsPage() {
  const [selectedWorkflow, setSelectedWorkflow] = useState<WorkflowKey>("contentStudioWorkflow")
  const [isRunning, setIsRunning] = useState(false)

  const workflow = WORKFLOWS[selectedWorkflow]
  const nodes = generateNodes(selectedWorkflow)
  const edges = generateEdges(selectedWorkflow)

  const handleRunWorkflow = () => {
    setIsRunning(true)
    // Simulate workflow execution
    setTimeout(() => setIsRunning(false), 3000)
  }

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-border px-6 py-4">
        <div className="flex items-center gap-4">
          <Link href="/">
            <Button variant="ghost" size="sm">
              <ArrowLeftIcon className="size-4 mr-2" />
              Back
            </Button>
          </Link>
          <div className="h-6 w-px bg-border" />
          <div>
            <h1 className="text-xl font-semibold">Workflow Visualization</h1>
            <p className="text-sm text-muted-foreground">
              Interactive view of {Object.keys(WORKFLOWS).length} Mastra workflows
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Select
            value={selectedWorkflow}
            onValueChange={(value) => setSelectedWorkflow(value as WorkflowKey)}
          >
            <SelectTrigger className="w-[250px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.values(WORKFLOWS).map((wf) => (
                <SelectItem key={wf.id} value={wf.id}>
                  <div className="flex items-center gap-2">
                    <span>{wf.name}</span>
                    <Badge variant="secondary" className="text-xs">
                      {wf.steps.length} steps
                    </Badge>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button onClick={handleRunWorkflow} disabled={isRunning}>
            {isRunning ? (
              <>
                <RefreshCwIcon className="size-4 mr-2 animate-spin" />
                Running...
              </>
            ) : (
              <>
                <PlayIcon className="size-4 mr-2" />
                Run Workflow
              </>
            )}
          </Button>
        </div>
      </header>

      {/* Canvas */}
      <div className="flex-1">
        <Canvas
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          connectionLineComponent={Connection}
          fitView
          fitViewOptions={{ padding: 0.3 }}
        >
          <Controls />

          {/* Info Panel */}
          <Panel position="top-left">
            <div className="rounded-lg border bg-card p-4 shadow-sm max-w-xs">
              <h3 className="font-semibold text-sm">{workflow.name}</h3>
              <p className="text-xs text-muted-foreground mt-1">
                {workflow.description}
              </p>
              <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <CircleIcon className="size-3" />
                  <span>{workflow.steps.length} steps</span>
                </div>
                <div className="flex items-center gap-1">
                  {isRunning ? (
                    <>
                      <CircleDotIcon className="size-3 text-yellow-500" />
                      <span className="text-yellow-500">Running</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2Icon className="size-3 text-green-500" />
                      <span className="text-green-500">Ready</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </Panel>

          {/* Legend */}
          <Panel position="bottom-left">
            <div className="rounded-lg border bg-card p-3 shadow-sm">
              <p className="text-xs font-medium mb-2">Legend</p>
              <div className="space-y-1.5 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-0.5 bg-primary rounded" />
                  <span>Data flow</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                  <span>Active step</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-0.5 border-t border-dashed border-muted-foreground" />
                  <span>Conditional path</span>
                </div>
              </div>
            </div>
          </Panel>

          {/* Actions */}
          <Panel position="top-right">
            <div className="flex gap-2">
              <Button size="sm" variant="outline">
                Export SVG
              </Button>
              <Button size="sm" variant="outline">
                View Code
              </Button>
            </div>
          </Panel>
        </Canvas>
      </div>
    </div>
  )
}
