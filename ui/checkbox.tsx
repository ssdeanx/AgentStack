"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { CheckIcon } from "lucide-react"

export interface CheckboxProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  onCheckedChange?: (checked: boolean) => void
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, checked, defaultChecked, onCheckedChange, onChange, ...props }, ref) => {
    const [isChecked, setIsChecked] = React.useState(defaultChecked ?? false)
    const controlledChecked = checked !== undefined ? checked : isChecked

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newChecked = e.target.checked
      if (checked === undefined) {
        setIsChecked(newChecked)
      }
      onCheckedChange?.(newChecked)
      onChange?.(e)
    }

    return (
      <label className="relative inline-flex cursor-pointer items-center">
        <input
          type="checkbox"
          className="peer sr-only"
          checked={controlledChecked}
          onChange={handleChange}
          ref={ref}
          {...props}
        />
        <div
          className={cn(
            "flex size-4 shrink-0 items-center justify-center rounded-sm border border-primary ring-offset-background transition-colors",
            "peer-checked:bg-primary peer-checked:text-primary-foreground",
            "peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2",
            "peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
            className
          )}
        >
          <CheckIcon
            className={cn(
              "size-3.5 opacity-0 transition-opacity",
              controlledChecked && "opacity-100"
            )}
          />
        </div>
      </label>
    )
  }
)
Checkbox.displayName = "Checkbox"
