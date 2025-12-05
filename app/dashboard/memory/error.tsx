"use client"

import { useEffect } from "react"
import { ErrorFallback } from "../_components"

export default function MemoryError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("Memory error:", error)
  }, [error])

  return (
    <ErrorFallback
      error={error}
      reset={reset}
      title="Failed to load memory"
      description="There was an error loading the memory data. Please try again."
    />
  )
}
