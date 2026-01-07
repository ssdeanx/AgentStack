"use client"

import Link from "next/link"
import { Button } from "@/ui/button"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/ui/select"
import { Badge } from "@/ui/badge"
import { useWorkflowContext } from "@/app/workflows/providers/workflow-context"
import {
  WORKFLOW_CONFIGS,
  CATEGORY_ORDER,
  CATEGORY_LABELS,
  getWorkflowsByCategory,
} from "@/app/workflows/config/workflows"
import {
  ArrowLeftIcon,
  PauseIcon,
  SquareIcon,
  RefreshCwIcon,
  WorkflowIcon,
  AlertCircleIcon,
  RotateCcwIcon,
  CheckCircle2Icon,
} from "lucide-react"
import { useMemo } from "react"

export function WorkflowHeader() {
  const {
    selectedWorkflow,
    selectWorkflow,
    workflowStatus,
    pauseWorkflow,
    resumeWorkflow,
    stopWorkflow,
  } = useWorkflowContext()

  const workflowsByCategory = useMemo(() => getWorkflowsByCategory(), [])

  const isWorkflowActive = workflowStatus === "running" || workflowStatus === "paused"

  return (
    <header className="flex items-center justify-between border border-border/20 bg-card/40 backdrop-blur-3xl mx-6 mt-4 px-6 py-3 rounded-2xl shadow-2xl relative overflow-hidden z-20">
      <div className="absolute inset-0 bg-linear-to-r from-primary/5 via-transparent to-transparent pointer-events-none" />
      <div className="flex items-center gap-4 relative">
        <Link href="/">
          <Button variant="ghost" size="sm" className="h-8 hover:bg-primary/10 hover:text-primary transition-all active:scale-95">
            <ArrowLeftIcon className="size-4 mr-2" />
            <span className="text-[10px] font-bold uppercase tracking-widest">Gateway</span>
          </Button>
        </Link>
        <div className="h-6 w-px bg-border/20" />
        <div className="flex items-center gap-3">
          <div className="size-9 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20 shadow-inner">
            <WorkflowIcon className="size-5 text-primary" />
          </div>
          <div>
            <h1 className="text-sm font-bold uppercase tracking-[0.2em] text-foreground/90">System Overview</h1>
            <p className="text-[10px] text-muted-foreground font-mono tracking-tighter opacity-60 uppercase">
              Operational Nodes: {Object.keys(WORKFLOW_CONFIGS).length} / ACTIVE
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 relative">
        <Select
          value={selectedWorkflow}
          onValueChange={(value) => selectWorkflow(value)}
          disabled={isWorkflowActive}
        >
          <SelectTrigger className="w-72 h-9 bg-background/20 border-border/20 backdrop-blur-md rounded-xl text-xs font-semibold focus:ring-primary/30">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-card/90 backdrop-blur-3xl border-border/20 rounded-xl shadow-2xl">
            {CATEGORY_ORDER.map((category) => {
              const workflows = workflowsByCategory[category]
              if (workflows.length === 0) {return null}

              return (
                <SelectGroup key={category}>
                  <SelectLabel>{CATEGORY_LABELS[category]}</SelectLabel>
                  {workflows.map((wf) => (
                    <SelectItem key={wf.id} value={wf.id}>
                      <div className="flex items-center gap-2">
                        <span>{wf.name}</span>
                        <Badge variant="secondary" className="text-xs">
                          {wf.steps.length} steps
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectGroup>
              )
            })}
          </SelectContent>
        </Select>

        {/* Status indicators */}
        {workflowStatus === "running" && (
          <Badge variant="outline" className="h-8 gap-2 px-3 border-yellow-500/30 text-yellow-500 bg-yellow-500/5 rounded-full font-bold text-[10px] uppercase tracking-widest animate-pulse shadow-[0_0_15px_rgba(234,179,8,0.1)]">
            <RefreshCwIcon className="size-3 animate-spin" />
            Operational
          </Badge>
        )}

        {workflowStatus === "paused" && (
          <Badge variant="outline" className="h-8 gap-2 px-3 border-blue-500/30 text-blue-500 bg-blue-500/5 rounded-full font-bold text-[10px] uppercase tracking-widest shadow-[0_0_15px_rgba(59,130,246,0.1)]">
            <PauseIcon className="size-3" />
            Suspended
          </Badge>
        )}

        {workflowStatus === "completed" && (
          <Badge variant="outline" className="h-8 gap-2 px-3 border-green-500/30 text-green-500 bg-green-500/5 rounded-full font-bold text-[10px] uppercase tracking-widest shadow-[0_0_15px_rgba(34,197,94,0.1)]">
            <CheckCircle2Icon className="size-3" />
            Synchronized
          </Badge>
        )}

        {workflowStatus === "error" && (
          <Badge variant="outline" className="h-8 gap-2 px-3 border-red-500/30 text-red-500 bg-red-500/5 rounded-full font-bold text-[10px] uppercase tracking-widest shadow-[0_0_15px_rgba(239,68,68,0.1)]">
            <AlertCircleIcon className="size-3" />
            Critical Error
          </Badge>
        )}

        {/* Action buttons */}
        {isWorkflowActive && (
          <div className="flex items-center gap-2">
            {workflowStatus === "running" ? (
              <Button variant="outline" size="sm" onClick={pauseWorkflow} className="h-9 w-24 rounded-xl border-border/20 hover:bg-muted/10 font-bold text-[9px] tracking-widest uppercase transition-all duration-300">
                <PauseIcon className="size-3 mr-2" />
                Suspend
              </Button>
            ) : (
              <Button variant="outline" size="sm" onClick={() => resumeWorkflow()} className="h-9 w-24 rounded-xl border-border/20 hover:bg-muted/10 font-bold text-[9px] tracking-widest uppercase transition-all duration-300">
                <RefreshCwIcon className="size-3 mr-2" />
                Resume
              </Button>
            )}
            <Button variant="outline" size="icon" onClick={stopWorkflow} className="h-9 w-9 rounded-xl border-border/20 hover:bg-destructive/10 hover:text-destructive transition-all duration-300" title="Kill process">
              <SquareIcon className="size-3" />
            </Button>
          </div>
        )}

        {/* Reset button after completion or error */}
        {(workflowStatus === "completed" || workflowStatus === "error") && (
          <Button variant="outline" size="sm" onClick={stopWorkflow} className="h-9 rounded-xl border-border/20 hover:bg-primary/10 hover:text-primary font-bold text-[9px] tracking-widest uppercase transition-all duration-300" title="Reset system">
            <RotateCcwIcon className="size-4 mr-1" />
            Reset Sequence
          </Button>
        )}
      </div>
    </header>
  )
}
