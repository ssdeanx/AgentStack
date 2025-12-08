"use client"

import { Suspense } from "react"
import { WorkflowProvider } from "./providers/workflow-context"
import { WorkflowHeader } from "./components/workflow-header"
import { WorkflowCanvas } from "./components/workflow-canvas"

export default function WorkflowsPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
    <WorkflowProvider defaultWorkflow="contentStudioWorkflow">
      <main className="flex h-screen flex-col bg-background">
        <WorkflowHeader />
        <WorkflowCanvas />
      </main>
    </WorkflowProvider>
    </Suspense>
  )
}
