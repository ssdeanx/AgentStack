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
import { PaperclipIcon, SquareIcon } from "lucide-react"

export function ChatInput() {
  const { sendMessage, stopGeneration, isLoading, status, agentConfig } =
    useChatContext()

  const supportsFiles = agentConfig?.features.fileUpload ?? false

  const handleSubmit = async (message: { text: string; files: unknown[] }) => {
    if (message.text.trim()) {
      await sendMessage(message.text, message.files as File[])
    }
  }

  return (
    <footer className="border-t border-border p-4">
      <div className="mx-auto max-w-3xl">
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
