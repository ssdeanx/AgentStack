"use client";

import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/ui/collapsible";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/ui/tooltip";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2Icon,
  ChevronDownIcon,
  ClockIcon,
  CopyIcon,
  RefreshCwIcon,
  WrenchIcon,
  XCircleIcon,
  ZapIcon,
  AlertTriangleIcon,
} from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { useState } from "react";
import { CodeBlock } from "../code-block";

export type ToolExecutionStatus =
  | "pending"
  | "running"
  | "success"
  | "error"
  | "warning";

export type ToolExecutionCardProps = ComponentProps<typeof Collapsible> & {
  name: string;
  status: ToolExecutionStatus;
  duration?: number;
  input?: Record<string, unknown>;
  output?: unknown;
  error?: string;
  onRetry?: () => void;
};

const statusConfig: Record<
  ToolExecutionStatus,
  {
    icon: ReactNode;
    label: string;
    gradient: string;
    bgGradient: string;
    borderColor: string;
  }
> = {
  pending: {
    icon: <ClockIcon className="size-4" />,
    label: "Pending",
    gradient: "from-slate-400 to-slate-500",
    bgGradient: "from-slate-500/10 to-slate-600/5",
    borderColor: "border-slate-500/30",
  },
  running: {
    icon: <ZapIcon className="size-4 animate-pulse" />,
    label: "Running",
    gradient: "from-blue-400 to-cyan-500",
    bgGradient: "from-blue-500/10 to-cyan-500/5",
    borderColor: "border-blue-500/30",
  },
  success: {
    icon: <CheckCircle2Icon className="size-4" />,
    label: "Success",
    gradient: "from-emerald-400 to-green-500",
    bgGradient: "from-emerald-500/10 to-green-500/5",
    borderColor: "border-emerald-500/30",
  },
  error: {
    icon: <XCircleIcon className="size-4" />,
    label: "Error",
    gradient: "from-red-400 to-rose-500",
    bgGradient: "from-red-500/10 to-rose-500/5",
    borderColor: "border-red-500/30",
  },
  warning: {
    icon: <AlertTriangleIcon className="size-4" />,
    label: "Warning",
    gradient: "from-amber-400 to-orange-500",
    bgGradient: "from-amber-500/10 to-orange-500/5",
    borderColor: "border-amber-500/30",
  },
};

function formatDuration(ms: number): string {
  if (ms < 1000) {return `${ms}ms`;}
  return `${(ms / 1000).toFixed(2)}s`;
}

function formatToolName(name: string): string {
  return name
    .replace(/([A-Z])/g, " $1")
    .replace(/_/g, " ")
    .replace(/-/g, " ")
    .trim()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

export const ToolExecutionCard = ({
  name,
  status,
  duration,
  input,
  output,
  error,
  onRetry,
  className,
  defaultOpen = false,
  ...props
}: ToolExecutionCardProps) => {
  const [copied, setCopied] = useState(false);
  const config = statusConfig[status];

  const handleCopy = async () => {
    const data = { name, status, input, output, error };
    await navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Collapsible
      defaultOpen={defaultOpen || status === "error"}
      className={cn("group w-full", className)}
      {...props}
    >
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          "overflow-hidden rounded-xl border backdrop-blur-sm transition-all",
          "bg-linear-to-r",
          config.bgGradient,
          config.borderColor,
          "hover:shadow-lg hover:shadow-black/5"
        )}
      >
        <CollapsibleTrigger className="flex w-full items-center justify-between gap-4 p-4">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "flex size-8 items-center justify-center rounded-lg",
                "bg-linear-to-br text-white shadow-sm",
                config.gradient
              )}
            >
              <WrenchIcon className="size-4" />
            </div>
            <div className="text-left">
              <span className="font-medium text-sm">{formatToolName(name)}</span>
              {duration !== undefined && status === "success" && (
                <span className="ml-2 text-xs text-muted-foreground">
                  {formatDuration(duration)}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge
              variant="secondary"
              className={cn(
                "gap-1.5 rounded-full border-0 px-2.5 py-0.5",
                "bg-linear-to-r text-white shadow-sm",
                config.gradient
              )}
            >
              {config.icon}
              <span className="text-xs font-medium">{config.label}</span>
            </Badge>
            <ChevronDownIcon
              className={cn(
                "size-4 text-muted-foreground transition-transform duration-200",
                "group-data-[state=open]:rotate-180"
              )}
            />
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <AnimatePresence>
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="border-t border-border/50"
            >
              {status === "running" && (
                <div className="px-4 pt-3">
                  <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
                    <motion.div
                      className={cn("h-full bg-linear-to-r", config.gradient)}
                      animate={{ x: ["-100%", "100%"] }}
                      transition={{
                        duration: 1.5,
                        repeat: Infinity,
                        ease: "easeInOut",
                      }}
                      style={{ width: "50%" }}
                    />
                  </div>
                </div>
              )}

              {input && Object.keys(input).length > 0 && (
                <div className="space-y-2 p-4">
                  <h4 className="flex items-center gap-2 font-medium text-xs uppercase tracking-wide text-muted-foreground">
                    <span>Input</span>
                  </h4>
                  <div className="overflow-hidden rounded-lg border bg-background/50">
                    <CodeBlock
                      code={JSON.stringify(input, null, 2)}
                      language="json"
                    />
                  </div>
                </div>
              )}

              {error !== undefined && error !== "" && (
                <div className="space-y-2 p-4">
                  <h4 className="font-medium text-xs uppercase tracking-wide text-destructive">
                    Error
                  </h4>
                  <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3">
                    <p className="text-sm text-destructive">{error}</p>
                  </div>
                </div>
              )}

              {output !== undefined && (error === undefined || error === "") && (
                <div className="space-y-2 p-4">
                  <h4 className="font-medium text-xs uppercase tracking-wide text-muted-foreground">
                    Output
                  </h4>
                  <div className="overflow-hidden rounded-lg border bg-background/50">
                    <CodeBlock
                      code={
                        typeof output === "string"
                          ? output
                          : JSON.stringify(output, null, 2)
                      }
                      language="json"
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 border-t border-border/50 px-4 py-2">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 gap-1.5"
                        onClick={handleCopy}
                      >
                        <CopyIcon className="size-3.5" />
                        <span className="text-xs">
                          {copied ? "Copied!" : "Copy"}
                        </span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Copy tool data</TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                {status === "error" && onRetry && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 gap-1.5"
                    onClick={onRetry}
                  >
                    <RefreshCwIcon className="size-3.5" />
                    <span className="text-xs">Retry</span>
                  </Button>
                )}
              </div>
            </motion.div>
          </AnimatePresence>
        </CollapsibleContent>
      </motion.div>
    </Collapsible>
  );
};

export type ToolExecutionListProps = ComponentProps<"div"> & {
  tools: Array<{
    id: string;
    name: string;
    status: ToolExecutionStatus;
    duration?: number;
    input?: Record<string, unknown>;
    output?: unknown;
    error?: string;
  }>;
  onRetry?: (toolId: string) => void;
};

export const ToolExecutionList = ({
  tools,
  onRetry,
  className,
  ...props
}: ToolExecutionListProps) => (
  <div className={cn("space-y-3", className)} {...props}>
    {tools.map((tool) => (
      <ToolExecutionCard
        key={tool.id}
        name={tool.name}
        status={tool.status}
        duration={tool.duration}
        input={tool.input}
        output={tool.output}
        error={tool.error}
        onRetry={onRetry ? () => onRetry(tool.id) : undefined}
      />
    ))}
  </div>
);
