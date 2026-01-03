"use client"

import {
  PromptInput,
  PromptInputTextarea,
  PromptInputFooter,
  PromptInputTools,
  PromptInputButton,
  PromptInputSubmit,
  PromptInputAttachments,
  PromptInputAttachment,
  PromptInputHeader,
  PromptInputBody,
  PromptInputActionMenu,
  PromptInputActionMenuTrigger,
  PromptInputActionMenuContent,
  PromptInputActionAddAttachments,
  PromptInputSpeechButton,
} from "@/src/components/ai-elements/prompt-input"
import {
  ModelSelector,
  ModelSelectorTrigger,
  ModelSelectorContent,
  ModelSelectorInput,
  ModelSelectorList,
  ModelSelectorEmpty,
  ModelSelectorGroup,
  ModelSelectorItem,
} from "@/src/components/ai-elements/model-selector"
import {
  Context,
  ContextTrigger,
  ContextContent,
  ContextContentHeader,
  ContextContentBody,
  ContextInputUsage,
  ContextOutputUsage,
} from "@/src/components/ai-elements/context"
import { useChatContext } from "@/app/chat/providers/chat-context"
import { AgentSuggestions } from "./agent-suggestions"
import { getSuggestionsForAgent } from "./chat.utils"
import { Badge } from "@/ui/badge"
import {
  PaperclipIcon,
  SquareIcon,
  BotIcon,
  CpuIcon,
  MicIcon,
  SparklesIcon,
  ListTodoIcon,
} from "lucide-react"
import { useMemo, useState, useRef } from "react"
import { MODEL_CONFIGS } from "../config/models"
import { getAgentsByCategory, CATEGORY_ORDER, CATEGORY_LABELS } from "../config/agents"
import { cn } from "@/lib/utils"

