"use client"

import { Panel } from "@/src/components/ai-elements/panel"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/ui/collapsible"
import { Button } from "@/ui/button"
import { ChevronDownIcon, ChevronUpIcon, InfoIcon } from "lucide-react"
import { useState } from "react"

export function WorkflowLegend() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <Panel position="top-right" className="p-0 mt-20 bg-card/40 backdrop-blur-3xl border-border/20 shadow-2xl rounded-2xl overflow-hidden min-w-40 transition-all duration-300 hover:border-primary/30 group">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="sm" className="h-10 gap-3 px-4 text-[10px] font-bold uppercase tracking-[0.2em] w-full justify-between hover:bg-muted/20">
            <span className="flex items-center gap-2">
              <div className="size-1.5 bg-primary rounded-full group-hover:animate-pulse" />
              Legend
            </span>
            {isOpen ? <ChevronUpIcon className="size-3 opacity-40" /> : <ChevronDownIcon className="size-3 opacity-40" />}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="px-4 pb-4 animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-3 group/item">
              <div className="w-6 h-0.5 bg-primary rounded-full shadow-[0_0_8px_rgba(var(--primary-rgb),0.5)]" />
              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest opacity-80 group-hover/item:opacity-100 group-hover/item:text-foreground transition-all">Neutral Path</span>
            </div>
            <div className="flex items-center gap-3 group/item">
              <div className="size-2 rounded-full bg-yellow-500 animate-pulse shadow-[0_0_8px_rgba(234,179,8,0.5)]" />
              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest opacity-80 group-hover/item:opacity-100 group-hover/item:text-foreground transition-all">Active Cell</span>
            </div>
            <div className="flex items-center gap-3 group/item">
              <div className="size-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest opacity-80 group-hover/item:opacity-100 group-hover/item:text-foreground transition-all">Synced Node</span>
            </div>
            <div className="flex items-center gap-3 group/item">
              <div className="size-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest opacity-80 group-hover/item:opacity-100 group-hover/item:text-foreground transition-all">System Breach</span>
            </div>
            <div className="flex items-center gap-3 group/item">
              <div className="w-6 h-0.5 border-t border-dashed border-muted-foreground/30" />
              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest opacity-80 group-hover/item:opacity-100 group-hover/item:text-foreground transition-all">Static Node</span>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </Panel>
  )
}
