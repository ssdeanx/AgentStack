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
                'flex h-screen pt-16 flex-col bg-background transition-all duration-500 overflow-hidden',
                isFocusMode && 'focus-mode-active'
            )}
        >
            <ChatHeader />
            <SidebarProvider className="flex flex-1 overflow-hidden min-h-0 bg-background w-full">
                <MainSidebar />
                <SidebarInset className="flex flex-1 flex-col overflow-hidden bg-background m-0 rounded-none border-x-0 relative min-w-0">
                    <div className="flex h-full w-full flex-1 overflow-hidden">
                        <div className="flex flex-1 flex-col overflow-hidden relative min-w-0">
                            <ChatMessages />
                            <ChatInput />
                        </div>

                        {!isFocusMode && (
                            <div className="w-95 h-full border-l bg-card/30 backdrop-blur-xl overflow-hidden min-w-95 shrink-0">
                                <ChatSidebar />
                            </div>
                        )}
                    </div>
                </SidebarInset>
            </SidebarProvider>
        </main>
    )
}
