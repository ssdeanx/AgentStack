"use client"

import { Button } from "@/ui/button"
import { AlertCircle, RefreshCw } from "lucide-react"

interface ErrorFallbackProps {
  error: Error & { digest?: string }
  reset: () => void
  title?: string
  description?: string
}

export function ErrorFallback({
  error,
  reset,
  title = "Something went wrong",
  description,
}: ErrorFallbackProps) {
  return (
    <div className="flex h-full items-center justify-center p-6">
      <div className="text-center max-w-md">
        <AlertCircle className="mx-auto h-12 w-12 text-destructive mb-4" />
        <h2 className="text-xl font-semibold mb-2">{title}</h2>
        <p className="text-muted-foreground mb-4">
          {description || error.message || "An unexpected error occurred"}
        </p>
        {error.digest && (
          <p className="text-xs text-muted-foreground mb-4">
            Error ID: {error.digest}
          </p>
        )}
        <Button onClick={reset}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Try again
        </Button>
      </div>
    </div>
  )
}
