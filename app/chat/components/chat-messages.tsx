"use client"

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
  MessageToolbar,
  MessageActions,
  MessageAction,
  MessageAttachment,
  MessageAttachments,
} from "@/src/components/ai-elements/message"
import { Loader } from "@/src/components/ai-elements/loader"
import { CodeBlock, CodeBlockCopyButton } from "@/src/components/ai-elements/code-block"
import { Image as AIImage } from "@/src/components/ai-elements/image"
import { useChatContext, type ToolInvocationState } from "@/app/chat/providers/chat-context"
import { AgentReasoning } from "./agent-reasoning"
import { AgentChainOfThought, parseReasoningToSteps } from "./agent-chain-of-thought"
import { AgentTools } from "./agent-tools"
import { AgentSources } from "./agent-sources"
import { AgentArtifact, type ArtifactData } from "./agent-artifact"
import { AgentPlan, extractPlanFromText } from "./agent-plan"
import { AgentCheckpoint } from "./agent-checkpoint"
import { AgentTask, type AgentTaskData } from "./agent-task"
import { AgentQueue } from "./agent-queue"
import { AgentConfirmation } from "./agent-confirmation"
import { parseInlineCitations } from "./agent-inline-citation"
import { CopyIcon, CheckIcon, MessageSquareIcon, BookmarkPlusIcon } from "lucide-react"
import { useState, useCallback, useMemo, Fragment } from "react"
import type { UIMessage, FileUIPart } from "ai"
import {
  isTextUIPart,
  isReasoningUIPart,
  isToolOrDynamicToolUIPart,
  isFileUIPart,
} from "ai"
import type { BundledLanguage } from "shiki"

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error("Failed to copy:", err)
    }
  }, [text])

  return (
    <MessageAction
      tooltip={copied ? "Copied!" : "Copy"}
      onClick={handleCopy}
    >
      {copied ? (
        <CheckIcon className="size-4" />
      ) : (
        <CopyIcon className="size-4" />
      )}
    </MessageAction>
  )
}

function extractArtifacts(text: string): { content: string; artifacts: ArtifactData[]; codeBlocks: { language: string; code: string }[] } {
  const artifacts: ArtifactData[] = []
  const codeBlocks: { language: string; code: string }[] = []
  let cleanContent = text
  
  const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g
  let match: RegExpExecArray | null
  let artifactIndex = 0
  
  while ((match = codeBlockRegex.exec(text)) !== null) {
    const language = match[1] || "text"
    const code = match[2].trim()
    
    if (code.length > 100) {
      const artifactId = `artifact-${Date.now()}-${artifactIndex++}`
      artifacts.push({
        id: artifactId,
        title: `Code: ${language}`,
        type: language === "json" ? "json" : "code",
        language,
        content: code,
      })
      cleanContent = cleanContent.replace(match[0], `\n*[Code artifact: ${language}]*\n`)
    } else {
      codeBlocks.push({ language, code })
      cleanContent = cleanContent.replace(match[0], `\n__CODE_BLOCK_${codeBlocks.length - 1}__\n`)
    }
  }
  
  return { content: cleanContent, artifacts, codeBlocks }
}

interface MessageItemProps {
  message: UIMessage
  messageIndex: number
  showReasoning: boolean
  showChainOfThought: boolean
  showTools: boolean
  showSources: boolean
  showArtifacts: boolean
  showConfirmation: boolean
  sources: { url: string; title: string }[]
  checkpoints: number[]
  onCreateCheckpoint?: (index: number) => void
  onRestoreCheckpoint?: (index: number) => void
  onApproveConfirmation?: (id: string) => void
  onRejectConfirmation?: (id: string) => void
}

