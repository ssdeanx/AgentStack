"use client"

import { useEffect } from "react"
import { ErrorFallback } from "./_components"

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("Dashboard error:", error)
  }, [error])

  return <ErrorFallback error={error} reset={reset} />
}
