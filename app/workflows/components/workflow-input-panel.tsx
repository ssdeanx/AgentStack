"use client"

import { Panel } from "@/src/components/ai-elements/panel"
import {
  PromptInput,
  PromptInputTextarea,
  PromptInputFooter,
  PromptInputSubmit,
} from "@/src/components/ai-elements/prompt-input"
import { Button } from "@/ui/button"
import { useWorkflowContext } from "@/app/workflows/providers/workflow-context"
import { PlayIcon, Loader2Icon, SparklesIcon, CpuIcon, CommandIcon } from "lucide-react"
import { useCallback, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"

export function WorkflowInputPanel() {
  const {
    workflowConfig,
    workflowStatus,
    runWorkflow,
    selectedWorkflow,
  } = useWorkflowContext()

  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const isRunning = workflowStatus === "running"
  const isCompleted = workflowStatus === "completed"
  const isError = workflowStatus === "error"
  const isDisabled = isRunning || !workflowConfig

  // Clear input when workflow changes
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.value = ""
    }
  }, [selectedWorkflow])

  const handleSubmit = useCallback(
    (message: { text: string; files: unknown[] }) => {
      if (!message.text.trim() || isDisabled) {return}
      runWorkflow({ input: message.text.trim() })
    },
    [runWorkflow, isDisabled]
  )

  const handleQuickRun = useCallback(() => {
    if (isDisabled) {return}
    const inputText = textareaRef.current?.value?.trim()
    const defaultInput = inputText ?? `Run ${workflowConfig?.name}`
    runWorkflow({ input: defaultInput })
  }, [runWorkflow, isDisabled, workflowConfig?.name])

  const handleExampleClick = useCallback((example: string) => {
    if (textareaRef.current) {
      textareaRef.current.value = example
      textareaRef.current.focus()
    }
  }, [])

  const getPlaceholder = () => {
    if (!workflowConfig) {return "Awaiting Engine selection..."}

    switch (workflowConfig.category) {
      case "content":
        return "Initialize content generation parameters..."
      case "financial":
        return "Input ticker symbol for market analysis..."
      case "research":
        return "Define research query or intelligence objective..."
      case "data":
        return "Set source path for ingest pipeline..."
      case "utility":
        return "Configure utility input settings..."
      default:
        return `Initialize parameters for ${workflowConfig.name}...`
    }
  }

  const getExampleInputs = () => {
    if (!workflowConfig) {return []}

    switch (workflowConfig.id) {
      case "weatherWorkflow":
        return ["San Francisco", "Tokyo", "London"]
      case "contentStudioWorkflow":
        return ["AI trends 2026", "Synthetic Media", "Neural UX"]
      case "stockAnalysisWorkflow":
      case "financialReportWorkflow":
        return ["AAPL", "NVDA", "MSTR"]
      case "researchSynthesisWorkflow":
        return ["Quantum computing 2026", "Bio-interfaces", "Fusion Energy"]
      case "documentProcessingWorkflow":
        return ["./internal/specs.pdf", "./cloud/manifest.json"]
      case "telephoneGameWorkflow":
        return ["Synthesize this context", "Mastra Engine v1.0"]
      case "changelogWorkflow":
        return ["v1.0.0..HEAD", "alpha..stable"]
      case "governedRagIndex":
        return ["Public Documents", "Security Tier 1"]
      case "dataAnalysisWorkflow":
        return ["Financial Dataset v2", "User metrics.csv"]
      case "automatedReportingWorkflow":
        return ["Annual Tech Review", "Quarterly Intelligence Report"]
      default:
        return ["Default Vector Input"]
    }
  }

  const examples = getExampleInputs()

  return (
    <Panel position="bottom-left" className="w-96 p-0 bg-card/40 backdrop-blur-3xl border-border/20 shadow-2xl rounded-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="relative border-b border-border/10 px-5 py-4 bg-muted/20 overflow-hidden">
        <div className="absolute top-0 right-0 p-2 opacity-5">
          <CpuIcon className="size-20 text-primary rotate-12" />
        </div>
        <div className="relative flex items-center gap-3">
          <div className="size-8 rounded-lg bg-primary/20 flex items-center justify-center border border-primary/30 shadow-[0_0_15px_rgba(var(--primary-rgb),0.2)]">
            <SparklesIcon className="size-4 text-primary" />
          </div>
          <div>
            <h3 className="font-bold text-xs uppercase tracking-[0.2em] text-foreground">Initiate Sequence</h3>
            <p className="text-[10px] text-muted-foreground font-medium mt-0.5 opacity-70">
              {workflowConfig?.id ?? "CORE_ID: NONE"}
            </p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        <PromptInput
          onSubmit={handleSubmit}
          className="rounded-xl border border-border/30 bg-background/20 shadow-inner group transition-all duration-300 focus-within:ring-1 focus-within:ring-primary/50"
        >
          <PromptInputTextarea
            ref={textareaRef}
            placeholder={getPlaceholder()}
            disabled={isDisabled}
            className="min-h-16 max-h-32 text-xs font-medium bg-transparent border-0 ring-0 focus:ring-0 placeholder:text-muted-foreground/40"
          />
          <PromptInputFooter className="bg-muted/5 border-t border-border/5">
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                <CommandIcon className="size-3 text-muted-foreground/30" />
                <span className="text-[9px] font-mono tracking-tighter text-muted-foreground/60">
                  {isRunning ? (
                    <span className="flex items-center gap-1 text-primary">
                      <Loader2Icon className="size-2.5 animate-spin" />
                      CORE_EXECUTING...
                    </span>
                  ) : isCompleted ? (
                    <span className="text-green-500 font-bold tracking-widest uppercase">SYC_DONE</span>
                  ) : isError ? (
                    <span className="text-red-500 font-bold tracking-widest uppercase">ERR_HALT</span>
                  ) : (
                    "CTL_ENTER TO FIRE"
                  )}
                </span>
              </div>
              <PromptInputSubmit disabled={isDisabled} className="h-7 w-7 rounded-lg bg-primary/90 hover:bg-primary shadow-lg shadow-primary/20 transition-all active:scale-95" />
            </div>
          </PromptInputFooter>
        </PromptInput>

        <AnimatePresence>
          {!isRunning && workflowConfig && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              <Button
                variant={isCompleted ? "default" : "outline"}
                size="sm"
                className={`w-full h-9 rounded-xl font-bold text-[10px] uppercase tracking-[0.2em] transition-all group overflow-hidden relative ${
                  isCompleted ? "bg-primary shadow-lg shadow-primary/30" : "bg-background/40 hover:bg-muted/20 border-border/30"
                }`}
                onClick={handleQuickRun}
                disabled={isDisabled}
              >
                <div className="absolute inset-0 bg-linear-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:animate-shimmer" />
                <PlayIcon className={`size-3 mr-2 transition-transform group-hover:scale-125 ${isCompleted ? "text-primary-foreground" : "text-primary"}`} />
                {isCompleted ? "Re-Deploy Unit" : "Engage Protocol"}
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        {examples.length > 0 && !isRunning && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="pt-4 border-t border-border/5 space-y-2"
          >
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-bold text-muted-foreground/50 uppercase tracking-[0.2em]">Quick Params</span>
              <div className="size-1 bg-primary/20 rounded-full" />
            </div>
            <div className="flex flex-wrap gap-2">
              {examples.slice(0, 3).map((example) => (
                <button
                  key={example}
                  onClick={() => handleExampleClick(example)}
                  className="text-[10px] px-3 py-1.5 rounded-lg bg-muted/10 hover:bg-primary/10 border border-border/20 text-foreground/70 hover:text-primary transition-all duration-300 truncate max-w-30 font-medium"
                  disabled={isDisabled}
                  title={example}
                >
                  {example}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </Panel>
  )
}
