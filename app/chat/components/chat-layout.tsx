'use client'

import { ChatHeader } from './chat-header'
import { ChatMessages } from './chat-messages'
import { ChatInput } from './chat-input'
import { ChatSidebar } from './chat-sidebar'
import { MainSidebar } from './main-sidebar'
import { SidebarProvider, SidebarInset } from '@/ui/sidebar'
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/ui/resizable'
import { useChatContext } from '../providers/chat-context-hooks'
import { cn } from '@/lib/utils'

export function ChatLayout() {
    const { isFocusMode } = useChatContext()

    return (
        <main
            className={cn(
                'chat-shell-bg flex h-screen overflow-hidden pt-16 transition-all duration-500',
                isFocusMode && 'focus-mode-active'
            )}
        >
            <ChatHeader />
            <SidebarProvider className="flex min-h-0 w-full flex-1 overflow-hidden bg-transparent">
                <MainSidebar />
                <SidebarInset className="relative m-0 flex min-w-0 flex-1 flex-col overflow-hidden rounded-none border-x-0 bg-transparent">
                    <ResizablePanelGroup className="flex h-full w-full min-h-0 min-w-0 overflow-hidden">
                        <ResizablePanel defaultSize={72} minSize={55} className="min-w-0">
                            <div className="flex h-full min-h-0 flex-col overflow-hidden relative min-w-0">
                                <ChatMessages />
                                <ChatInput />
                            </div>
                        </ResizablePanel>

                        {!isFocusMode ? (
                            <>
                                <ResizableHandle withHandle className="hidden xl:flex" />
                                <ResizablePanel
                                    defaultSize={28}
                                    minSize={20}
                                    maxSize={40}
                                    className="min-w-80 border-l border-border/70 bg-background/72 backdrop-blur-xl"
                                >
                                    <div className="h-full min-h-0 overflow-hidden">
                                        <ChatSidebar />
                                    </div>
                                </ResizablePanel>
                            </>
                        ) : null}
                    </ResizablePanelGroup>
                </SidebarInset>
            </SidebarProvider>
        </main>
    )
}
