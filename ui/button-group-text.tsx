import type { ComponentProps } from 'react'
import { Slot } from 'radix-ui'

import { cn } from '@/lib/utils'

export function ButtonGroupText({
    className,
    asChild = false,
    ...props
}: ComponentProps<'div'> & {
    asChild?: boolean
}) {
    const Comp = asChild ? Slot.Root : 'div'

    return (
        <Comp
            className={cn(
                "bg-muted gap-2 rounded-md border px-2.5 text-sm font-medium shadow-xs [&_svg:not([class*='size-'])]:size-4 flex items-center [&_svg]:pointer-events-none",
                className
            )}
            {...props}
        />
    )
}