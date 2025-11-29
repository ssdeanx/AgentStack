"use client"

import {
  Tool,
  ToolHeader,
  ToolContent,
  ToolInput,
  ToolOutput,
} from "@/src/components/ai-elements/tool"
import type { ToolInvocationState } from "@/app/chat/providers/chat-context"
import type { DynamicToolUIPart } from "ai"

export interface AgentToolsProps {
  tools: (ToolInvocationState | DynamicToolUIPart)[]
}

export function AgentTools({ tools }: AgentToolsProps) {
  if (!tools || tools.length === 0) return null

  return (
    <div className="space-y-2">
      {tools.map((tool) => {
        const t = tool as ToolInvocationState
        const toolName = t.toolName || t.type?.replace(/^(tool-|dynamic-tool)/, "") || "unknown"
        const toolType = `tool-${toolName}` as const

        return (
          <Tool key={t.toolCallId} defaultOpen={false}>
            <ToolHeader
              title={toolName}
              type={toolType}
              state={t.state}
            />
            <ToolContent>
              <ToolInput input={t.input} />
              {(t.state === "output-available" || t.state === "output-error") && (
                <ToolOutput
                  output={t.state === "output-available" ? t.output : undefined}
                  errorText={t.state === "output-error" ? t.errorText : undefined}
                />
              )}
            </ToolContent>
          </Tool>
        )
      })}
    </div>
  )
}
