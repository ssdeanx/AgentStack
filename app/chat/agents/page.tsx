'use client'

import Link from 'next/link'
import { Suspense } from 'react'

import { ChatPageShell } from '../components/chat-page-shell'
import { AgentLaunchpad } from '../components/agent-launchpad'
import { MainSidebar } from '../components/main-sidebar'
import { ChatProvider } from '../providers/chat-context'
import { Button } from '@/ui/button'

/**
 * Landing page for choosing an agent before entering chat.
 */
export default function AgentsDirectoryPage() {
    return (
        <Suspense fallback={null}>
            <ChatProvider>
                <ChatPageShell
                    title="Agent directory"
                    description="Browse the full agent catalog, filter by intent, and open the selected agent in chat or code."
                    sidebar={<MainSidebar />}
                    actions={
                        <Button asChild variant="outline">
                            <Link href="/chat/Code">Open code launchpad</Link>
                        </Button>
                    }
                >
                    <AgentLaunchpad mode="chat" />
                </ChatPageShell>
            </ChatProvider>
        </Suspense>
    )
}
