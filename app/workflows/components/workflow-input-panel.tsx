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
import { PlayIcon, Loader2Icon, SparklesIcon } from "lucide-react"
import { useCallback, useRef, useEffect } from "react"

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
    if (!workflowConfig) {return "Select a workflow..."}

    switch (workflowConfig.category) {
      case "content":
        return "Enter your topic or content idea..."
      case "financial":
        return "Enter stock symbol (e.g., AAPL, TSLA)..."
      case "research":
        return "Enter your research topic or question..."
      case "data":
        return "Enter document path or data source..."
      case "utility":
        return "Enter your input for the workflow..."
      default:
        return `Enter input for ${workflowConfig.name}...`
    }
  }

  const getExampleInputs = () => {
    if (!workflowConfig) {return []}

    switch (workflowConfig.id) {
      case "weatherWorkflow":
        return ["San Francisco", "Tokyo", "London"]
      case "contentStudioWorkflow":
        return ["AI trends 2025", "Remote work tips", "Sustainable tech"]
      case "stockAnalysisWorkflow":
      case "financialReportWorkflow":
        return ["AAPL", "TSLA", "NVDA"]
      case "researchSynthesisWorkflow":
        return ["ML best practices", "Climate solutions", "Future of AI"]
      case "documentProcessingWorkflow":
        return ["./docs/report.pdf", "./data/analysis.pdf"]
      case "telephoneGameWorkflow":
        return ["The quick brown fox", "Hello world"]
      case "changelogWorkflow":
        return ["main..HEAD", "v1.0.0..v2.0.0"]
      case "contentReviewWorkflow":
      case "learningExtractionWorkflow":
        return ["Paste your content here"]
      default:
        return []
    }
  }

  const examples = getExampleInputs()

  return (
    <Panel position="bottom-left" className="w-96 p-0">
      <div className="border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <SparklesIcon className="size-4 text-primary" />
          <h3 className="font-semibold text-sm">Workflow Input</h3>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {workflowConfig?.description ?? "Select a workflow to get started"}
        </p>
      </div>

      <div className="p-3">
        <PromptInput
          onSubmit={handleSubmit}
          className="rounded-lg border shadow-sm"
        >
          <PromptInputTextarea
            ref={textareaRef}
            placeholder={getPlaceholder()}
            disabled={isDisabled}
            className="min-h-15 max-h-30"
          />
          <PromptInputFooter>
            <div className="flex items-center justify-between w-full">
              <span className="text-xs text-muted-foreground">
                {isRunning ? (
                  <span className="flex items-center gap-1">
                    <Loader2Icon className="size-3 animate-spin" />
                    Processing...
                  </span>
                ) : isCompleted ? (
                  <span className="text-green-600 dark:text-green-400">✓ Complete</span>
                ) : isError ? (
                  <span className="text-red-600 dark:text-red-400">✗ Error</span>
                ) : (
                  "Press Enter to run"
                )}
              </span>
              <PromptInputSubmit disabled={isDisabled} className="h-8" />
            </div>
          </PromptInputFooter>
        </PromptInput>

        {/* Quick run button */}
        {!isRunning && workflowConfig && (
          <Button
            variant={isCompleted ? "default" : "outline"}
            size="sm"
            className="w-full mt-2 h-8"
            onClick={handleQuickRun}
            disabled={isDisabled}
          >
            <PlayIcon className="size-3 mr-2" />
            {isCompleted ? "Run Again" : "Quick Run"}
          </Button>
        )}

        {/* Example inputs */}
        {examples.length > 0 && !isRunning && (
          <div className="mt-3 pt-3 border-t">
            <span className="text-xs text-muted-foreground">Examples:</span>
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {examples.slice(0, 3).map((example) => (
                <button
                  key={example}
                  onClick={() => handleExampleClick(example)}
                  className="text-xs px-2 py-1 rounded-md bg-secondary hover:bg-secondary/80 transition-colors truncate max-w-30"
                  disabled={isDisabled}
                  title={example}
                >
                  {example}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </Panel>
  )
}
