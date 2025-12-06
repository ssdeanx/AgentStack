"use client"

import {
  Tool,
  ToolHeader,
  ToolContent,
  ToolInput,
  ToolOutput,
} from "@/src/components/ai-elements/tool"
import type { ToolInvocationState } from "../providers/chat-context"
import type { DynamicToolUIPart, ToolUIPart } from "ai"

export interface AgentToolsProps {
  tools: Array<ToolInvocationState | DynamicToolUIPart>
}

type ToolState = ToolUIPart["state"]

export function AgentTools({ tools }: AgentToolsProps) {
  if (!tools || tools.length === 0) {return null}

  return (
    <div className="space-y-2 mt-2">
      {tools.map((tool) => {
        const t = tool
        const toolName = t.toolName || "unknown"
        const toolType = `tool-${toolName}`
        const toolState = t.state

        const hasOutput = toolState === "output-available" || toolState === "output-error"
        const errorText = toolState === "output-error" ? (t as unknown as { errorText?: string }).errorText : undefined

        return (
          <Tool key={t.toolCallId} defaultOpen={false}>
            <ToolHeader
              title={toolName}
              type={toolType}
              state={toolState}
            />
            <ToolContent>
              <ToolInput input={t.input} />
              {hasOutput && (
                <ToolOutput
                  output={toolState === "output-available" ? t.output : undefined}
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
