"use client"

import { Panel } from "@/src/components/ai-elements/panel"

export function WorkflowLegend() {
  return (
    <Panel position="bottom-left" className="p-3">
      <p className="text-xs font-medium mb-2">Legend</p>
      <div className="space-y-1.5 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <div className="w-4 h-0.5 bg-primary rounded" />
          <span>Data flow</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
          <span>Active step</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500" />
          <span>Completed</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-0.5 border-t border-dashed border-muted-foreground" />
          <span>Pending path</span>
        </div>
      </div>
    </Panel>
  )
}
