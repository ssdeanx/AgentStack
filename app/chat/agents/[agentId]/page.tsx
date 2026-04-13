'use client'

import { use } from 'react'

import { ChatLayout } from '../../components/chat-layout'
import { ChatProvider } from '../../providers/chat-context'

/**
 * Full chat workspace for the selected agent.
 */
export default function AgentChatWorkspacePage({
    params,
    searchParams,
}: {
    params: Promise<{ agentId: string }>
    searchParams: Promise<{ threadId?: string; resourceId?: string }>
}) {
    const { agentId } = use(params)
    const { threadId, resourceId } = use(searchParams)

    return (
        <ChatProvider defaultAgent={agentId} defaultThreadId={threadId} defaultResourceId={resourceId}>
            <ChatLayout />
        </ChatProvider>
    )
}