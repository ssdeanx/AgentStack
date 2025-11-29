import * as React from "react"
import { cn } from "@/lib/utils"

export interface DividerProps extends React.HTMLAttributes<HTMLDivElement> {
  orientation?: "horizontal" | "vertical"
  decorative?: boolean
  label?: string
}

export function Divider({
  orientation = "horizontal",
  decorative = true,
  label,
  className,
  ...props
}: DividerProps) {
  const ariaProps = decorative
    ? {}
    : ({ role: "separator", "aria-orientation": orientation } as React.HTMLAttributes<HTMLDivElement>)

  if (label) {
    return (
      <div className={cn("flex items-center gap-4", className)} {...ariaProps} {...props}>
        <div className="h-px flex-1 bg-border" />
        <span className="text-muted-foreground text-sm">{label}</span>
        <div className="h-px flex-1 bg-border" />
      </div>
    )
  }

  return (
    <div
      className={cn(
        orientation === "horizontal" ? "h-px w-full bg-border" : "h-full w-px bg-border",
        className
      )}
      {...ariaProps}
      {...props}
    />
  )
}

export interface AspectRatioProps extends React.HTMLAttributes<HTMLDivElement> {
  ratio?: number
}

const ratioClasses: Record<string, string> = {
  "1": "aspect-square",
  "1.333": "aspect-[4/3]",
  "1.778": "aspect-video",
  "2.333": "aspect-[21/9]",
}

export function AspectRatio({
  ratio = 16 / 9,
  className,
  children,
  ...props
}: AspectRatioProps) {
  const ratioKey = ratio.toFixed(3)
  const aspectClass = ratioClasses[ratioKey] || `aspect-[${ratio}]`
  
  return (
    <div
      className={cn("relative w-full", aspectClass, className)}
      {...props}
    >
      {children}
    </div>
  )
}

export interface VisuallyHiddenProps extends React.HTMLAttributes<HTMLSpanElement> {}

export function VisuallyHidden({ children, ...props }: VisuallyHiddenProps) {
  return (
    <span
      className="sr-only"
      {...props}
    >
      {children}
    </span>
  )
}

export interface ScreenReaderOnlyProps extends React.HTMLAttributes<HTMLSpanElement> {}

export function ScreenReaderOnly({ className, ...props }: ScreenReaderOnlyProps) {
  return <span className={cn("sr-only", className)} {...props} />
}
