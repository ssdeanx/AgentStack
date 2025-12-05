"use client"

import { useAgentEvalsQuery } from "@/lib/hooks/use-dashboard-queries"
import { Badge } from "@/ui/badge"
import { CheckCircle2, XCircle, Activity } from "lucide-react"
import { LoadingSkeleton, EmptyState } from "../../_components"

interface AgentEvalsTabProps {
  agentId: string
}

export function AgentEvalsTab({ agentId }: AgentEvalsTabProps) {
  const { data: evals, isLoading, error } = useAgentEvalsQuery(agentId)

  if (isLoading) {
    return <LoadingSkeleton variant="list" count={4} />
  }

  if (error) {
    return (
      <EmptyState
        icon={Activity}
        title="Failed to load evaluations"
        description={error.message}
      />
    )
  }

  const hasEvals =
    (evals?.ci && evals.ci.length > 0) || (evals?.live && evals.live.length > 0)

  if (!hasEvals) {
    return (
      <EmptyState
        icon={Activity}
        title="No evaluations"
        description="This agent doesn't have any evaluations configured"
      />
    )
  }

  return (
    <div className="space-y-6">
      {evals?.ci && evals.ci.length > 0 && (
        <div>
          <h4 className="text-sm font-medium mb-3">CI Evaluations</h4>
          <div className="space-y-2">
            {evals.ci.map((evaluation, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 rounded-md border"
              >
                <div className="flex items-center gap-3">
                  {evaluation.passed ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-500" />
                  )}
                  <span className="font-medium">{evaluation.name || `Eval ${index + 1}`}</span>
                </div>
                <div className="flex items-center gap-2">
                  {evaluation.score !== undefined && (
                    <Badge variant="outline">{(evaluation.score * 100).toFixed(0)}%</Badge>
                  )}
                  <Badge variant={evaluation.passed ? "default" : "destructive"}>
                    {evaluation.passed ? "Passed" : "Failed"}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {evals?.live && evals.live.length > 0 && (
        <div>
          <h4 className="text-sm font-medium mb-3">Live Evaluations</h4>
          <div className="space-y-2">
            {evals.live.map((evaluation, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 rounded-md border"
              >
                <div className="flex items-center gap-3">
                  <Activity className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{evaluation.name || `Live Eval ${index + 1}`}</span>
                </div>
                <div className="flex items-center gap-2">
                  {evaluation.score !== undefined && (
                    <Badge variant="outline">{(evaluation.score * 100).toFixed(0)}%</Badge>
                  )}
                  {evaluation.status && (
                    <Badge variant="secondary">{evaluation.status}</Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
