"use client"

import { useEffect } from "react"
import { ErrorFallback } from "../_components"

export default function ToolsError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("Tools error:", error)
  }, [error])

  return (
    <ErrorFallback
      error={error}
      reset={reset}
      title="Failed to load tools"
      description="There was an error loading the tools. Please try again."
    />
  )
}
