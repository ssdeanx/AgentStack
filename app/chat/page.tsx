'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { ChatProvider } from './providers/chat-context'
import { useChatContext } from './providers/chat-context-hooks'
import { ChatHeader } from './components/chat-header'
import { ChatMessages } from './components/chat-messages'
import { ChatInput } from './components/chat-input'
import { ChatSidebar } from './components/chat-sidebar'
import { MainSidebar } from './components/main-sidebar'
import { SidebarProvider, SidebarInset } from '@/ui/sidebar'
import { cn } from '@/lib/utils'

function ChatLayout() {
    const { isFocusMode } = useChatContext()

    return (
        <main
            className={cn(
                'ui-crisp flex h-[calc(100vh-4rem)] flex-col bg-background transition-all duration-500',
                isFocusMode && 'focus-mode-active'
            )}
        >
            <ChatHeader />
            <SidebarProvider className="flex flex-1 overflow-hidden min-h-0 bg-background">
                <MainSidebar />
                <SidebarInset className="flex flex-1 flex-col overflow-hidden bg-background m-0 rounded-none border-x-0">
                    <ChatMessages />
                    <ChatInput />
                </SidebarInset>
                <div className="hide-on-focus h-full border-l">
                    <ChatSidebar />
                </div>
            </SidebarProvider>
        </main>
    )
}

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
