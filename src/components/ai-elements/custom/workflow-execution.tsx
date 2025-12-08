"use client";

import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import { Progress } from "@/ui/progress";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2Icon,
  ChevronRightIcon,
  CircleDotIcon,
  ClockIcon,
  PauseCircleIcon,
  PlayIcon,
  RefreshCwIcon,
  XCircleIcon,
  PartyPopperIcon,
  Loader2Icon,
} from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { useMemo } from "react";

export type StepStatus = "pending" | "running" | "completed" | "error" | "skipped";

export interface WorkflowStep {
  id: string;
  label: string;
  description?: string;
  status: StepStatus;
  duration?: number;
  output?: string;
}

export type WorkflowExecutionProps = ComponentProps<"div"> & {
  steps: WorkflowStep[];
  title?: string;
  onPause?: () => void;
  onResume?: () => void;
  onRetry?: () => void;
  isPaused?: boolean;
};

const stepStatusConfig: Record<
  StepStatus,
  { icon: ReactNode; color: string; bgColor: string }
> = {
  pending: {
    icon: <CircleDotIcon className="size-4" />,
    color: "text-muted-foreground",
    bgColor: "bg-muted",
  },
  running: {
    icon: <Loader2Icon className="size-4 animate-spin" />,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
  },
  completed: {
    icon: <CheckCircle2Icon className="size-4" />,
    color: "text-emerald-500",
    bgColor: "bg-emerald-500/10",
  },
  error: {
    icon: <XCircleIcon className="size-4" />,
    color: "text-red-500",
    bgColor: "bg-red-500/10",
  },
  skipped: {
    icon: <ChevronRightIcon className="size-4" />,
    color: "text-slate-400",
    bgColor: "bg-slate-500/10",
  },
};

function formatDuration(ms: number): string {
  if (ms < 1000) {return `${ms}ms`;}
  if (ms < 60000) {return `${(ms / 1000).toFixed(1)}s`;}
  return `${Math.floor(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`;
}

function StepItem({ step, index }: { step: WorkflowStep; index: number }) {
  const config = stepStatusConfig[step.status];

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.1 }}
      className={cn(
        "relative flex items-start gap-4 rounded-lg p-3 transition-all",
        config.bgColor,
        step.status === "running" && "ring-2 ring-blue-500/20"
      )}
    >
      <div
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-full",
          "border-2 transition-colors",
          config.color,
          step.status === "completed" && "border-emerald-500 bg-emerald-500/10",
          step.status === "running" && "border-blue-500 bg-blue-500/10",
          step.status === "error" && "border-red-500 bg-red-500/10",
          step.status === "pending" && "border-muted-foreground/30",
          step.status === "skipped" && "border-slate-400/30"
        )}
      >
        {config.icon}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "font-medium text-sm",
              step.status === "pending" && "text-muted-foreground"
            )}
          >
            {step.label}
          </span>
          {step.status === "completed" && step.duration !== undefined && (
            <Badge variant="secondary" className="text-xs">
              <ClockIcon className="mr-1 size-3" />
              {formatDuration(step.duration)}
            </Badge>
          )}
          {step.status === "running" && (
            <Badge
              variant="secondary"
              className="gap-1 bg-blue-500/10 text-blue-500"
            >
              <Loader2Icon className="size-3 animate-spin" />
              Running
            </Badge>
          )}
        </div>
        {step.description !== undefined && step.description !== "" && (
          <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">
            {step.description}
          </p>
        )}
        {step.output !== undefined && step.output !== "" && step.status === "completed" && (
          <p className="mt-1 text-xs text-muted-foreground/80 line-clamp-2">
            {step.output}
          </p>
        )}
      </div>
    </motion.div>
  );
}

export const WorkflowExecution = ({
  steps,
  title = "Workflow Progress",
  onPause,
  onResume,
  onRetry,
  isPaused = false,
  className,
  ...props
}: WorkflowExecutionProps) => {
  const { completed, total, hasError, isComplete, progress } = useMemo(() => {
    const completedSteps = steps.filter((s) => s.status === "completed").length;
    const errorSteps = steps.filter((s) => s.status === "error").length;
    const totalSteps = steps.length;
    const allComplete =
      completedSteps === totalSteps && totalSteps > 0;

    return {
      completed: completedSteps,
      total: totalSteps,
      hasError: errorSteps > 0,
      isComplete: allComplete,
      progress: totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0,
    };
  }, [steps]);

  const totalDuration = useMemo(() => {
    return steps.reduce((sum, step) => sum + (step.duration ?? 0), 0);
  }, [steps]);

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border bg-card shadow-sm",
        className
      )}
      {...props}
    >
      <div className="flex items-center justify-between border-b bg-muted/30 px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="font-medium text-sm">{title}</span>
          <Badge variant="secondary" className="gap-1">
            {completed}/{total} steps
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          {totalDuration > 0 && (
            <span className="text-xs text-muted-foreground">
              {formatDuration(totalDuration)}
            </span>
          )}
          {!isComplete && !hasError && (
            <>
              {isPaused ? (
                onResume && (
                  <Button size="sm" variant="ghost" onClick={onResume}>
                    <PlayIcon className="size-4" />
                  </Button>
                )
              ) : (
                onPause && (
                  <Button size="sm" variant="ghost" onClick={onPause}>
                    <PauseCircleIcon className="size-4" />
                  </Button>
                )
              )}
            </>
          )}
          {hasError && onRetry && (
            <Button size="sm" variant="ghost" onClick={onRetry}>
              <RefreshCwIcon className="size-4" />
            </Button>
          )}
        </div>
      </div>

      <div className="px-4 py-3">
        <div className="mb-4">
          <Progress value={progress} className="h-2" />
        </div>

        <div className="space-y-2">
          <AnimatePresence>
            {steps.map((step, index) => (
              <StepItem key={step.id} step={step} index={index} />
            ))}
          </AnimatePresence>
        </div>

        {isComplete && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mt-4 flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-emerald-500/10 to-green-500/10 py-4"
          >
            <PartyPopperIcon className="size-5 text-emerald-500" />
            <span className="font-medium text-emerald-600">
              Workflow completed successfully!
            </span>
          </motion.div>
        )}

        {hasError && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mt-4 flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-red-500/10 to-rose-500/10 py-4"
          >
            <XCircleIcon className="size-5 text-red-500" />
            <span className="font-medium text-red-600">
              Workflow encountered an error
            </span>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export type WorkflowStepTimeline = ComponentProps<"div"> & {
  steps: WorkflowStep[];
  orientation?: "horizontal" | "vertical";
};

export const WorkflowTimeline = ({
  steps,
  orientation = "vertical",
  className,
  ...props
}: WorkflowStepTimeline) => {
  if (orientation === "horizontal") {
    return (
      <div
        className={cn(
          "flex items-center gap-2 overflow-x-auto py-4",
          className
        )}
        {...props}
      >
        {steps.map((step, index) => {
          const config = stepStatusConfig[step.status];
          return (
            <div key={step.id} className="flex items-center">
              <div
                className={cn(
                  "flex items-center gap-2 rounded-full px-3 py-1.5",
                  config.bgColor,
                  config.color
                )}
              >
                {config.icon}
                <span className="whitespace-nowrap text-xs font-medium">
                  {step.label}
                </span>
              </div>
              {index < steps.length - 1 && (
                <ChevronRightIcon className="mx-1 size-4 text-muted-foreground/50" />
              )}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className={cn("space-y-1", className)} {...props}>
      {steps.map((step, index) => (
        <StepItem key={step.id} step={step} index={index} />
      ))}
    </div>
  );
};
