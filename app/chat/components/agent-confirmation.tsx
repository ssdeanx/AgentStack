"use client"

import {
  Confirmation,
  ConfirmationRequest,
  ConfirmationAccepted,
  ConfirmationRejected,
  ConfirmationActions,
  ConfirmationAction,
  type ConfirmationProps,
} from "@/src/components/ai-elements/confirmation"
import { Badge } from "@/ui/badge"
import type { ToolUIPart } from "ai"
import {
  CheckIcon,
  XIcon,
  AlertTriangleIcon,
  ShieldAlertIcon,
  InfoIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"

export type ConfirmationSeverity = "info" | "warning" | "danger"

interface AgentConfirmationProps {
  toolName: string
  description: string
  approval: ConfirmationProps["approval"]
  state: ToolUIPart["state"]
  onApprove: (approvalId: string) => void
  onReject: (approvalId: string) => void
  severity?: ConfirmationSeverity
  className?: string
}

const severityConfig: Record<ConfirmationSeverity, {
  icon: typeof AlertTriangleIcon
  iconClass: string
  badgeVariant: "secondary" | "outline" | "destructive"
  label: string
}> = {
  info: {
    icon: InfoIcon,
    iconClass: "text-blue-500",
    badgeVariant: "secondary",
    label: "Confirmation Required",
  },
  warning: {
    icon: AlertTriangleIcon,
    iconClass: "text-yellow-500",
    badgeVariant: "outline",
    label: "Review Required",
  },
  danger: {
    icon: ShieldAlertIcon,
    iconClass: "text-destructive",
    badgeVariant: "destructive",
    label: "Danger Zone",
  },
}

function inferSeverity(toolName: string, description: string): ConfirmationSeverity {
  const lower = (toolName + description).toLowerCase()
  if (lower.includes("delete") || lower.includes("remove") || lower.includes("destroy")) {
    return "danger"
  }
  if (lower.includes("modify") || lower.includes("update") || lower.includes("write")) {
    return "warning"
  }
  return "info"
}

export function AgentConfirmation({
  toolName,
  description,
  approval,
  state,
  onApprove,
  onReject,
  severity,
  className,
}: AgentConfirmationProps) {
  if (!approval) {return null}

  const effectiveSeverity = severity ?? inferSeverity(toolName, description)
  const config = severityConfig[effectiveSeverity]
  const Icon = config.icon

  return (
    <Confirmation approval={approval} state={state} className={className}>
      <ConfirmationRequest>
        <div className="flex items-start gap-3">
          <div className={cn("mt-0.5 shrink-0", config.iconClass)}>
            <Icon className="size-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-medium text-sm">
                Tool <code className="bg-muted px-1.5 py-0.5 rounded text-xs">{toolName}</code>
              </p>
              <Badge variant={config.badgeVariant} className="text-xs">
                {config.label}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
              {description}
            </p>
          </div>
        </div>
      </ConfirmationRequest>
      <ConfirmationAccepted>
        <div className="flex items-center gap-2 text-green-600 bg-green-500/10 px-3 py-2 rounded-md">
          <CheckIcon className="size-4" />
          <span className="text-sm font-medium">Approved - Tool execution started</span>
        </div>
      </ConfirmationAccepted>
      <ConfirmationRejected>
        <div className="flex items-center gap-2 text-red-600 bg-red-500/10 px-3 py-2 rounded-md">
          <XIcon className="size-4" />
          <span className="text-sm font-medium">Rejected - Tool execution cancelled</span>
        </div>
      </ConfirmationRejected>
      <ConfirmationActions>
        <ConfirmationAction
          variant="outline"
          onClick={() => approval?.id && onReject(approval.id)}
        >
          <XIcon className="size-4 mr-1.5" />
          Reject
        </ConfirmationAction>
        <ConfirmationAction
          variant={effectiveSeverity === "danger" ? "destructive" : "default"}
          onClick={() => approval?.id && onApprove(approval.id)}
        >
          <CheckIcon className="size-4 mr-1.5" />
          Approve
        </ConfirmationAction>
      </ConfirmationActions>
    </Confirmation>
  )
}
