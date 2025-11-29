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
} from "@/src/components/ai-elements/message"
import { Loader } from "@/src/components/ai-elements/loader"
import { useChatContext, type ToolInvocationState } from "@/app/chat/providers/chat-context"
import { AgentReasoning } from "./agent-reasoning"
import { AgentTools } from "./agent-tools"
import { AgentSources } from "./agent-sources"
import { CopyIcon, CheckIcon, MessageSquareIcon } from "lucide-react"
import { useState, useCallback } from "react"
import {
  isTextUIPart,
  isReasoningUIPart,
  isToolOrDynamicToolUIPart,
} from "ai"

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
  } = useChatContext()

  const showReasoning = agentConfig?.features.reasoning || agentConfig?.features.chainOfThought
  const showTools = agentConfig?.features.tools
  const showSources = agentConfig?.features.sources

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
            {messages.map((message) => {
              const isAssistant = message.role === "assistant"
              const textPart = message.parts?.find(isTextUIPart)
              const content = textPart?.text || ""

              const messageReasoning = message.parts?.find(isReasoningUIPart)
              const messageTools = message.parts?.filter(
                isToolOrDynamicToolUIPart
              ) as ToolInvocationState[] | undefined

              return (
                <Message key={message.id} from={message.role}>
                  <MessageContent>
                    {isAssistant && showReasoning && messageReasoning && (
                      <AgentReasoning
                        reasoning={messageReasoning.text || ""}
                        isStreaming={false}
                      />
                    )}

                    <MessageResponse>{content}</MessageResponse>

                    {isAssistant && showTools && messageTools && messageTools.length > 0 && (
                      <AgentTools tools={messageTools} />
                    )}

                    {isAssistant && showSources && sources.length > 0 && (
                      <AgentSources sources={sources} />
                    )}
                  </MessageContent>

                  {isAssistant && (
                    <MessageToolbar>
                      <MessageActions>
                        <CopyButton text={content} />
                      </MessageActions>
                    </MessageToolbar>
                  )}
                </Message>
              )
            })}

            {isLoading && (
              <Message from="assistant">
                <MessageContent>
                  {showReasoning && streamingReasoning && (
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
