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
                'flex h-screen pt-16 flex-col bg-background transition-all duration-500 overflow-hidden',
                isFocusMode && 'focus-mode-active'
            )}
        >
            <ChatHeader />
            <SidebarProvider className="flex flex-1 overflow-hidden min-h-0 bg-background w-full">
                <MainSidebar />
                <SidebarInset className="flex flex-1 flex-col overflow-hidden bg-background m-0 rounded-none border-x-0 relative min-w-0">
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
                                    className="min-w-80 border-l bg-card/30 backdrop-blur-xl"
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
