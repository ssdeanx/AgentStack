"use client"

import * as React from "react"
import { ChevronDownIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface AccordionContextValue {
  openItems: string[]
  toggle: (value: string) => void
  type: "single" | "multiple"
}

const AccordionContext = React.createContext<AccordionContextValue | null>(null)

function useAccordionContext() {
  const context = React.useContext(AccordionContext)
  if (!context) {
    throw new Error("AccordionItem must be used within an Accordion")
  }
  return context
}

export interface AccordionProps extends React.HTMLAttributes<HTMLDivElement> {
  type?: "single" | "multiple"
  defaultValue?: string | string[]
  value?: string | string[]
  onValueChange?: (value: string | string[]) => void
  collapsible?: boolean
}

export function Accordion({
  type = "single",
  defaultValue,
  value,
  onValueChange,
  collapsible = true,
  className,
  children,
  ...props
}: AccordionProps) {
  const [internalOpen, setInternalOpen] = React.useState<string[]>(() => {
    if (defaultValue) {
      return Array.isArray(defaultValue) ? defaultValue : [defaultValue]
    }
    return []
  })

  const openItems = value !== undefined ? (Array.isArray(value) ? value : [value]) : internalOpen

  const toggle = React.useCallback(
    (itemValue: string) => {
      let newOpen: string[]

      if (type === "single") {
              if (openItems.includes(itemValue) && collapsible) {
                newOpen = []
              } else {
                newOpen = [itemValue]
              }
            }
      else if (openItems.includes(itemValue)) {
                newOpen = openItems.filter((v) => v !== itemValue)
              }
      else {
                newOpen = [...openItems, itemValue]
              }

      if (value === undefined) {
        setInternalOpen(newOpen)
      }
      onValueChange?.(type === "single" ? newOpen[0] || "" : newOpen)
    },
    [type, openItems, collapsible, value, onValueChange]
  )

  return (
    <AccordionContext.Provider value={{ openItems, toggle, type }}>
      <div className={cn("w-full", className)} {...props}>
        {children}
      </div>
    </AccordionContext.Provider>
  )
}

interface AccordionItemContextValue {
  value: string
  isOpen: boolean
}

const AccordionItemContext = React.createContext<AccordionItemContextValue | null>(null)

function useAccordionItemContext() {
  const context = React.useContext(AccordionItemContext)
  if (!context) {
    throw new Error("AccordionTrigger/AccordionContent must be used within an AccordionItem")
  }
  return context
}

export interface AccordionItemProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string
}

export function AccordionItem({ value, className, children, ...props }: AccordionItemProps) {
  const { openItems } = useAccordionContext()
  const isOpen = openItems.includes(value)

  return (
    <AccordionItemContext.Provider value={{ value, isOpen }}>
      <div className={cn("border-b", className)} {...props}>
        {children}
      </div>
    </AccordionItemContext.Provider>
  )
}

export interface AccordionTriggerProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {}

export function AccordionTrigger({
  className,
  children,
  ...props
}: AccordionTriggerProps) {
  const { toggle } = useAccordionContext()
  const { value, isOpen } = useAccordionItemContext()

  return (
    <button
      type="button"
      onClick={() => toggle(value)}
      className={cn(
        "flex flex-1 w-full items-center justify-between py-4 font-medium transition-all hover:underline",
        className
      )}
      data-state={isOpen ? "open" : "closed"}
      {...props}
    >
      {children}
      <ChevronDownIcon
        className={cn(
          "size-4 shrink-0 transition-transform duration-200",
          isOpen && "rotate-180"
        )}
      />
    </button>
  )
}

export interface AccordionContentProps extends React.HTMLAttributes<HTMLDivElement> {}

export function AccordionContent({
  className,
  children,
  ...props
}: AccordionContentProps) {
  const { isOpen } = useAccordionItemContext()

  return (
    <div
      className={cn(
        "overflow-hidden text-sm transition-all",
        isOpen ? "animate-accordion-down" : "animate-accordion-up hidden"
      )}
      {...props}
    >
      <div className={cn("pb-4 pt-0", className)}>{children}</div>
    </div>
  )
}
