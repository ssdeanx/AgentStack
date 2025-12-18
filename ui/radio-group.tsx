"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface RadioGroupContextValue {
  value: string
  // eslint-disable-next-line no-unused-vars
  onChange: (value: string) => void
  name: string
}

const RadioGroupContext = React.createContext<RadioGroupContextValue | null>(null)

function useRadioGroupContext() {
  const context = React.useContext(RadioGroupContext)
  if (!context) {
    throw new Error("RadioGroupItem must be used within a RadioGroup")
  }
  return context
}

export interface RadioGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: string
  defaultValue?: string
  // eslint-disable-next-line no-unused-vars
  onValueChange?: (value: string) => void
  name?: string
}

export function RadioGroup({
  value,
  defaultValue = "",
  onValueChange,
  name = "radio-group",
  className,
  children,
  ...props
}: RadioGroupProps) {
  const [internalValue, setInternalValue] = React.useState(defaultValue)
  const controlledValue = value ?? internalValue

  const onChange = React.useCallback(
    (newValue: string) => {
      if (value === undefined) {
        setInternalValue(newValue)
      }
      onValueChange?.(newValue)
    },
    [value, onValueChange]
  )

  return (
    <RadioGroupContext.Provider value={{ value: controlledValue, onChange, name }}>
      <div className={cn("grid gap-2", className)} role="radiogroup" {...props}>
        {children}
      </div>
    </RadioGroupContext.Provider>
  )
}

export interface RadioGroupItemProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type" | "name" | "checked" | "onChange"> {
  value: string
}

export const RadioGroupItem = React.forwardRef<HTMLInputElement, RadioGroupItemProps>(
  ({ value, className, ...props }, ref) => {
    const { value: groupValue, onChange, name } = useRadioGroupContext()
    const isChecked = groupValue === value

    return (
      <label className="relative inline-flex cursor-pointer items-center">
        <input
          type="radio"
          name={name}
          value={value}
          checked={isChecked}
          onChange={() => onChange(value)}
          className="peer sr-only"
          ref={ref}
          {...props}
        />
        <div
          className={cn(
            "flex size-4 items-center justify-center rounded-full border border-primary ring-offset-background transition-colors",
            "peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2",
            "peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
            className
          )}
        >
          <div
            className={cn(
              "size-2.5 rounded-full bg-primary opacity-0 transition-opacity",
              isChecked && "opacity-100"
            )}
          />
        </div>
      </label>
    )
  }
)
RadioGroupItem.displayName = "RadioGroupItem"
