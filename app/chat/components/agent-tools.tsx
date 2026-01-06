"use client"

import {
  Tool,
  ToolHeader,
  ToolContent,
  ToolInput,
  ToolOutput,
} from "@/src/components/ai-elements/tool"
import type { ToolInvocationState } from "../providers/chat-context-types"
import type { DynamicToolUIPart } from "ai"
import { cn } from "@/lib/utils"
import { useMemo } from "react"
import type { AgentToolsProps } from "./chat.types"

// Import custom tool components
import {
  WebScraperTool,
  BatchWebScraperTool,
  SiteMapExtractorTool,
  LinkExtractorTool,
  type WebScraperUITool,
  type BatchWebScraperUITool,
  type SiteMapExtractorUITool,
  type LinkExtractorUITool
} from "@/src/components/ai-elements/tools"

function getProgressMessage(tool: ToolInvocationState | DynamicToolUIPart): string | null {
  const { input } = tool
  if (input !== null && typeof input === "object" && Object.prototype.hasOwnProperty.call(input, "message")) {
    const msg = (input as { message?: unknown }).message
    if (typeof msg === "string" && msg.trim().length > 0) {
      return msg.trim()
    }
  }
  return null
}

function formatToolName(toolName: string): string {
  const normalized = toolName
    .replace(/Tool$/, "")
    .replace(/[:/_-]+/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .trim()

  return normalized.length > 0
    ? normalized.replace(/^./, (s) => s.toUpperCase())
    : "Tool"
}

export function AgentTools({ tools, className }: AgentToolsProps) {
  const groups = useMemo(() => {
    const grouped = new Map<string, Array<ToolInvocationState | DynamicToolUIPart>>()
    const order: string[] = []

    for (const tool of tools) {
      const id = tool.toolCallId
      if (!grouped.has(id)) {
        grouped.set(id, [])
        order.push(id)
      }
      grouped.get(id)?.push(tool)
    }

    return order.map((id) => ({ id, items: grouped.get(id) ?? [] }))
  }, [tools])

  if (groups.length === 0) {return null}

  return (
    <div className={cn("space-y-2 mt-2", className)}>
      {groups.map(({ id, items }, groupIdx) => {
        if (items.length === 0) {return null}
        const latest = items[items.length - 1]

        const toolNameFromDynamic = (latest as { toolName?: unknown }).toolName
        const toolName =
          (typeof toolNameFromDynamic === "string" && toolNameFromDynamic.trim().length > 0
            ? toolNameFromDynamic
            : undefined) ??
          (typeof (latest as { type?: unknown }).type === "string" &&
          ((latest as { type: string }).type).startsWith("tool-")
            ? (latest as { type: string }).type.slice("tool-".length)
            : "unknown")
        const displayName = formatToolName(toolName)
        const toolState = latest.state
        const hasOutput = toolState === "output-available" || toolState === "output-error"
        const errorText =
          toolState === "output-error"
            ? (latest as unknown as { errorText?: string }).errorText
            : undefined

        const progressMessages = items
          .map(getProgressMessage)
          .filter((m): m is string => typeof m === "string" && m.length > 0)

        // Check if this is a web scraper tool and render custom component
        if (toolName === "web:scraper" && hasOutput) {
          return (
            <WebScraperTool
              key={`${id}-${toolName}-${toolState}-${groupIdx}`}
              toolCallId={id}
              input={latest.input as WebScraperUITool["input"]}
              output={latest.output as WebScraperUITool["output"]}
              errorText={errorText}
            />
          )
        }

        if (toolName === "batch-web-scraper" && hasOutput) {
          return (
            <BatchWebScraperTool
              key={`${id}-${toolName}-${toolState}-${groupIdx}`}
              toolCallId={id}
              input={latest.input as BatchWebScraperUITool["input"]}
              output={latest.output as BatchWebScraperUITool["output"]}
              errorText={errorText}
            />
          )
        }

        if (toolName === "site-map-extractor" && hasOutput) {
          return (
            <SiteMapExtractorTool
              key={`${id}-${toolName}-${toolState}-${groupIdx}`}
              toolCallId={id}
              input={latest.input as SiteMapExtractorUITool["input"]}
              output={latest.output as SiteMapExtractorUITool["output"]}
              errorText={errorText}
            />
          )
        }

        if (toolName === "link-extractor" && hasOutput) {
          return (
            <LinkExtractorTool
              key={`${id}-${toolName}-${toolState}-${groupIdx}`}
              toolCallId={id}
              input={latest.input as LinkExtractorUITool["input"]}
              output={latest.output as LinkExtractorUITool["output"]}
              errorText={errorText}
            />
          )
        }

        // Default rendering for other tools
        return (
          <Tool
            key={`${id}-${toolName}-${toolState}-${groupIdx}`}
            defaultOpen={toolState === "output-error"}
          >
            <ToolHeader
              title={displayName}
              type={`tool-${toolName}`}
              state={toolState}
            />
            <ToolContent>
              {progressMessages.length > 0 && (
                <div className="rounded-md border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                  <div className="font-medium text-foreground/80">Progress</div>
                  <ul className="mt-1 space-y-1">
                    {progressMessages.slice(-6).map((msg, idx) => (
                      <li key={`${id}-progress-${idx}`} className="truncate">
                        {msg}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <ToolInput input={latest.input} />
              {hasOutput && (
                <ToolOutput
                  output={toolState === "output-available" ? latest.output : undefined}
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
