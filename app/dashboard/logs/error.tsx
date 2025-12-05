"use client"

import { useEffect } from "react"
import { ErrorFallback } from "../_components"

export default function LogsError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("Logs error:", error)
  }, [error])

  return (
    <ErrorFallback
      error={error}
      reset={reset}
      title="Failed to load logs"
      description="There was an error loading the logs. Please try again."
    />
  )
}
