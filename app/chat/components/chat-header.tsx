"use client"

import { Button } from "@/ui/button"
import {
  ModelSelector,
  ModelSelectorTrigger,
  ModelSelectorContent,
  ModelSelectorInput,
  ModelSelectorList,
  ModelSelectorGroup,
  ModelSelectorItem,
  ModelSelectorEmpty,
  ModelSelectorName,
} from "@/src/components/ai-elements/model-selector"
import {
  Context,
  ContextTrigger,
  ContextContent,
  ContextContentHeader,
  ContextContentBody,
  ContextContentFooter,
  ContextInputUsage,
  ContextOutputUsage,
} from "@/src/components/ai-elements/context"
import { useChatContext } from "@/app/chat/providers/chat-context"
import {
  getAgentsByCategory,
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  type AgentConfig,
} from "@/app/chat/config/agents"
import { CheckIcon, MessageSquareIcon, Trash2Icon } from "lucide-react"
import { useMemo, useState } from "react"

const DEFAULT_MAX_TOKENS = 128000

export function ChatHeader() {
  const { selectedAgent, selectAgent, clearMessages, agentConfig, messages, usage } =
    useChatContext()
  const [open, setOpen] = useState(false)

  const agentsByCategory = useMemo(() => getAgentsByCategory(), [])

  const handleSelectAgent = (agent: AgentConfig) => {
    selectAgent(agent.id)
    setOpen(false)
  }

  const usedTokens = usage ? usage.inputTokens + usage.outputTokens : 0

  return (
    <header className="flex items-center justify-between border-b border-border px-4 py-3">
      <div className="flex items-center gap-3">
        <MessageSquareIcon className="size-5 text-muted-foreground" />
        <div className="flex flex-col">
          <span className="font-semibold text-sm">AgentStack Chat</span>
          <span className="text-muted-foreground text-xs">
            {agentConfig?.description || "AI-powered assistant"}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {usage && usedTokens > 0 && (
          <Context
            usedTokens={usedTokens}
            maxTokens={DEFAULT_MAX_TOKENS}
            usage={{
              inputTokens: usage.inputTokens,
              outputTokens: usage.outputTokens,
              totalTokens: usage.totalTokens,
            }}
          >
            <ContextTrigger />
            <ContextContent align="end">
              <ContextContentHeader />
              <ContextContentBody className="space-y-1">
                <ContextInputUsage />
                <ContextOutputUsage />
              </ContextContentBody>
              <ContextContentFooter />
            </ContextContent>
          </Context>
        )}

        <ModelSelector open={open} onOpenChange={setOpen}>
          <ModelSelectorTrigger asChild>
            <Button variant="outline" size="sm" className="min-w-[180px] justify-between">
              <span className="truncate">{agentConfig?.name || selectedAgent}</span>
            </Button>
          </ModelSelectorTrigger>
          <ModelSelectorContent className="w-[320px]">
            <ModelSelectorInput placeholder="Search agents..." />
            <ModelSelectorList className="max-h-[400px]">
              <ModelSelectorEmpty>No agents found.</ModelSelectorEmpty>
              {CATEGORY_ORDER.map((category) => {
                const agents = agentsByCategory[category]
                if (agents.length === 0) return null

                return (
                  <ModelSelectorGroup
                    key={category}
                    heading={CATEGORY_LABELS[category]}
                  >
                    {agents.map((agent) => (
                      <ModelSelectorItem
                        key={agent.id}
                        value={agent.id}
                        onSelect={() => handleSelectAgent(agent)}
                        className="flex items-center justify-between"
                      >
                        <div className="flex flex-col gap-0.5">
                          <ModelSelectorName>{agent.name}</ModelSelectorName>
                          <span className="text-muted-foreground text-xs line-clamp-1">
                            {agent.description}
                          </span>
                        </div>
                        {selectedAgent === agent.id && (
                          <CheckIcon className="size-4 text-primary" />
                        )}
                      </ModelSelectorItem>
                    ))}
                  </ModelSelectorGroup>
                )
              })}
            </ModelSelectorList>
          </ModelSelectorContent>
        </ModelSelector>

        {messages.length > 0 && (
          <Button
            variant="ghost"
            size="icon"
            onClick={clearMessages}
            title="Clear conversation"
          >
            <Trash2Icon className="size-4" />
          </Button>
        )}
      </div>
    </header>
  )
}