function MessageItem({
  message,
  messageIndex,
  showReasoning,
  showChainOfThought,
  showTools,
  showSources,
  showArtifacts,
  showConfirmation,
  sources,
  checkpoints,
  onCreateCheckpoint,
  onRestoreCheckpoint,
  onApproveConfirmation,
  onRejectConfirmation,
}: MessageItemProps) {
  const isAssistant = message.role === "assistant"
  const isUser = message.role === "user"
  const textPart = message.parts?.find(isTextUIPart)
  const rawContent = textPart?.text || ""

  const { content, artifacts, codeBlocks } = useMemo(() => {
    if (isAssistant && showArtifacts) {
      return extractArtifacts(rawContent)
    }
    return { content: rawContent, artifacts: [], codeBlocks: [] }
  }, [rawContent, isAssistant, showArtifacts])

  const messageReasoning = message.parts?.find(isReasoningUIPart)
  const messageTools = message.parts?.filter(
    isToolOrDynamicToolUIPart
  ) as ToolInvocationState[] | undefined
  
  const fileParts = message.parts?.filter(isFileUIPart) as FileUIPart[] | undefined
  const imageParts = fileParts?.filter((f) => f.mediaType?.startsWith("image/"))
  const otherFileParts = fileParts?.filter((f) => !f.mediaType?.startsWith("image/"))

  const reasoningSteps = useMemo(() => {
    if (showChainOfThought && messageReasoning?.text) {
      return parseReasoningToSteps(messageReasoning.text)
    }
    return []
  }, [showChainOfThought, messageReasoning])

  const plan = useMemo(() => {
    if (isAssistant) {
      return extractPlanFromText(rawContent)
    }
    return null
  }, [isAssistant, rawContent])

  const hasCitations = isAssistant && showSources && sources.length > 0
  const citationNodes = useMemo(() => {
    if (hasCitations) {
      return parseInlineCitations(content, sources)
    }
    return null
  }, [hasCitations, content, sources])

  const isCheckpoint = checkpoints.includes(messageIndex)

  const renderContentWithCodeBlocks = useCallback((text: string) => {
    if (codeBlocks.length === 0) return text
    
    const parts = text.split(/__CODE_BLOCK_(\d+)__/)
    return parts.map((part, i) => {
      if (i % 2 === 1) {
        const blockIndex = parseInt(part, 10)
        const block = codeBlocks[blockIndex]
        if (block) {
          return (
            <CodeBlock
              key={`code-${blockIndex}`}
              code={block.code}
              language={block.language as BundledLanguage}
              className="my-2"
            >
              <CodeBlockCopyButton />
            </CodeBlock>
          )
        }
      }
      return part
    })
  }, [codeBlocks])

  return (
    <Fragment>
      <Message from={message.role}>
        <MessageContent>
          {/* User file attachments */}
          {isUser && fileParts && fileParts.length > 0 && (
            <MessageAttachments>
              {fileParts.map((file, idx) => (
                <MessageAttachment key={`file-${idx}`} data={file} />
              ))}
            </MessageAttachments>
          )}

          {/* Chain of Thought / Reasoning */}
          {isAssistant && showChainOfThought && reasoningSteps.length > 0 && (
            <AgentChainOfThought steps={reasoningSteps} isStreaming={false} />
          )}

          {isAssistant && showReasoning && !showChainOfThought && messageReasoning && (
            <AgentReasoning
              reasoning={messageReasoning.text || ""}
              isStreaming={false}
            />
          )}

          {/* Plan */}
          {plan && (
            <AgentPlan plan={plan} defaultOpen={false} />
          )}

          {/* Generated images */}
          {isAssistant && imageParts && imageParts.length > 0 && (
            <div className="flex flex-wrap gap-2 my-2">
              {imageParts.map((img, idx) => {
                const base64Data = img.url?.startsWith("data:") 
                  ? img.url.split(",")[1] || "" 
                  : ""
                return (
                  <AIImage
                    key={`img-${idx}`}
                    base64={base64Data}
                    uint8Array={new Uint8Array()}
                    mediaType={img.mediaType || "image/png"}
                    className="max-w-md rounded-lg"
                    alt={img.filename || `Generated image ${idx + 1}`}
                  />
                )
              })}
            </div>
          )}

          {/* Message content with inline code blocks */}
          {hasCitations && citationNodes ? (
            <div className="prose prose-sm dark:prose-invert max-w-none">
              {citationNodes}
            </div>
          ) : codeBlocks.length > 0 ? (
            <div className="prose prose-sm dark:prose-invert max-w-none">
              {renderContentWithCodeBlocks(content)}
            </div>
          ) : (
            <MessageResponse>{content}</MessageResponse>
          )}

          {/* Artifacts */}
          {isAssistant && showArtifacts && artifacts.length > 0 && (
            <div className="space-y-3 mt-3">
              {artifacts.map((artifact) => (
                <AgentArtifact key={artifact.id} artifact={artifact} />
              ))}
            </div>
          )}

          {/* Tool Confirmations */}
          {isAssistant && showConfirmation && messageTools && messageTools.length > 0 && (
            <>
              {messageTools
                .filter((tool) => tool.state === "approval-requested" as unknown)
                .map((tool) => (
                  <AgentConfirmation
                    key={tool.toolCallId}
                    toolName={tool.toolName || "unknown"}
                    description={`Execute ${tool.toolName} with provided parameters`}
                    approval={{ id: tool.toolCallId }}
                    state={tool.state}
                    onApprove={(id) => onApproveConfirmation?.(id)}
                    onReject={(id) => onRejectConfirmation?.(id)}
                  />
                ))}
            </>
          )}

          {/* Tools */}
          {isAssistant && showTools && messageTools && messageTools.length > 0 && (
            <AgentTools tools={messageTools} />
          )}

          {/* Sources */}
          {isAssistant && showSources && sources.length > 0 && (
            <AgentSources sources={sources} />
          )}
        </MessageContent>

        {isAssistant && (
          <MessageToolbar>
            <MessageActions>
              <CopyButton text={rawContent} />
              {onCreateCheckpoint && (
                <MessageAction
                  tooltip="Create checkpoint"
                  onClick={() => onCreateCheckpoint(messageIndex)}
                >
                  <BookmarkPlusIcon className="size-4" />
                </MessageAction>
              )}
            </MessageActions>
          </MessageToolbar>
        )}
      </Message>

      {isCheckpoint && onRestoreCheckpoint && (
        <AgentCheckpoint
          messageIndex={messageIndex}
          onRestore={onRestoreCheckpoint}
        />
      )}
    </Fragment>
  )
}

