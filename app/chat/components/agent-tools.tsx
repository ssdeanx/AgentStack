"use client"

import {
  Tool,
  ToolHeader,
  ToolContent,
  ToolInput,
  ToolOutput,
} from "@/src/components/ai-elements/tool"
import type { ToolInvocationState } from "../providers/chat-context"
import type { DynamicToolUIPart } from "ai"
import { cn } from "@/lib/utils"

export interface AgentToolsProps {
  tools: Array<ToolInvocationState | DynamicToolUIPart>
  className?: string
}

const toolDisplayNames: Record<string, string> = {
  weatherTool: "Weather",
  webScraperTool: "Web Scraper",
  googleNewsTool: "Google News",
  googleScholarTool: "Google Scholar",
  arxivTool: "arXiv Search",
  polygonStockQuotesTool: "Stock Quotes",
  finnhubAnalysisTool: "Analyst Ratings",
  pdfToMarkdownTool: "PDF Parser",
}

function formatToolName(toolName: string): string {
  if (toolDisplayNames[toolName]) {return toolDisplayNames[toolName]}
  return toolName
    .replace(/Tool$/, "")
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (s) => s.toUpperCase())
    .trim()
}

export function AgentTools({ tools, className }: AgentToolsProps) {
  if (!tools || tools.length === 0) {return null}

  return (
    <div className={cn("space-y-2 mt-2", className)}>
      {tools.map((tool) => {
        const toolName = tool.toolName ?? "unknown"
        const displayName = formatToolName(toolName)
        const toolState = tool.state
        const hasOutput = toolState === "output-available" || toolState === "output-error"
        const errorText = toolState === "output-error"
          ? (tool as unknown as { errorText?: string }).errorText
          : undefined

        return (
          <Tool
            key={tool.toolCallId}
            defaultOpen={toolState === "output-error"}
          >
            <ToolHeader
              title={displayName}
              type={`tool-${toolName}`}
              state={toolState}
            />
            <ToolContent>
              <ToolInput input={tool.input} />
              {hasOutput && (
                <ToolOutput
                  output={toolState === "output-available" ? tool.output : undefined}
                  errorText={errorText}
                />
              )}
            </ToolContent>
          </Tool>
        )
      })}
    </div>
  )
}
