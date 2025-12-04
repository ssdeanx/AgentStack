"use client"

import { Panel } from "@/src/components/ai-elements/panel"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/ui/collapsible"
import { Button } from "@/ui/button"
import { ChevronDownIcon, ChevronUpIcon, InfoIcon } from "lucide-react"
import { useState } from "react"

export function WorkflowLegend() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <Panel position="top-right" className="p-2 mt-14">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs w-full justify-between">
            <span className="flex items-center gap-1">
              <InfoIcon className="size-3" />
              Legend
            </span>
            {isOpen ? <ChevronUpIcon className="size-3" /> : <ChevronDownIcon className="size-3" />}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-2">
          <div className="space-y-1.5 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="w-4 h-0.5 bg-primary rounded" />
              <span>Active flow</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
              <span>Running</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span>Completed</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-red-500" />
              <span>Error</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-0.5 border-t border-dashed border-muted-foreground" />
              <span>Pending</span>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </Panel>
  )
}
