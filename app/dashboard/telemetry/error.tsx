"use client"

import { useEffect } from "react"
import { ErrorFallback } from "../_components"

export default function TelemetryError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("Telemetry error:", error)
  }, [error])

  return (
    <ErrorFallback
      error={error}
      reset={reset}
      title="Failed to load telemetry"
      description="There was an error loading the telemetry data. Please try again."
    />
  )
}
