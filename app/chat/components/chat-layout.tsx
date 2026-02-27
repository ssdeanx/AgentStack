'use client'

import { ChatHeader } from './chat-header'
import { ChatMessages } from './chat-messages'
import { ChatInput } from './chat-input'
import { ChatSidebar } from './chat-sidebar'
import { MainSidebar } from './main-sidebar'
import { SidebarProvider, SidebarInset } from '@/ui/sidebar'
import { useChatContext } from '../providers/chat-context-hooks'
import { cn } from '@/lib/utils'

export function ChatLayout() {
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
