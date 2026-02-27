'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { ChatProvider } from './providers/chat-context'
import { ChatLayout } from './components/chat-layout'

export default function ChatPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <ChatPageContent />
        </Suspense>
    )
}

function ChatPageContent() {
    const searchParams = useSearchParams()
    const agentParam = searchParams.get('agent')
    const trimmedAgent = agentParam?.trim()
    const initialAgent =
        trimmedAgent && trimmedAgent.length > 0 ? trimmedAgent : undefined

    return (
        <ChatProvider defaultAgent={initialAgent}>
            <ChatLayout />
        </ChatProvider>
    )
}
