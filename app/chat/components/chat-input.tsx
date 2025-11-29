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
} from "@/src/components/ai-elements/prompt-input"
import { useChatContext } from "@/app/chat/providers/chat-context"
import { AgentSuggestions, getSuggestionsForAgent } from "./agent-suggestions"
import { PaperclipIcon, SquareIcon } from "lucide-react"
import { useMemo } from "react"

export function ChatInput() {
  const { sendMessage, stopGeneration, isLoading, status, agentConfig, selectedAgent, messages } =
    useChatContext()

  const supportsFiles = agentConfig?.features.fileUpload ?? false
  const showSuggestions = messages.length === 0 && !isLoading

  const suggestions = useMemo(
    () => getSuggestionsForAgent(selectedAgent),
    [selectedAgent]
  )

  const handleSubmit = async (message: { text: string; files: unknown[] }) => {
    if (message.text.trim()) {
      await sendMessage(message.text, message.files as File[])
    }
  }

  const handleSuggestionClick = (suggestion: string) => {
    sendMessage(suggestion)
  }

  return (
    <footer className="border-t border-border p-4">
      <div className="mx-auto max-w-3xl space-y-3">
        {showSuggestions && (
          <AgentSuggestions
            suggestions={suggestions}
            onSelect={handleSuggestionClick}
            disabled={isLoading}
          />
        )}
        <PromptInput
          onSubmit={handleSubmit}
          className="rounded-lg border shadow-sm"
          accept={supportsFiles ? "image/*,.pdf,.txt,.csv,.json,.md" : undefined}
          multiple={supportsFiles}
        >
          {supportsFiles && (
            <PromptInputAttachments>
              {(file) => (
                <PromptInputAttachment key={file.id} data={file} />
              )}
            </PromptInputAttachments>
          )}
          <PromptInputTextarea
            placeholder={`Message ${agentConfig?.name || "Agent"}...`}
            disabled={isLoading}
          />
          <PromptInputFooter>
            <PromptInputTools>
              {supportsFiles && (
                <PromptInputButton
                  variant="ghost"
                  title="Attach files"
                  onClick={() => {
                    const input = document.querySelector<HTMLInputElement>(
                      'input[type="file"]'
                    )
                    input?.click()
                  }}
                >
                  <PaperclipIcon className="size-4" />
                </PromptInputButton>
              )}
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
            <PromptInputSubmit status={status} disabled={isLoading && status !== "streaming"} />
          </PromptInputFooter>
        </PromptInput>
      </div>
    </footer>
  )
}
