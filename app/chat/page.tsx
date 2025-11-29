"use client"

import { ChatProvider } from "./providers/chat-context"
import { ChatHeader } from "./components/chat-header"
import { ChatMessages } from "./components/chat-messages"
import { ChatInput } from "./components/chat-input"

export default function ChatPage() {
  return (
    <ChatProvider defaultAgent="researchAgent">
      <main className="flex h-screen flex-col bg-background">
        <ChatHeader />
        <ChatMessages />
        <ChatInput />
      </main>
    </ChatProvider>
  )
}
