'use client'

import { Suspense } from 'react'

import { ChatPageShell } from '../components/chat-page-shell'
import { MainSidebar } from '../components/main-sidebar'
import { ChatProvider } from '../providers/chat-context'
import { WorkflowProvider } from '../providers/workflow-context'
import { WorkflowHeader } from './_components/workflow-header'
import { WorkflowCanvas } from './_components/workflow-canvas'

export default function WorkflowsPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <ChatProvider>
                <ChatPageShell
                    title="Workflow studio"
                    description="Inspect workflow topology, runtime state, and execution controls from the same shared shell as the rest of the chat workspace."
                    sidebar={<MainSidebar />}
                    hideHeader
                    fullBleed
                    contentClassName="px-0 py-0"
                >
                    <WorkflowProvider defaultWorkflow="contentStudioWorkflow">
                        <main className="ui-crisp flex min-h-0 flex-1 flex-col bg-transparent">
                            <WorkflowHeader />
                            <WorkflowCanvas />
                        </main>
                    </WorkflowProvider>
                </ChatPageShell>
            </ChatProvider>
        </Suspense>
    )
}
