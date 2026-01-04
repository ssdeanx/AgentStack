"use client"

import { Suspense } from "react"
import { ChatProvider } from "./providers/chat-context"
import { useChatContext } from "./providers/chat-context-hooks"
import { ChatHeader } from "./components/chat-header"
import { ChatMessages } from "./components/chat-messages"
import { ChatInput } from "./components/chat-input"
import { ChatSidebar } from "./components/chat-sidebar"
import { cn } from "@/lib/utils"

function ChatLayout() {
  const { isFocusMode } = useChatContext()

  return (
    <main className={cn(
      "ui-crisp flex h-[calc(100vh-4rem)] flex-col bg-background transition-all duration-500",
      isFocusMode && "focus-mode-active"
    )}>
      <ChatHeader />
      <div className="flex flex-1 overflow-hidden">
        <div className="flex flex-1 flex-col overflow-hidden">
          <ChatMessages />
          <ChatInput />
        </div>
        <div className="hide-on-focus h-full">
          <ChatSidebar />
        </div>
      </div>
    </main>
  )
}

export default function ChatPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ChatProvider>
        <ChatLayout />
      </ChatProvider>
    </Suspense>
  )
}