export function ChatMessages() {
  const {
    messages,
    isLoading,
    streamingContent,
    streamingReasoning,
    toolInvocations,
    sources,
    selectedAgent,
    agentConfig,
    queuedTasks,
    approveConfirmation,
    rejectConfirmation,
    removeTask,
  } = useChatContext()

  const [checkpoints, setCheckpoints] = useState<number[]>([])

  const showReasoning = agentConfig?.features.reasoning ?? false
  const showChainOfThought = agentConfig?.features.chainOfThought ?? false
  const showTools = agentConfig?.features.tools ?? false
  const showSources = agentConfig?.features.sources ?? false
  const showArtifacts = agentConfig?.features.artifacts ?? false
  const showConfirmation = agentConfig?.features.confirmation ?? false
  const showQueue = agentConfig?.features.queue ?? false

  const handleCreateCheckpoint = useCallback((index: number) => {
    setCheckpoints((prev) => {
      if (prev.includes(index)) return prev
      return [...prev, index].sort((a, b) => a - b)
    })
  }, [])

  const handleRestoreCheckpoint = useCallback((index: number) => {
    // TODO: Integrate with ChatContext to restore messages to checkpoint
    console.log("Restore to checkpoint at index:", index)
  }, [])

  const streamingReasoningSteps = useMemo(() => {
    if (showChainOfThought && streamingReasoning) {
      return parseReasoningToSteps(streamingReasoning)
    }
    return []
  }, [showChainOfThought, streamingReasoning])

  return (
    <Conversation className="flex-1">
      <ConversationContent className="mx-auto max-w-3xl">
        {messages.length === 0 && !isLoading ? (
          <ConversationEmptyState
            icon={<MessageSquareIcon className="size-8" />}
            title="Start a conversation"
            description={`Chat with ${agentConfig?.name || selectedAgent} to get started`}
          />
        ) : (
          <>
            {/* Task Queue */}
            {showQueue && queuedTasks.length > 0 && (
              <AgentQueue
                tasks={queuedTasks}
                onView={(id) => console.log("View task:", id)}
                onRetry={(id) => console.log("Retry task:", id)}
                onDelete={removeTask}
              />
            )}

            {messages.map((message, index) => (
              <MessageItem
                key={message.id}
                message={message}
                messageIndex={index}
                showReasoning={showReasoning}
                showChainOfThought={showChainOfThought}
                showTools={showTools}
                showSources={showSources}
                showArtifacts={showArtifacts}
                showConfirmation={showConfirmation}
                sources={sources}
                checkpoints={checkpoints}
                onCreateCheckpoint={handleCreateCheckpoint}
                onRestoreCheckpoint={handleRestoreCheckpoint}
                onApproveConfirmation={approveConfirmation}
                onRejectConfirmation={rejectConfirmation}
              />
            ))}

            {isLoading && (
              <Message from="assistant">
                <MessageContent>
                  {showChainOfThought && streamingReasoningSteps.length > 0 && (
                    <AgentChainOfThought steps={streamingReasoningSteps} isStreaming={true} />
                  )}

                  {showReasoning && !showChainOfThought && streamingReasoning && (
                    <AgentReasoning
                      reasoning={streamingReasoning}
                      isStreaming={true}
                    />
                  )}

                  {streamingContent ? (
                    <MessageResponse>{streamingContent}</MessageResponse>
                  ) : (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Loader size={16} />
                      <span className="text-sm">Thinking...</span>
                    </div>
                  )}

                  {showTools && toolInvocations.length > 0 && (
                    <AgentTools tools={toolInvocations} />
                  )}
                </MessageContent>
              </Message>
            )}
          </>
        )}
      </ConversationContent>
      <ConversationScrollButton />
    </Conversation>
  )
}
