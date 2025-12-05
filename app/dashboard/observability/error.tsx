"use client"

import { useEffect } from "react"
import { ErrorFallback } from "../_components"

export default function ObservabilityError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("Observability error:", error)
  }, [error])

  return (
    <ErrorFallback
      error={error}
      reset={reset}
      title="Failed to load traces"
      description="There was an error loading the observability data. Please try again."
    />
  )
}
