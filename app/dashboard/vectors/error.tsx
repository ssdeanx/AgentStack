"use client"

import { useEffect } from "react"
import { ErrorFallback } from "../_components"

export default function VectorsError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("Vectors error:", error)
  }, [error])

  return (
    <ErrorFallback
      error={error}
      reset={reset}
      title="Failed to load vectors"
      description="There was an error loading the vector indexes. Please try again."
    />
  )
}
