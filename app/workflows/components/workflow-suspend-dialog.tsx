"use client"

import { useWorkflowContext } from "@/app/workflows/providers/workflow-context"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/ui/dialog"
import { Button } from "@/ui/button"
import { Input } from "@/ui/input"
import { Label } from "@/ui/label"
import { AlertTriangleIcon, CheckCircle2Icon, XCircleIcon } from "lucide-react"
import { useState } from "react"

export function WorkflowSuspendDialog() {
  const { suspendPayload, approveWorkflow, workflowStatus } = useWorkflowContext()
  const [approverName, setApproverName] = useState("")

  if (!suspendPayload || workflowStatus !== "paused") {
    return null
  }

  const handleApprove = () => {
    approveWorkflow(true, approverName.trim() || undefined)
  }

  const handleReject = () => {
    approveWorkflow(false, approverName.trim() || undefined)
  }

  return (
    <Dialog open={true}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangleIcon className="size-5 text-yellow-500" />
            Workflow Approval Required
          </DialogTitle>
          <DialogDescription>
            The workflow has paused and requires your approval to continue.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg border bg-yellow-50 dark:bg-yellow-950/20 p-4">
            <div className="flex items-start gap-3">
              <AlertTriangleIcon className="size-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-medium text-yellow-900 dark:text-yellow-100 mb-1">
                  Approval Request
                </h4>
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  {suspendPayload.message}
                </p>
                {suspendPayload.requestId && (
                  <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-2">
                    Request ID: {suspendPayload.requestId}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="approver-name">Your Name (Optional)</Label>
            <Input
              id="approver-name"
              placeholder="Enter your name..."
              value={approverName}
              onChange={(e) => setApproverName(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleReject}
            className="flex items-center gap-2"
          >
            <XCircleIcon className="size-4" />
            Reject
          </Button>
          <Button
            onClick={handleApprove}
            className="flex items-center gap-2"
          >
            <CheckCircle2Icon className="size-4" />
            Approve
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
