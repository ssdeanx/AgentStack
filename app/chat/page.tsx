"use client"

import { Suspense } from "react"
import { ChatProvider } from "./providers/chat-context"
import { ChatHeader } from "./components/chat-header"
import { ChatMessages } from "./components/chat-messages"
import { ChatInput } from "./components/chat-input"
import { ChatSidebar } from "./components/chat-sidebar"

export default function ChatPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ChatProvider defaultAgent="researchAgent">
        <main className="flex h-[calc(100vh-4rem)] flex-col bg-background">
          <ChatHeader />
          <div className="flex flex-1 overflow-hidden">
            <div className="flex flex-1 flex-col overflow-hidden">
              <ChatMessages />
              <ChatInput />
            </div>
            <ChatSidebar />
          </div>
        </main>
      </ChatProvider>
    </Suspense>
  )
}