export function ChatInput() {
  const {
    sendMessage,
    stopGeneration,
    isLoading,
    status,
    agentConfig,
    selectedAgent,
    selectedModel,
    selectModel,
    selectAgent,
    messages,
    usage,
    createCheckpoint,
  } = useChatContext()

  const [input, setInput] = useState("")
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const supportsFiles = agentConfig?.features.fileUpload ?? false
  const showSuggestions = messages.length === 0 && !isLoading
  const totalTokens = usage ? usage.inputTokens + usage.outputTokens : 0

  const suggestions = useMemo(
    () => getSuggestionsForAgent(selectedAgent),
    [selectedAgent]
  )

  const agentsByCategory = useMemo(() => getAgentsByCategory(), [])

  /* Agent Selector - compact dropdown in input toolbar */
  
  // Model Selector
  

  const handleSubmit = async (message: { text: string; files: unknown[] }) => {
    if (message.text.trim()) {
      sendMessage(message.text, message.files as File[])
      setInput("")
    }
  }

  const handleSuggestionClick = (suggestion: string) => {
    sendMessage(suggestion)
  }

  return (
    <footer className="border-t border-border p-4">
      <div className="mx-auto max-w-4xl space-y-3">
        {showSuggestions && (
          <AgentSuggestions
            suggestions={suggestions}
            onSelect={handleSuggestionClick}
            disabled={isLoading}
          />
        )}

        {/* Compact status bar */}
        <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5">
              <BotIcon className="size-3" />
              {agentConfig?.name ?? selectedAgent}
            </span>
            <span className="flex items-center gap-1.5">
              <CpuIcon className="size-3" />
              {selectedModel.name}
            </span>
          </div>
          {totalTokens > 0 && (
            <Badge variant="secondary" className="text-xs font-normal">
              {totalTokens.toLocaleString()} tokens
            </Badge>
          )}
        </div>

        <PromptInput
          onSubmit={handleSubmit}
          className="rounded-lg border shadow-sm"
          accept={supportsFiles ? "image/*,.pdf,.txt,.csv,.json,.md" : undefined}
          multiple={supportsFiles}
          globalDrop
        >
          <PromptInputHeader>
            {supportsFiles && (
              <PromptInputAttachments>
                {(file) => (
                  <PromptInputAttachment key={file.id} data={file} />
                )}
              </PromptInputAttachments>
            )}
          </PromptInputHeader>

          <PromptInputBody>
            <PromptInputTextarea
              placeholder={`Message ${agentConfig?.name ?? "Agent"}...`}
              disabled={isLoading}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              ref={textareaRef}
            />
          </PromptInputBody>

          <PromptInputFooter>
            <PromptInputTools>
              <PromptInputActionMenu>
                <PromptInputActionMenuTrigger>
                  <PaperclipIcon className="size-4" />
                </PromptInputActionMenuTrigger>
                <PromptInputActionMenuContent>
                  <PromptInputActionAddAttachments />
                </PromptInputActionMenuContent>
              </PromptInputActionMenu>

              <PromptInputSpeechButton
                onTranscriptionChange={setInput}
                textareaRef={textareaRef}
              >
                <MicIcon className="size-4" />
              </PromptInputSpeechButton>

              <PromptInputButton
                onClick={() => {
                  if (messages.length > 0) {
                    createCheckpoint(messages.length - 1)
                  }
                }}
                disabled={messages.length === 0}
                title="Create checkpoint"
              >
                <ListTodoIcon className="size-4" />
              </PromptInputButton>

              {/* Agent Selector */}
              <ModelSelector>
                <ModelSelectorTrigger asChild>
                  <PromptInputButton title="Select agent">
                    <BotIcon className="size-4" />
                    <span className="hidden sm:inline ml-1 text-xs">
                      {agentConfig?.name ?? selectedAgent}
                    </span>
                  </PromptInputButton>
                </ModelSelectorTrigger>
                <ModelSelectorContent>
                  <ModelSelectorInput placeholder="Search agents..." />
                  <ModelSelectorList>
                    <ModelSelectorEmpty>No agents found.</ModelSelectorEmpty>
                    {CATEGORY_ORDER.map((category) => {
                      const agents = agentsByCategory[category]
                      if (agents.length === 0) {return null}

                      return (
                        <ModelSelectorGroup key={category} heading={CATEGORY_LABELS[category]}>
                          {agents.map((agent) => (
                            <ModelSelectorItem
                              key={agent.id}
                              onSelect={() => selectAgent(agent.id)}
                              className={cn(selectedAgent === agent.id && "bg-accent")}
                            >
                              {agent.name}
                            </ModelSelectorItem>
                          ))}
                        </ModelSelectorGroup>
                      )
                    })}
                  </ModelSelectorList>
                </ModelSelectorContent>
              </ModelSelector>

              {/* Model Selector */}
              <ModelSelector>
                <ModelSelectorTrigger asChild>
                  <PromptInputButton title="Select model">
                    <SparklesIcon className="size-4" />
                    <span className="hidden sm:inline ml-1 text-xs">
                      {selectedModel.name.split(" ")[0]}
                    </span>
                  </PromptInputButton>
                </ModelSelectorTrigger>
                <ModelSelectorContent>
                  <ModelSelectorInput placeholder="Search models..." />
                  <ModelSelectorList>
                    <ModelSelectorEmpty>No models found.</ModelSelectorEmpty>
                    <ModelSelectorGroup heading="Available Models">
                      {MODEL_CONFIGS.map((model) => (
                        <ModelSelectorItem
                          key={model.id}
                          onSelect={() => selectModel(model.id)}
                          className={cn(selectedModel.id === model.id && "bg-accent")}
                        >
                          {model.name} ({model.provider})
                        </ModelSelectorItem>
                      ))}
                    </ModelSelectorGroup>
                  </ModelSelectorList>
                </ModelSelectorContent>
              </ModelSelector>

              {/* Context/Token Usage */}
              <Context
                usedTokens={totalTokens}
                maxTokens={selectedModel.contextWindow}
              >
                <ContextTrigger />
                <ContextContent>
                  <ContextContentHeader />
                  <ContextContentBody>
                    <ContextInputUsage />
                    <ContextOutputUsage />
                  </ContextContentBody>
                </ContextContent>
              </Context>

              {isLoading && (
                <PromptInputButton
                  onClick={stopGeneration}
                  variant="ghost"
                  title="Stop generation"
                >
                  <SquareIcon className="size-4" />
                </PromptInputButton>
              )}
            </PromptInputTools>
            <PromptInputSubmit
              status={status}
              disabled={isLoading && status !== "streaming"}
            />
          </PromptInputFooter>
        </PromptInput>
      </div>
    </footer>
  )
}
