import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cn } from "@/lib/utils"

export interface HeadingProps extends React.HTMLAttributes<HTMLHeadingElement> {
  as?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6"
  size?: "xs" | "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "4xl"
  weight?: "normal" | "medium" | "semibold" | "bold"
  asChild?: boolean
}

const headingSizes = {
  xs: "text-xs",
  sm: "text-sm",
  md: "text-base",
  lg: "text-lg",
  xl: "text-xl",
  "2xl": "text-2xl",
  "3xl": "text-3xl",
  "4xl": "text-4xl sm:text-5xl",
}

const headingWeights = {
  normal: "font-normal",
  medium: "font-medium",
  semibold: "font-semibold",
  bold: "font-bold",
}

const defaultSizes: Record<string, keyof typeof headingSizes> = {
  h1: "4xl",
  h2: "3xl",
  h3: "2xl",
  h4: "xl",
  h5: "lg",
  h6: "md",
}

export function Heading({
  as: Tag = "h2",
  size,
  weight = "bold",
  asChild,
  className,
  children,
  ...props
}: HeadingProps) {
  const Comp: any = asChild ? Slot : Tag
  const resolvedSize = size || defaultSizes[Tag]

  return (
    <Comp
      className={cn(
        "tracking-tight text-foreground",
        headingSizes[resolvedSize],
        headingWeights[weight],
        className
      )}
      {...props}
    >
      {children}
    </Comp>
  )
}

export interface TextProps extends React.HTMLAttributes<HTMLParagraphElement> {
  as?: "p" | "span" | "div" | "label"
  size?: "xs" | "sm" | "md" | "lg" | "xl"
  weight?: "normal" | "medium" | "semibold" | "bold"
  color?: "default" | "muted" | "primary" | "destructive"
  leading?: "none" | "tight" | "snug" | "normal" | "relaxed" | "loose"
  asChild?: boolean
}

const textSizes = {
  xs: "text-xs",
  sm: "text-sm",
  md: "text-base",
  lg: "text-lg",
  xl: "text-xl",
}

const textWeights = {
  normal: "font-normal",
  medium: "font-medium",
  semibold: "font-semibold",
  bold: "font-bold",
}

const textColors = {
  default: "text-foreground",
  muted: "text-muted-foreground",
  primary: "text-primary",
  destructive: "text-destructive",
}

const textLeading = {
  none: "leading-none",
  tight: "leading-tight",
  snug: "leading-snug",
  normal: "leading-normal",
  relaxed: "leading-relaxed",
  loose: "leading-loose",
}

export function Text({
  as: Tag = "p",
  size = "md",
  weight = "normal",
  color = "default",
  leading = "normal",
  asChild,
  className,
  children,
  ...props
}: TextProps) {
  const Comp: any = asChild ? Slot : Tag

  return (
    <Comp
      className={cn(
        textSizes[size],
        textWeights[weight],
        textColors[color],
        textLeading[leading],
        className
      )}
      {...props}
    >
      {children}
    </Comp>
  )
}

export interface ProseProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: "sm" | "md" | "lg"
}

const proseSizes = {
  sm: "prose-sm",
  md: "prose",
  lg: "prose-lg",
}

export function Prose({ size = "md", className, children, ...props }: ProseProps) {
  return (
    <div
      className={cn(
        "prose dark:prose-invert max-w-none",
        proseSizes[size],
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export interface CodeProps extends React.HTMLAttributes<HTMLElement> {
  inline?: boolean
}

export function Code({ inline = true, className, children, ...props }: CodeProps) {
  if (inline) {
    return (
      <code
        className={cn(
          "relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm",
          className
        )}
        {...props}
      >
        {children}
      </code>
    )
  }

  return (
    <pre className={cn("overflow-x-auto rounded-lg bg-muted p-4", className)} {...props}>
      <code className="font-mono text-sm">{children}</code>
    </pre>
  )
}

export interface KbdProps extends React.HTMLAttributes<HTMLElement> {}

export function Kbd({ className, children, ...props }: KbdProps) {
  return (
    <kbd
      className={cn(
        "pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground",
        className
      )}
      {...props}
    >
      {children}
    </kbd>
  )
}
