"use client"

import { cn } from "@/lib/utils"
import { Button } from "@/ui/button"
import { ScrollArea } from "@/ui/scroll-area"
import { X } from "lucide-react"
import { useEffect, useCallback } from "react"

interface DetailPanelProps {
  open: boolean
  onClose: () => void
  title?: string
  description?: string
  children: React.ReactNode
  width?: "sm" | "md" | "lg" | "xl"
  className?: string
}

const widthClasses = {
  sm: "w-80",
  md: "w-96",
  lg: "w-[480px]",
  xl: "w-[600px]",
}

export function DetailPanel({
  open,
  onClose,
  title,
  description,
  children,
  width = "lg",
  className,
}: DetailPanelProps) {
  const handleEscape = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose()
      }
    },
    [onClose]
  )

  useEffect(() => {
    if (open) {
      document.addEventListener("keydown", handleEscape)
      return () => document.removeEventListener("keydown", handleEscape)
    }
  }, [open, handleEscape])

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          "fixed inset-0 bg-background/80 backdrop-blur-sm z-40 transition-opacity",
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className={cn(
          "fixed top-0 right-0 h-full bg-card border-l shadow-lg z-50 transition-transform duration-300",
          widthClasses[width],
          open ? "translate-x-0" : "translate-x-full",
          className
        )}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-start justify-between p-4 border-b">
            <div className="space-y-1">
              {title && <h2 className="text-lg font-semibold">{title}</h2>}
              {description && (
                <p className="text-sm text-muted-foreground">{description}</p>
              )}
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Content */}
          <ScrollArea className="flex-1">
            <div className="p-4">{children}</div>
          </ScrollArea>
        </div>
      </div>
    </>
  )
}
