'use client'

import * as React from 'react'
import { GripVerticalIcon } from 'lucide-react'
import * as ResizablePrimitive from 'react-resizable-panels'

import { cn } from '@/lib/utils'

function ResizablePanelGroup({
    className,
    orientation = 'horizontal',
    ...props
}: React.ComponentProps<typeof ResizablePrimitive.Group>) {
    return (
        <ResizablePrimitive.Group
            data-slot="resizable-panel-group"
            orientation={orientation}
            className={cn(
                'flex h-full w-full data-[panel-group-orientation=vertical]:flex-col transition-all duration-300',
                className
            )}
            {...props}
        />
    )
}

function ResizablePanel({
    ...props
}: React.ComponentProps<typeof ResizablePrimitive.Panel>) {
    return <ResizablePrimitive.Panel data-slot="resizable-panel" {...props} />
}

function ResizableHandle({
    withHandle,
    className,
    ...props
}: React.ComponentProps<typeof ResizablePrimitive.Separator> & {
    withHandle?: boolean
}) {
    return (
        <ResizablePrimitive.Separator
            data-slot="resizable-handle"
            className={cn(
                'bg-border focus-visible:ring-ring relative flex items-center justify-center transition-all duration-200 hover:bg-primary/50 focus-visible:ring-1 focus-visible:ring-offset-1 focus-visible:outline-hidden',
                'data-[panel-group-orientation=horizontal]:w-px data-[panel-group-orientation=horizontal]:h-full data-[panel-group-orientation=horizontal]:cursor-col-resize',
                'data-[panel-group-orientation=vertical]:h-px data-[panel-group-orientation=vertical]:w-full data-[panel-group-orientation=vertical]:cursor-row-resize',
                // Increased hit area
                'after:absolute after:inset-y-0 after:left-1/2 after:w-4 after:-translate-x-1/2 after:z-30 data-[panel-group-orientation=vertical]:after:inset-x-0 data-[panel-group-orientation=vertical]:after:top-1/2 data-[panel-group-orientation=vertical]:after:h-4 data-[panel-group-orientation=vertical]:after:w-full data-[panel-group-orientation=vertical]:after:-translate-y-1/2 data-[panel-group-orientation=vertical]:after:translate-x-0',
                className
            )}
            {...props}
        >
            {withHandle === true && (
                <div className="bg-border z-10 flex h-4 w-3 items-center justify-center rounded-xs border">
                    <GripVerticalIcon className="size-2.5" />
                </div>
            )}
        </ResizablePrimitive.Separator>
    )
}

export { ResizablePanelGroup, ResizablePanel, ResizableHandle }
