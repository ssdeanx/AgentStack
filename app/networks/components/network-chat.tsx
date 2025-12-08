"use client"

import { Fragment, useCallback, useMemo, useRef, useState } from "react"
import { useNetworkContext, type ToolInvocationState } from "@/app/networks/providers/network-context"
import type { UIMessage, TextUIPart, ReasoningUIPart, DynamicToolUIPart, ToolUIPart, SourceUrlUIPart, FileUIPart } from "ai"
import { AgentTool } from "@/ui/agent-tool"
import type { AgentDataPart } from "@mastra/ai-sdk"
import {
  NetworkIcon,
  CopyIcon,
  BookmarkIcon,
  ListTodoIcon,
  CodeIcon,
  ExternalLinkIcon,
  RefreshCcwIcon,
  ThumbsUpIcon,
  ThumbsDownIcon,
  BotIcon,
  SparklesIcon,
  MicIcon,
  PaperclipIcon,
} from "lucide-react"
import type { BundledLanguage } from "shiki"
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/src/components/ai-elements/conversation"
import {
  Message,
  MessageContent,
  MessageResponse,
  MessageActions,
  MessageAction,
} from "@/src/components/ai-elements/message"
import {
  PromptInput,
  PromptInputTextarea,
  PromptInputSubmit,
  PromptInputFooter,
  PromptInputTools,
  PromptInputBody,
  PromptInputHeader,
  PromptInputAttachments,
  PromptInputAttachment,
  PromptInputActionMenu,
  PromptInputActionMenuTrigger,
  PromptInputActionMenuContent,
  PromptInputActionAddAttachments,
  PromptInputSpeechButton,
  PromptInputButton,
  PromptInputSelect,
  PromptInputSelectTrigger,
  PromptInputSelectContent,
  PromptInputSelectItem,
  PromptInputSelectValue,
  type PromptInputMessage,
} from "@/src/components/ai-elements/prompt-input"
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from "@/src/components/ai-elements/reasoning"
import {
  Tool,
  ToolHeader,
  ToolContent,
  ToolInput,
  ToolOutput,
} from "@/src/components/ai-elements/tool"
import {
  Sources,
  SourcesTrigger,
  SourcesContent,
  Source,
} from "@/src/components/ai-elements/sources"
import { Suggestions, Suggestion } from "@/src/components/ai-elements/suggestion"
import { Loader } from "@/src/components/ai-elements/loader"
import { CodeBlock, CodeBlockCopyButton } from "@/src/components/ai-elements/code-block"
import {
  ChainOfThought,
  ChainOfThoughtHeader,
  ChainOfThoughtContent,
  ChainOfThoughtStep,
  ChainOfThoughtSearchResults,
  ChainOfThoughtSearchResult,
} from "@/src/components/ai-elements/chain-of-thought"
import {
  Artifact,
  ArtifactHeader,
  ArtifactTitle,
  ArtifactContent,
  ArtifactActions,
  ArtifactAction,
  ArtifactClose,
} from "@/src/components/ai-elements/artifact"
import {
  Plan,
  PlanHeader,
  PlanTitle,
  PlanDescription,
  PlanContent,
  PlanTrigger,
  PlanAction,
} from "@/src/components/ai-elements/plan"
import {
  Task,
  TaskTrigger,
  TaskContent,
  TaskItem,
} from "@/src/components/ai-elements/task"
import {
  Queue,
  QueueItem,
  QueueItemIndicator,
  QueueItemContent,
  QueueList,
  QueueSection,
  QueueSectionTrigger,
  QueueSectionLabel,
  QueueSectionContent,
} from "@/src/components/ai-elements/queue"
import {
  Checkpoint,
  CheckpointIcon,
  CheckpointTrigger,
} from "@/src/components/ai-elements/checkpoint"
import {
  WebPreview,
  WebPreviewNavigation,
  WebPreviewUrl,
  WebPreviewBody,
} from "@/src/components/ai-elements/web-preview"
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
  Confirmation,
  ConfirmationTitle,
  ConfirmationAccepted,
  ConfirmationRejected,
  ConfirmationActions,
  ConfirmationAction,
} from "@/src/components/ai-elements/confirmation"
import {
  Context,
  ContextTrigger,
  ContextContent,
  ContextContentHeader,
  ContextContentBody,
  ContextInputUsage,
  ContextOutputUsage,
} from "@/src/components/ai-elements/context"
import {
  InlineCitation,
  InlineCitationText,
  InlineCitationCard,
  InlineCitationCardTrigger,
  InlineCitationCardBody,
} from "@/src/components/ai-elements/inline-citation"
import { Shimmer } from "@/src/components/ai-elements/shimmer"
import { Image as AIImage } from "@/src/components/ai-elements/image"
import { NETWORK_CONFIGS } from "@/app/networks/config/networks"
import { Badge } from "@/ui/badge"
import { Button } from "@/ui/button"
import { cn } from "@/lib/utils"

