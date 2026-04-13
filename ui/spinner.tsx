import { cn } from "@/lib/utils"
import { Loader2Icon } from "lucide-react"
import type * as React from 'react'

function Spinner({ className, ...props }: React.ComponentProps<"svg">) {
  return (
    <Loader2Icon role="status" aria-label="Loading" className={cn("size-4 animate-spin", className)} {...props} />
  )
}

export { Spinner }
