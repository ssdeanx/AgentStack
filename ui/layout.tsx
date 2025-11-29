import * as React from "react"
import { cn } from "@/lib/utils"

export interface ContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: "sm" | "md" | "lg" | "xl" | "full"
}

const containerSizes = {
  sm: "max-w-screen-sm",
  md: "max-w-screen-md",
  lg: "max-w-screen-lg",
  xl: "max-w-screen-xl",
  full: "max-w-full",
}

export function Container({
  size = "xl",
  className,
  children,
  ...props
}: ContainerProps) {
  return (
    <div
      className={cn("mx-auto w-full px-4 sm:px-6 lg:px-8", containerSizes[size], className)}
      {...props}
    >
      {children}
    </div>
  )
}

export interface SectionProps extends React.HTMLAttributes<HTMLElement> {
  size?: "sm" | "md" | "lg" | "xl"
}

const sectionPadding = {
  sm: "py-8 md:py-12",
  md: "py-12 md:py-16",
  lg: "py-16 md:py-24",
  xl: "py-24 md:py-32",
}

export function Section({
  size = "lg",
  className,
  children,
  ...props
}: SectionProps) {
  return (
    <section className={cn(sectionPadding[size], className)} {...props}>
      {children}
    </section>
  )
}

export interface StackProps extends React.HTMLAttributes<HTMLDivElement> {
  direction?: "row" | "column"
  gap?: "none" | "xs" | "sm" | "md" | "lg" | "xl"
  align?: "start" | "center" | "end" | "stretch" | "baseline"
  justify?: "start" | "center" | "end" | "between" | "around" | "evenly"
  wrap?: boolean
}

const gapClasses = {
  none: "gap-0",
  xs: "gap-1",
  sm: "gap-2",
  md: "gap-4",
  lg: "gap-6",
  xl: "gap-8",
}

const alignClasses = {
  start: "items-start",
  center: "items-center",
  end: "items-end",
  stretch: "items-stretch",
  baseline: "items-baseline",
}

const justifyClasses = {
  start: "justify-start",
  center: "justify-center",
  end: "justify-end",
  between: "justify-between",
  around: "justify-around",
  evenly: "justify-evenly",
}

export function Stack({
  direction = "column",
  gap = "md",
  align = "stretch",
  justify = "start",
  wrap = false,
  className,
  children,
  ...props
}: StackProps) {
  return (
    <div
      className={cn(
        "flex",
        direction === "row" ? "flex-row" : "flex-col",
        gapClasses[gap],
        alignClasses[align],
        justifyClasses[justify],
        wrap && "flex-wrap",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export function HStack(props: Omit<StackProps, "direction">) {
  return <Stack direction="row" {...props} />
}

export function VStack(props: Omit<StackProps, "direction">) {
  return <Stack direction="column" {...props} />
}

export interface GridProps extends React.HTMLAttributes<HTMLDivElement> {
  cols?: 1 | 2 | 3 | 4 | 5 | 6 | 12
  gap?: "none" | "xs" | "sm" | "md" | "lg" | "xl"
  responsive?: boolean
}

const colClasses = {
  1: "grid-cols-1",
  2: "grid-cols-2",
  3: "grid-cols-3",
  4: "grid-cols-4",
  5: "grid-cols-5",
  6: "grid-cols-6",
  12: "grid-cols-12",
}

const responsiveColClasses = {
  1: "grid-cols-1",
  2: "grid-cols-1 sm:grid-cols-2",
  3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
  4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
  5: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-5",
  6: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-6",
  12: "grid-cols-4 sm:grid-cols-6 lg:grid-cols-12",
}

export function Grid({
  cols = 3,
  gap = "md",
  responsive = true,
  className,
  children,
  ...props
}: GridProps) {
  return (
    <div
      className={cn(
        "grid",
        responsive ? responsiveColClasses[cols] : colClasses[cols],
        gapClasses[gap],
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export interface CenterProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Center({ className, children, ...props }: CenterProps) {
  return (
    <div
      className={cn("flex items-center justify-center", className)}
      {...props}
    >
      {children}
    </div>
  )
}

export interface SpacerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: "xs" | "sm" | "md" | "lg" | "xl" | "2xl"
}

const spacerSizes = {
  xs: "h-2",
  sm: "h-4",
  md: "h-8",
  lg: "h-12",
  xl: "h-16",
  "2xl": "h-24",
}

export function Spacer({ size = "md", className, ...props }: SpacerProps) {
  return <div className={cn(spacerSizes[size], className)} {...props} />
}