const NETWORK_SUGGESTIONS: Record<string, string[]> = {
  agentNetwork: [
    "Research the latest AI trends",
    "Write a blog post about TypeScript",
    "What's the weather in Tokyo?",
  ],
  dataPipelineNetwork: [
    "Parse this CSV file",
    "Transform JSON to XML",
    "Export data to markdown",
  ],
  reportGenerationNetwork: [
    "Generate a market analysis report",
    "Create a technical documentation",
    "Summarize research findings",
  ],
  researchPipelineNetwork: [
    "Find papers on machine learning",
    "Research quantum computing advances",
    "Index this document for search",
  ],
}

// Helper to detect and render code blocks from tool output
interface CodeOutput {
  code?: string
  content?: string
  result?: string
  language?: string
}

function CodeOutputDisplay({ output }: { output?: CodeOutput }) {
  if (!output) {return null}

  // Check if output contains code
  const code = output?.code ?? output?.content ?? output?.result
  const language = output?.language ?? "typescript"

  if (typeof code === "string" && code.length > 50 && (code.includes("function") || code.includes("const ") || code.includes("import ") || code.includes("export "))) {
    return (
      <CodeBlock code={code} language={language as BundledLanguage}>
        <CodeBlockCopyButton />
      </CodeBlock>
    )
  }

  return null
}

// Helper to render artifact for generated content
function ArtifactDisplay({
  title,
  content,
  onClose
}: {
  title: string
  content: string
  onClose?: () => void
}) {
  return (
    <Artifact className="my-4">
      <ArtifactHeader>
        <ArtifactTitle>{title}</ArtifactTitle>
        <ArtifactActions>
          <ArtifactAction
            tooltip="Copy"
            icon={CopyIcon}
            onClick={() => navigator.clipboard.writeText(content)}
          />
          {onClose && <ArtifactClose onClick={onClose} />}
        </ArtifactActions>
      </ArtifactHeader>
      <ArtifactContent>
        <div className="prose prose-sm dark:prose-invert max-w-none">
          {content}
        </div>
      </ArtifactContent>
    </Artifact>
  )
}

// Helper to render web preview for URLs
function WebPreviewDisplay({ url, title }: { url: string; title?: string }) {
  if (!url) {return null}

  return (
    <div className="my-4 h-[400px] w-full">
      {title && <div className="text-sm font-medium mb-2">{title}</div>}
      <WebPreview defaultUrl={url}>
        <WebPreviewNavigation>
          <WebPreviewUrl />
        </WebPreviewNavigation>
        <WebPreviewBody />
      </WebPreview>
    </div>
  )
}

// Helper to render plan from structured data
function PlanDisplay({
  title,
  description,
  steps,
  isStreaming
}: {
  title: string
  description?: string
  steps?: string[]
  isStreaming?: boolean
}) {
  return (
    <Plan isStreaming={isStreaming} defaultOpen>
      <PlanHeader>
        <div>
          <PlanTitle>{title}</PlanTitle>
          {description?.trim() && <PlanDescription>{description}</PlanDescription>}
        </div>
        <PlanAction>
          <PlanTrigger />
        </PlanAction>
      </PlanHeader>
      {steps && steps.length > 0 && (
        <PlanContent>
          <Queue>
            <QueueList>
              {steps.map((step, i) => (
                <QueueItem key={i}>
                  <div className="flex items-center gap-2">
                    <QueueItemIndicator />
                    <QueueItemContent>{step}</QueueItemContent>
                  </div>
                </QueueItem>
              ))}
            </QueueList>
          </Queue>
        </PlanContent>
      )}
    </Plan>
  )
}

