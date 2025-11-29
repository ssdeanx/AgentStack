"use client"

import { WorkflowProvider } from "./providers/workflow-context"
import { WorkflowHeader } from "./components/workflow-header"
import { WorkflowCanvas } from "./components/workflow-canvas"

export default function WorkflowsPage() {
  return (
    <WorkflowProvider defaultWorkflow="contentStudioWorkflow">
      <main className="flex h-screen flex-col bg-background">
        <WorkflowHeader />
        <WorkflowCanvas />
      </main>
    </WorkflowProvider>
  )
}
