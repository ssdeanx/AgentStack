'use client'

import type * as React from 'react'
import { forwardRef } from 'react'
import { cn } from '@/lib/utils'
import { SectionBackground } from './section-background'

const SPACING_VARIANTS = {
    compact: 'py-12 sm:py-16 lg:py-20',
    base: 'py-16 sm:py-24 lg:py-32',
    large: 'py-24 sm:py-32 lg:py-40',
    hero: 'py-32 sm:py-40 lg:py-48',
    none: '',
} as const

const CONTAINER_WIDTHS = {
    narrow: 'max-w-3xl',
    default: 'max-w-7xl',
    wide: 'max-w-screen-2xl',
    full: 'max-w-none',
} as const

export type SpacingVariant = keyof typeof SPACING_VARIANTS
export type ContainerWidth = keyof typeof CONTAINER_WIDTHS
export type BackgroundVariant =
    | 'none'
    | 'grid'
    | 'dots'
    | 'gradient-top'
    | 'gradient-bottom'
    | 'radial'
    | 'muted'

interface SectionLayoutProps extends React.HTMLAttributes<HTMLElement> {
    as?: 'section' | 'div' | 'article' | 'aside'
    spacing?: SpacingVariant
    container?: ContainerWidth
    background?: BackgroundVariant
    borderTop?: boolean
    borderBottom?: boolean
    children: React.ReactNode
}

/**
 * Standardized section wrapper for all public pages.
 * Provides consistent vertical rhythm, container width, optional decorative
 * background layer, and border controls — one component to rule section chrome.
 */
export const SectionLayout = forwardRef<HTMLElement, SectionLayoutProps>(
    (
        {
            as: Tag = 'section',
            spacing = 'base',
            container = 'default',
            background = 'none',
            borderTop = false,
            borderBottom = false,
            className,
            children,
            ...props
        },
        ref
    ) => {
        return (
            <Tag
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                ref={ref as React.Ref<HTMLDivElement>}
                className={cn(
                    'relative overflow-hidden',
                    SPACING_VARIANTS[spacing],
                    borderTop && 'border-t border-border',
                    borderBottom && 'border-b border-border',
                    className
                )}
                {...props}
            >
                <SectionBackground variant={background} />
                <div
                    className={cn(
                        'relative container mx-auto px-4 sm:px-6 lg:px-8',
                        CONTAINER_WIDTHS[container]
                    )}
                >
                    {children}
                </div>
            </Tag>
        )
    }
)

SectionLayout.displayName = 'SectionLayout'