// Helper to render task list
function TaskListDisplay({ title, tasks }: { title: string; tasks: Array<{ name: string; completed?: boolean }> }) {
  return (
    <Task>
      <TaskTrigger title={title} />
      <TaskContent>
        {tasks.map((task, i) => (
          <TaskItem key={i}>
            <span className={task.completed === true ? "line-through text-muted-foreground" : ""}>
              {task.name}
            </span>
          </TaskItem>
        ))}
      </TaskContent>
    </Task>
  )
}

function NetworkToolDisplay({ tools, setPendingToolConfirmation }: { tools: ToolInvocationState[], setPendingToolConfirmation: React.Dispatch<React.SetStateAction<{ toolName: string; input: any; onAccept: () => void; onReject: () => void } | null>> }) {
  if (!tools.length) {return null}

  return (
    <div className="space-y-2 mt-2">
      {tools.map((tool) => {
        const toolName = tool.toolName || "unknown"
        const toolType = `tool-${toolName}`
        const toolState = tool.state
        const hasOutput = toolState === "output-available" || toolState === "output-error"

        if (toolState === "input-available") {
          setPendingToolConfirmation({
            toolName,
            input: tool.input,
            onAccept: () => {},
            onReject: () => setPendingToolConfirmation(null)
          })
        }

        return (
          <Tool key={tool.toolCallId} defaultOpen={false}>
            <ToolHeader
              title={toolName}
              type={toolType as ToolUIPart["type"]}
              state={toolState}
            />
            <ToolContent>
              <ToolInput input={tool.input} />
              {hasOutput && (
                <ToolOutput
                  output={tool.output}
                  errorText={tool.errorText}
                />
              )}
            </ToolContent>
          </Tool>
        )
      })}
    </div>
  )
}

