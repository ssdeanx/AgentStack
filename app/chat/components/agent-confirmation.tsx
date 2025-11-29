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
import type { ToolUIPart } from "ai"
import { CheckIcon, XIcon, AlertTriangleIcon } from "lucide-react"

interface AgentConfirmationProps {
  toolName: string
  description: string
  approval: ConfirmationProps["approval"]
  state: ToolUIPart["state"]
  onApprove: (approvalId: string) => void
  onReject: (approvalId: string) => void
}

export function AgentConfirmation({
  toolName,
  description,
  approval,
  state,
  onApprove,
  onReject,
}: AgentConfirmationProps) {
  if (!approval) return null

  return (
    <Confirmation approval={approval} state={state}>
      <ConfirmationRequest>
        <div className="flex items-start gap-2">
          <AlertTriangleIcon className="size-4 text-yellow-500 mt-0.5 shrink-0" />
          <div>
            <p className="font-medium text-sm">
              Tool <code className="bg-muted px-1 rounded">{toolName}</code> requires approval
            </p>
            <p className="text-sm text-muted-foreground mt-1">{description}</p>
          </div>
        </div>
      </ConfirmationRequest>
      <ConfirmationAccepted>
        <div className="flex items-center gap-2 text-green-600">
          <CheckIcon className="size-4" />
          <span className="text-sm">Tool execution approved</span>
        </div>
      </ConfirmationAccepted>
      <ConfirmationRejected>
        <div className="flex items-center gap-2 text-red-600">
          <XIcon className="size-4" />
          <span className="text-sm">Tool execution rejected</span>
        </div>
      </ConfirmationRejected>
      <ConfirmationActions>
        <ConfirmationAction
          variant="outline"
          onClick={() => approval?.id && onReject(approval.id)}
        >
          Reject
        </ConfirmationAction>
        <ConfirmationAction
          variant="default"
          onClick={() => approval?.id && onApprove(approval.id)}
        >
          Approve
        </ConfirmationAction>
      </ConfirmationActions>
    </Confirmation>
  )
}
