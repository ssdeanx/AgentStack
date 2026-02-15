'use client'

import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

type BackgroundVariant = 'none' | 'grid' | 'dots' | 'gradient-top' | 'gradient-bottom' | 'radial' | 'muted'

interface SectionBackgroundProps extends HTMLAttributes<HTMLDivElement> {
    variant?: BackgroundVariant
}

const VARIANT_CLASSES: Record<BackgroundVariant, string> = {
    none: '',
    grid: "bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:24px_24px]",
    dots: "bg-[radial-gradient(circle,#80808012_1px,transparent_1px)] bg-[size:20px_20px]",
    'gradient-top':
        'bg-[radial-gradient(ellipse_at_top,var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent',
    'gradient-bottom': 'bg-linear-to-t from-primary/5 via-transparent to-transparent',
    radial: 'bg-[radial-gradient(circle_at_center,var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent',
    muted: 'bg-muted/30',
}

/**
 * Decorative background layer placed behind section content.
 * Provides consistent, theme-aware visual patterns across all public sections.
 */
export function SectionBackground({
    variant = 'none',
    className,
    ...props
}: SectionBackgroundProps) {
    if (variant === 'none') {
        return null
    }

    return (
        <div
            aria-hidden
            className={cn(
                'pointer-events-none absolute inset-0 -z-10',
                VARIANT_CLASSES[variant],
                className
            )}
            {...props}
        />
    )
}