function NetworkMessageParts({ message, isLastMessage, isStreaming }: {
  message: UIMessage
  isLastMessage: boolean
  isStreaming: boolean
}) {
  if (!message.parts?.length) {
    return null
  }

  // Collect sources for this message
  const sourceParts = message.parts.filter((p): p is SourceUrlUIPart => p.type === "source-url")

  // Collect tool parts for this message
  const toolParts: ToolInvocationState[] = []
  for (const p of message.parts) {
    if (p.type === "dynamic-tool") {
      toolParts.push(p as ToolInvocationState)
    } else if (typeof p.type === "string" && (p.type.startsWith("data-tool") || p.type === "data-network")) {
      // Convert Mastra parts to dynamic-tool format
      const payload = (p as any).data ?? p
      const inner = payload?.data ?? payload
      toolParts.push({
        type: "dynamic-tool",
        toolCallId: inner?.toolCallId ?? inner?.id ?? `tool-${Date.now()}`,
        toolName: inner?.toolName ?? inner?.name ?? inner?.agentName ?? "network-step",
        input: inner?.input ?? inner?.args,
        output: inner?.output ?? inner?.result,
        errorText: inner?.errorText ?? inner?.error,
        state: inner?.output ? "output-available" : "input-available",
      } as ToolInvocationState)
    }
  }

  return (
    <>
      {/* Sources at top of message */}
      {sourceParts.length > 0 && message.role === "assistant" && (
        <Sources>
          <SourcesTrigger count={sourceParts.length} />
          <SourcesContent>
            {sourceParts.map((src, i) => (
              <Source key={`${message.id}-source-${i}`} href={src.url} title={src.title ?? src.url} />
            ))}
          </SourcesContent>
        </Sources>
      )}

      {/* Main message parts */}
      {message.parts.map((part, i) => {
        const key = `${message.id}-${i}`

        switch (part.type) {
          case "text":
            { const {text} = part

            if (!text) { return null }

            // Check if text contains structured plan data (e.g., markdown headers with steps)
            const hasPlanStructure = text.includes("## Plan") || text.includes("### Steps")
            const hasTaskStructure = text.includes("- [ ]") || text.includes("- [x]")
            const hasArtifactStructure = text.includes("```") && text.length > 500

            // Extract URLs for inline citations
            const urlMatches = text.match(/\[([^\]]+)\]\((https?:\/\/[^\\)]+)\)/g)
            const extractedCitations = urlMatches?.map(match => {
              const textMatch = /\[([^\]]+)\]/.exec(match)
              const urlMatch = /\((https?:\/\/[^\\)]+)\)/.exec(match)
              return { text: textMatch?.[1] ?? "", url: urlMatch?.[1] ?? "" }
            })

            // Extract tasks from markdown checkboxes
            const taskMatches = text.match(/- \[([ x])\] (.+)/g)
            const extractedTasks = taskMatches?.map(match => {
              const completed = match.includes("[x]")
              const name = match.replace(/- \[[ x]\] /, "")
              return { name, completed }
            })

            return (
              <Fragment key={key}>
                <MessageResponse>
                  {text}
                </MessageResponse>

                {/* Show inline citations for URLs in text */}
                {extractedCitations && extractedCitations.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {extractedCitations.slice(0, 3).map((citation, ci) => (
                      <InlineCitation key={ci}>
                        <InlineCitationCard>
                          <InlineCitationCardTrigger sources={[citation.url]}>
                            <InlineCitationText>{citation.text}</InlineCitationText>
                          </InlineCitationCardTrigger>
                          <InlineCitationCardBody>
                            <a href={citation.url} target="_blank" rel="noopener noreferrer" className="text-xs hover:underline">
                              {citation.url}
                            </a>
                          </InlineCitationCardBody>
                        </InlineCitationCard>
                      </InlineCitation>
                    ))}
                  </div>
                )}

                {/* Show TaskListDisplay if we detected task checkboxes */}
                {hasTaskStructure && extractedTasks && extractedTasks.length > 0 && (
                  <TaskListDisplay title="Tasks" tasks={extractedTasks} />
                )}

                {/* Show PlanDisplay if we detected plan structure */}
                {hasPlanStructure && (
                  <PlanDisplay
                    title="Execution Plan"
                    description="Generated plan for your request"
                    steps={text.split("\n").filter(line => /^\d+\.|^-|^•/.exec(line)).slice(0, 5)}
                    isStreaming={isStreaming && isLastMessage}
                  />
                )}

                {/* Show ArtifactDisplay for long code-heavy content */}
                {hasArtifactStructure && (
                  <ArtifactDisplay
                    title="Generated Content"
                    content={text}
                  />
                )}
              </Fragment>
            ) }

          case "reasoning":
            { const reasoningPart: ReasoningUIPart = part
            return (
              <Reasoning
                key={key}
                className="w-full"
                isStreaming={isStreaming && i === message.parts.length - 1 && isLastMessage}
              >
                <ReasoningTrigger />
                <ReasoningContent>{reasoningPart.text}</ReasoningContent>
              </Reasoning>
            ) }

          case "source-url":
            // Already handled above
            return null

          case "file":
            // Handle file/image parts with AIImage
            { const filePart: FileUIPart = part
            const fileData = filePart as { mediaType?: string; uint8Array?: Uint8Array; filename?: string };
            if (fileData.mediaType?.startsWith("image/") && Boolean(fileData.uint8Array)) {
              const uint8Array = fileData.uint8Array ?? new Uint8Array()
              const base64 = btoa(String.fromCharCode(...uint8Array))
              return (
                <AIImage
                  key={key}
                  uint8Array={uint8Array}
                  base64={base64}
                  mediaType={fileData.mediaType}
                  alt={fileData.filename ?? "Generated image"}
                  className="max-w-md rounded-lg"
                />
              )
            }
            return null }

          case "step-start": { throw new Error('Not implemented yet: "step-start" case') }
          case "dynamic-tool": { throw new Error('Not implemented yet: "dynamic-tool" case') }
          case "source-document": { throw new Error('Not implemented yet: "source-document" case') }
          case "data-tool-agent":
            // Handle agent tool executions specifically
            return <AgentTool key={key} {...(part as { data: AgentDataPart }).data} />
          default:
            // Handle tool invocations - check for tool-* patterns
            if (typeof part.type === "string" && part.type.startsWith("tool-")) {
              const toolPart = part as unknown as DynamicToolUIPart
              const toolName = toolPart.toolName || "unknown"
              const toolType = `tool-${toolName}`
              const toolState = toolPart.state
              const hasOutput = toolState === "output-available" || toolState === "output-error"

              return (
                <Tool key={key} defaultOpen={false}>
                  <ToolHeader
                    title={toolName}
                     type={toolType as ToolUIPart["type"]}
                    state={toolState}
                  />
                  <ToolContent>
                    <ToolInput input={toolPart.input} />
                    {hasOutput && (
                      <>
                        <ToolOutput
                          output={toolPart.output}
                          errorText={toolPart.errorText}
                        />
                        <CodeOutputDisplay output={toolPart.output as CodeOutput} />
                      </>
                    )}
                  </ToolContent>
                </Tool>
              )
            }

            // Handle Mastra data-tool-* and data-network parts
            if (typeof part.type === "string" && (part.type.startsWith("data-tool") || part.type === "data-network")) {
              const payload = ((part as Record<string, unknown>).data) ?? part
              const inner = ((payload as Record<string, unknown>).data) ?? payload
              const toolName = (inner as Record<string, unknown>)?.toolName as string ?? (inner as Record<string, unknown>)?.name as string ?? (inner as Record<string, unknown>)?.agentName as string ?? "network-step"
              const toolState = ((inner as Record<string, unknown>)?.output !== null) ? "output-available" as const : "input-available" as const

              return (
                <Tool key={key} defaultOpen={false}>
                  <ToolHeader
                    title={toolName}
                    type={`tool-${toolName}`}
                    state={toolState}
                  />
                  <ToolContent>
                    <ToolInput input={(inner as Record<string, unknown>)?.input ?? (inner as Record<string, unknown>)?.args} />
                    {(Boolean(((inner as Record<string, unknown>)?.output))) && (
                      <>
                        <ToolOutput
                          output={(inner as Record<string, unknown>).output}
                          errorText={(inner as Record<string, unknown>)?.errorText as string | undefined}
                        />
                        <CodeOutputDisplay output={(inner as Record<string, unknown>).output as CodeOutput} />
                      </>
                    )}
                  </ToolContent>
                </Tool>
              )
            }

            return null
        }
      })}
    </>
  )
}

