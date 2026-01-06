"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string
  alt?: string
  fallback?: string
  size?: "sm" | "md" | "lg" | "xl"
}

const sizeClasses = {
  sm: "size-8 text-xs",
  md: "size-10 text-sm",
  lg: "size-12 text-base",
  xl: "size-16 text-lg",
}

export function Avatar({
  src,
  alt = "",
  fallback,
  size = "md",
  className,
  ...props
}: AvatarProps) {
  const [hasError, setHasError] = React.useState(false)

  const initials = fallback ?? alt?.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()

  return (
    <div
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted",
        sizeClasses[size],
        className
      )}
      {...props}
    >
      {(src !== null) && !hasError ? (
        <img
          src={src}
          alt={alt}
          className="aspect-square size-full object-cover"
          onError={() => setHasError(true)}
        />
      ) : (
        <span className="font-medium text-muted-foreground">{initials}</span>
      )}
    </div>
  )
}

export function AvatarGroup({
  children,
  max = 4,
  className,
}: {
  children: React.ReactNode
  max?: number
  className?: string
}) {
  const childArray = React.Children.toArray(children)
  const visibleChildren = childArray.slice(0, max)
  const remaining = childArray.length - max

  return (
    <div className={cn("flex -space-x-3", className)}>
      {visibleChildren.map((child, index) => (
        <div key={index} className="ring-2 ring-background rounded-full">
          {child}
        </div>
      ))}
      {remaining > 0 && (
        <div className="flex size-10 items-center justify-center rounded-full bg-muted ring-2 ring-background">
          <span className="text-xs font-medium text-muted-foreground">+{remaining}</span>
        </div>
      )}
    </div>
  )
}
