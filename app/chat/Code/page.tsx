'use client'

import Link from 'next/link'
import { Suspense } from 'react'

import { AgentLaunchpad } from '../components/agent-launchpad'
import { ChatPageShell } from '../components/chat-page-shell'
import { MainSidebar } from '../components/main-sidebar'
import { ChatProvider } from '../providers/chat-context'
import { Button } from '@/ui/button'

/**
 * Launchpad for code sessions by agent.
 */
export default function CodePage() {
    return (
        <Suspense fallback={null}>
            <ChatProvider>
                <ChatPageShell
                    title="Code launchpad"
                    description="Select an agent first, then open the IDE view with workspace and sandbox controls for that agent."
                    sidebar={<MainSidebar />}
                    actions={
                        <Button asChild variant="outline">
                            <Link href="/chat/agents">Open chat directory</Link>
                        </Button>
                    }
                >
                    <AgentLaunchpad mode="code" />
                </ChatPageShell>
            </ChatProvider>
        </Suspense>
    )
}