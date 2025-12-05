"use client"

import { useEffect } from "react"
import { ErrorFallback } from "../_components"

export default function WorkflowsError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("Workflows error:", error)
  }, [error])

  return (
    <ErrorFallback
      error={error}
      reset={reset}
      title="Failed to load workflows"
      description="There was an error loading the workflows. Please try again."
    />
  )
}