function NetworkMessage({
  message,
  isLastMessage,
  isStreaming,
}: {
  message: UIMessage
  isLastMessage: boolean
  isStreaming: boolean
}) {
  const textPart = message.parts?.find((p): p is TextUIPart => p.type === "text")

  return (
    <Fragment key={message.id}>
      <Message from={message.role}>
        <MessageContent>
          <NetworkMessageParts
            message={message}
            isLastMessage={isLastMessage}
            isStreaming={isStreaming}
          />
        </MessageContent>
      </Message>

      {message.role === "assistant" && isLastMessage && !isStreaming && textPart && (
        <MessageActions>
          <MessageAction
            onClick={() => navigator.clipboard.writeText(textPart.text)}
            label="Copy"
            tooltip="Copy to clipboard"
          >
            <CopyIcon className="size-3" />
          </MessageAction>
          <MessageAction
            label="Regenerate"
            tooltip="Regenerate response"
          >
            <RefreshCcwIcon className="size-3" />
          </MessageAction>
          <MessageAction
            label="Like"
            tooltip="Helpful response"
          >
            <ThumbsUpIcon className="size-3" />
          </MessageAction>
          <MessageAction
            label="Dislike"
            tooltip="Not helpful"
          >
            <ThumbsDownIcon className="size-3" />
          </MessageAction>
          <MessageAction
            label="Bookmark"
            tooltip="Save to bookmarks"
          >
            <BookmarkIcon className="size-3" />
          </MessageAction>
          <MessageAction
            label="View Code"
            tooltip="View as code"
          >
            <CodeIcon className="size-3" />
          </MessageAction>
        </MessageActions>
      )}
    </Fragment>
  )
}

