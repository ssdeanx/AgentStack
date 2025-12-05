"use client"

import { useEffect } from "react"
import { ErrorFallback } from "../_components"

export default function AgentsError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("Agents error:", error)
  }, [error])

  return (
    <ErrorFallback
      error={error}
      reset={reset}
      title="Failed to load agents"
      description="There was an error loading the agents. Please try again."
    />
  )
}
