"use client"

import { Panel } from "@/src/components/ai-elements/panel"
import { ScrollArea } from "@/ui/scroll-area"
import { useWorkflowContext } from "@/app/workflows/providers/workflow-context"
import { MessageSquareIcon, CheckCircle2Icon, AlertCircleIcon, Loader2Icon, SparklesIcon, TerminalIcon } from "lucide-react"
import { useId, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"

export function WorkflowOutput() {
  const { streamingOutput, workflowStatus, messages, workflowConfig } = useWorkflowContext()
  const stableId = useId()

  const hasContent = useMemo(() => {
    return (streamingOutput !== null && streamingOutput !== "") || messages.length > 0
  }, [streamingOutput, messages.length])

  const statusIcon = useMemo(() => {
    switch (workflowStatus) {
      case "running":
        return <Loader2Icon className="size-3.5 animate-spin text-primary" />
      case "completed":
        return <CheckCircle2Icon className="size-3.5 text-green-500 glow-green" />
      case "error":
        return <AlertCircleIcon className="size-3.5 text-red-500 glow-red" />
      case "paused":
      case "idle":
      default:
        return <TerminalIcon className="size-3.5 text-muted-foreground" />
    }
  }, [workflowStatus])

  const statusText = useMemo(() => {
    switch (workflowStatus) {
      case "running":
        return "PROCESSING ENGINE"
      case "completed":
        return "EXECUTION SUCCESS"
      case "error":
        return "SYSTEM ERROR"
      case "paused":
        return "INTERRUPTED"
      case "idle":
      default:
        return "RUNTIME LOGS"
    }
  }, [workflowStatus])

  if (workflowStatus === "idle" && !hasContent) {
    return null
  }

  return (
    <Panel position="bottom-right" className="w-96 p-0 bg-card/40 backdrop-blur-3xl border-border/20 shadow-2xl rounded-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-300">
      <div className="flex items-center justify-between border-b border-border/10 px-4 py-3 bg-muted/20">
        <div className="flex items-center gap-2.5">
          <motion.div
            animate={workflowStatus === "running" ? { scale: [1, 1.2, 1] } : {}}
            transition={{ repeat: Infinity, duration: 2 }}
          >
            {statusIcon}
          </motion.div>
          <span className="text-[10px] font-bold tracking-[0.15em] text-foreground uppercase">
            {statusText}
          </span>
        </div>
        {workflowConfig && (
          <div className="flex items-center gap-2 px-2 py-0.5 rounded-full bg-primary/5 border border-primary/10">
            <span className="text-[9px] font-bold text-primary/80 uppercase tracking-tighter">
              v1.0.4
            </span>
          </div>
        )}
      </div>

      <ScrollArea className="h-64 p-4 custom-scrollbar">
        <AnimatePresence mode="popLayout">
          {streamingOutput ? (
            <motion.div
              key="streaming"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-3"
            >
              <div className="flex items-start gap-2">
                <div className="size-1.5 bg-primary rounded-full mt-1.5 animate-pulse shrink-0" />
                <p className="text-[11px] text-foreground/90 whitespace-pre-wrap font-mono leading-relaxed selection:bg-primary/30">
                  {streamingOutput}
                </p>
              </div>
              {workflowStatus === "running" && (
                <motion.div
                  animate={{ opacity: [1, 0] }}
                  transition={{ repeat: Infinity, duration: 0.8 }}
                  className="inline-block w-2.5 h-4 bg-primary/50 ml-1 rounded-sm"
                />
              )}
            </motion.div>
          ) : messages.length > 0 ? (
            <div className="space-y-4">
              {messages.map((msg, i) => {
                const textPart = msg.parts?.find((p) => p.type === "text")
                const content = textPart?.text ?? ""
                if (!content) {return null}

                return (
                  <motion.div
                    key={msg.id || i}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={`group relative p-3 rounded-xl border transition-all duration-300 ${
                      msg.role === "user"
                        ? "bg-primary/5 border-primary/20"
                        : "bg-muted/10 border-border/10"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-[9px] font-bold uppercase tracking-[0.2em] ${
                        msg.role === "user" ? "text-primary" : "text-muted-foreground"
                      }`}>
                        {msg.role === "user" ? "Input Vector" : "Engine Output"}
                      </span>
                      {msg.role !== "user" && <SparklesIcon className="size-3 text-primary/40" />}
                    </div>
                    <p className="text-[11px] font-medium leading-relaxed opacity-90">{content}</p>
                  </motion.div>
                )
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-40 text-center space-y-3">
              <div className="size-10 rounded-full bg-muted/20 flex items-center justify-center border border-dashed border-border/50">
                <MessageSquareIcon className="size-5 text-muted-foreground/40" />
              </div>
              <p className="text-[11px] text-muted-foreground/60 italic px-8">
                Initialize neural path to capture workflow artifacts...
              </p>
            </div>
          )}
        </AnimatePresence>
      </ScrollArea>

      <div className="px-4 py-2 border-t border-border/5 bg-muted/10 flex justify-between items-center">
        <span className="text-[9px] text-muted-foreground/40 font-mono italic">
          TRC_ID: {stableId.replace(/:/g, "").toUpperCase()}
        </span>
        <button className="text-[9px] text-primary font-bold hover:underline tracking-widest uppercase">
          Full Diagnostic
        </button>
      </div>
    </Panel>
  )
}