export function NetworkChat() {
  const {
    selectedNetwork,
    networkConfig,
    networkStatus,
    messages,
    sources,
    toolInvocations,
    error,
    selectNetwork,
    sendMessage,
    stopExecution,
    clearHistory,
  } = useNetworkContext()

  const [input, setInput] = useState("")
  const [checkpoints, setCheckpoints] = useState<number[]>([])
  const [showWebPreview, setShowWebPreview] = useState<string | null>(null)
  const [selectedModel, setSelectedModel] = useState("gemini-2.0-flash")
  const [pendingToolConfirmation, setPendingToolConfirmation] = useState<{
    toolName: string
    input: Record<string, unknown>
    onAccept: () => void
    onReject: () => void
  } | null>(null)
  const [tokenUsage, setTokenUsage] = useState({ input: 0, output: 0 })
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Available models for selection
  const availableModels = useMemo(() => [
    { id: "gemini-2.5-flash-lite", name: "Gemini 2.5 Flash Lite", provider: "google" },
    { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash", provider: "google" },
    { id: "gemini-2.5-pro-latest", name: "Gemini 2.5 Flash", provider: "gemini" },
    { id: "gpt-4o", name: "GPT-4o", provider: "openai" },
    { id: "gpt-5-mini", name: "GPT-4o Mini", provider: "OpenAI" },
    { id: "gpt-5", name: "GPT-5", provider: "OpenAI" },
    { id: "claude-4-5-sonnet-20240229", name: "Claude 3.5 Sonnet", provider: "Anthropic" },
    { id: "claude-sonnet-4-20250514", name: "Claude Sonnet 4", provider: "Anthropic" },
    { id: "deepseek-r1", name: "DeepSeek R1", provider: "DeepSeek" },
  ], [])

  const handleCreateCheckpoint = useCallback((messageIndex: number) => {
    setCheckpoints(prev => [...prev, messageIndex])
  }, [])

  const handleRestoreCheckpoint = useCallback((messageIndex: number) => {
    setCheckpoints(prev => prev.filter(cp => cp <= messageIndex))
  }, [])

  const isStreaming = networkStatus === "executing" || networkStatus === "routing"

  const networkOptions = useMemo(() =>
    Object.values(NETWORK_CONFIGS).map((config) => ({
      id: config.id,
      name: config.name,
      description: config.description,
    })),
    []
  )

  const suggestions = useMemo(() =>
    NETWORK_SUGGESTIONS[selectedNetwork] ?? [],
    [selectedNetwork]
  )

  const handleSubmit = (msg: PromptInputMessage) => {
    if (!msg.text?.trim()) {return}
    sendMessage(msg.text.trim())
    setInput("")
    setTokenUsage(prev => ({ ...prev, input: prev.input + msg.text.length }))
  }

  const handleSuggestionClick = (suggestion: string) => {
    sendMessage(suggestion)
  }

  const status = useMemo(() => {
    if (isStreaming) {return "streaming" as const}
    return "ready" as const
  }, [isStreaming])

  return (
    <div className="flex h-full flex-col">
      <Conversation className="flex-1">
        <ConversationContent>
          {messages.length === 0 && !isStreaming ? (
            <ConversationEmptyState
              icon={<NetworkIcon className="size-12" />}
              title="Start a Network Chat"
              description={`Send a message to ${networkConfig?.name ?? "the network"} to route through specialized agents`}
            >
              {/* Network agents info */}
              {networkConfig && (
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  {networkConfig.agents.slice(0, 5).map((agent) => (
                    <Badge key={agent.id} variant="secondary" className="gap-1">
                      <BotIcon className="size-3" />
                      {agent.name}
                    </Badge>
                  ))}
                  {networkConfig.agents.length > 5 && (
                    <Badge variant="outline">+{networkConfig.agents.length - 5} more</Badge>
                  )}
                </div>
              )}

              {/* Suggestions for empty state */}
              {suggestions.length > 0 && (
                <div className="mt-6">
                  <p className="mb-3 text-muted-foreground text-xs">Try asking:</p>
                  <Suggestions>
                    {suggestions.map((suggestion) => (
                      <Suggestion
                        key={suggestion}
                        suggestion={suggestion}
                        onClick={handleSuggestionClick}
                      />
                    ))}
                  </Suggestions>
                </div>
              )}
            </ConversationEmptyState>
          ) : (
            <>
              {messages.map((message, idx) => (
                <Fragment key={message.id}>
                  <NetworkMessage
                    message={message}
                    isLastMessage={idx === messages.length - 1}
                    isStreaming={isStreaming}
                  />
                  {/* Show checkpoint if this message index is in checkpoints */}
                  {checkpoints.includes(idx) && (
                    <Checkpoint>
                      <CheckpointIcon>
                        <BookmarkIcon className="size-4" />
                      </CheckpointIcon>
                      <CheckpointTrigger onClick={() => handleRestoreCheckpoint(idx)}>
                        Restore to this checkpoint
                      </CheckpointTrigger>
                    </Checkpoint>
                  )}
                </Fragment>
              ))}

              {/* Show tool invocations from context */}
              {toolInvocations?.length > 0 && (
                <NetworkToolDisplay tools={toolInvocations} setPendingToolConfirmation={setPendingToolConfirmation} />
              )}

              {isStreaming && messages.length > 0 && !messages[messages.length - 1]?.parts?.some(p => p.type === "text") && (
                <div className="space-y-3">
                  <ChainOfThought defaultOpen>
                    <ChainOfThoughtHeader>
                      <SparklesIcon className="size-4 mr-2" />
                      {networkStatus === "routing" ? "Routing request..." : "Processing with agents..."}
                    </ChainOfThoughtHeader>
                    <ChainOfThoughtContent>
                      <ChainOfThoughtStep
                        label="Analyzing request"
                        status="complete"
                      />
                      <ChainOfThoughtStep
                        label={networkStatus === "routing" ? "Selecting best agent..." : "Executing agent task..."}
                        status="active"
                        description="Finding the optimal agent for your query"
                      >
                        <ChainOfThoughtSearchResults>
                          {networkConfig?.agents.slice(0, 3).map((agent) => (
                            <ChainOfThoughtSearchResult key={agent.id}>
                              {agent.name}
                            </ChainOfThoughtSearchResult>
                          ))}
                        </ChainOfThoughtSearchResults>
                      </ChainOfThoughtStep>
                    </ChainOfThoughtContent>
                  </ChainOfThought>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader size={16} />
                    <Shimmer duration={2}>
                      {networkStatus === "routing" ? "Routing to agents..." : "Processing..."}
                    </Shimmer>
                  </div>
                </div>
              )}
            </>
          )}

          {(Boolean(error)) && (
            <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-destructive text-sm">
              {error}
            </div>
          )}

          {/* Show sources from network context in a QueueSection */}
          {sources.length > 0 && (
            <QueueSection defaultOpen>
              <QueueSectionTrigger>
                <QueueSectionLabel label="Sources" count={sources.length} icon={<ExternalLinkIcon className="size-4" />} />
              </QueueSectionTrigger>
              <QueueSectionContent>
                <QueueList>
                  {sources.map((source, i) => (
                    <QueueItem key={i}>
                      <QueueItemIndicator completed />
                      <QueueItemContent>
                        <a href={source.url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                          {source.title}
                        </a>
                      </QueueItemContent>
                    </QueueItem>
                  ))}
                </QueueList>
              </QueueSectionContent>
            </QueueSection>
          )}

          {/* Show WebPreview when enabled */}
          {(Boolean(showWebPreview)) && (
            <WebPreviewDisplay url={showWebPreview!} />
          )}

          {/* Pending tool confirmation dialog */}
          {pendingToolConfirmation && (
            <Confirmation state="output-available" approval={{ id: "pending", approved: true }}>
              <ConfirmationTitle>
                Tool "{pendingToolConfirmation.toolName}" wants to execute
              </ConfirmationTitle>
              <ConfirmationAccepted>
                <div className="text-sm text-green-600">Tool approved</div>
              </ConfirmationAccepted>
              <ConfirmationRejected>
                <div className="text-sm text-red-600">Tool rejected</div>
              </ConfirmationRejected>
              <ConfirmationActions>
                <ConfirmationAction variant="outline" onClick={pendingToolConfirmation.onReject}>
                  Reject
                </ConfirmationAction>
                <ConfirmationAction onClick={pendingToolConfirmation.onAccept}>
                  Approve
                </ConfirmationAction>
              </ConfirmationActions>
            </Confirmation>
          )}

          {/* Clear history button */}
          {messages.length > 0 && !isStreaming && (
            <div className="flex justify-center pt-4">
              <Button variant="outline" size="sm" onClick={clearHistory}>
                Clear conversation
              </Button>
            </div>
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <div className="border-t p-4">
        <PromptInput
          onSubmit={handleSubmit}
          className="mx-auto max-w-4xl"
          accept="image/*,.pdf,.csv,.json,.txt,.md"
          multiple
          globalDrop
        >
          <PromptInputHeader>
            <PromptInputAttachments>
              {(attachment) => <PromptInputAttachment data={attachment} />}
            </PromptInputAttachments>
          </PromptInputHeader>
          <PromptInputBody>
            <PromptInputTextarea
              onChange={(e) => setInput(e.target.value)}
              ref={textareaRef}
              value={input}
              placeholder={`Ask ${networkConfig?.name ?? "the network"} anything...`}
              disabled={isStreaming}
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
                onClick={() => setShowWebPreview(showWebPreview === null || showWebPreview === "" ? "https://mastra.ai" : null)}
                className={cn((Boolean(showWebPreview)) && "bg-accent")}
              >
                <ExternalLinkIcon className="size-4" />
              </PromptInputButton>
              <PromptInputButton
                onClick={() => {
                  if (messages.length > 0) {handleCreateCheckpoint(messages.length - 1)}
                }}
                disabled={messages.length === 0}
              >
                <ListTodoIcon className="size-4" />
              </PromptInputButton>

              {/* Model Selector */}
              <ModelSelector>
                <ModelSelectorTrigger asChild>
                  <PromptInputButton>
                    <SparklesIcon className="size-4" />
                    <span className="hidden sm:inline ml-1 text-xs">{selectedModel.split("-")[0]}</span>
                  </PromptInputButton>
                </ModelSelectorTrigger>
                <ModelSelectorContent>
                  <ModelSelectorInput placeholder="Search models..." />
                  <ModelSelectorList>
                    <ModelSelectorEmpty>No models found.</ModelSelectorEmpty>
                    <ModelSelectorGroup heading="Available Models">
                      {availableModels.map((model) => (
                        <ModelSelectorItem
                          key={model.id}
                          onSelect={() => setSelectedModel(model.id)}
                        >
                          {model.name} ({model.provider})
                        </ModelSelectorItem>
                      ))}
                    </ModelSelectorGroup>
                  </ModelSelectorList>
                </ModelSelectorContent>
              </ModelSelector>

              {/* Context/Token Usage */}
              <Context usedTokens={tokenUsage.input + tokenUsage.output} maxTokens={128000}>
                <ContextTrigger />
                <ContextContent>
                  <ContextContentHeader />
                  <ContextContentBody>
                    <ContextInputUsage />
                    <ContextOutputUsage />
                  </ContextContentBody>
                </ContextContent>
              </Context>

              <PromptInputSelect
                value={selectedNetwork}
                onValueChange={(value) => selectNetwork(value)}
              >
                <PromptInputSelectTrigger className="w-[200px]">
                  <NetworkIcon className="mr-2 size-4" />
                  <PromptInputSelectValue />
                </PromptInputSelectTrigger>
                <PromptInputSelectContent>
                  {networkOptions.map((network) => (
                    <PromptInputSelectItem key={network.id} value={network.id}>
                      {network.name}
                    </PromptInputSelectItem>
                  ))}
                </PromptInputSelectContent>
              </PromptInputSelect>
            </PromptInputTools>
            <PromptInputSubmit
              status={status}
              disabled={!input.trim() && !isStreaming}
              onClick={isStreaming ? stopExecution : undefined}
            />
          </PromptInputFooter>
        </PromptInput>
      </div>
    </div>
  )
}
