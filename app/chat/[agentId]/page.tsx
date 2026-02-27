'use client'

import { use, Suspense } from 'react'
import { ChatProvider } from '../providers/chat-context'
import { ChatLayout } from '../components/chat-layout'

export default function DynamicChatPage({
    params,
}: {
    params: Promise<{ agentId: string }>
}) {
    return (
        <Suspense fallback={<div>Loading chat...</div>}>
            <DynamicChatContent params={params} />
        </Suspense>
    )
}

function DynamicChatContent({
    params,
}: {
    params: Promise<{ agentId: string }>
}) {
    const { agentId } = use(params)

    return (
        <ChatProvider defaultAgent={agentId}>
            <ChatLayout />
        </ChatProvider>
    )
}
