'use client'

import type { ComponentType } from 'react'
import { cn } from '@/lib/utils'
import { Badge } from '@/ui/badge'
import { SECTION_BODY, SECTION_HEADING, SECTION_LAYOUT } from './typography'
import type { GsapSvgProps } from '@/app/components/gsap/svg-suite'

interface PublicPageHeroProps {
    title: string
    description: string
    badge?: string
    accent?: ComponentType<GsapSvgProps>
    accentCaption?: string
    className?: string
}

/**
 * Shared public-page hero block with optional animated SVG accent.
 * Keeps heading spacing, hierarchy, and visual rhythm consistent across subpages.
 */
export function PublicPageHero({
    title,
    description,
    badge,
    accent: Accent,
    accentCaption,
    className,
}: PublicPageHeroProps) {
    return (
        <header className={cn('mx-auto w-full max-w-6xl', className)}>
            <div
                className={cn(
                    'grid items-center gap-8',
                    Accent ? 'lg:grid-cols-[1fr_auto]' : 'grid-cols-1'
                )}
            >
                <div className={cn(SECTION_LAYOUT.headerCenter, 'lg:text-left')}>
                    {badge ? (
                        <Badge variant="outline" className="mb-4">
                            {badge}
                        </Badge>
                    ) : null}

                    <h1 className={`mb-4 ${SECTION_HEADING.pageTitle}`}>
                        {title}
                    </h1>
                    <p
                        className={cn(
                            SECTION_BODY.subtitleCentered,
                            'lg:mx-0 lg:text-left'
                        )}
                    >
                        {description}
                    </p>
                </div>

                {Accent ? (
                    <div className="flex justify-center lg:justify-end">
                        <div className="gsap-svg-stage group relative flex aspect-square w-full max-w-80 items-center justify-center rounded-3xl border border-border/60 bg-linear-to-br from-card via-card to-primary/5 p-4 shadow-sm">
                            <div className="pointer-events-none absolute inset-0 bg-radial from-primary/20 via-transparent to-transparent opacity-90" />
                            <div className="pointer-events-none absolute inset-2 rounded-2xl border border-primary/20" />
                            <Accent
                                className="gsap-svg-icon gsap-svg-hero gsap-svg-crisp relative z-10"
                                size={192}
                                animate
                            />
                            {accentCaption ? (
                                <p className="absolute bottom-2 left-1/2 z-10 w-[85%] -translate-x-1/2 rounded-full border border-border/70 bg-background/80 px-3 py-1 text-center text-[11px] font-medium tracking-wide text-muted-foreground backdrop-blur-sm">
                                    {accentCaption}
                                </p>
                            ) : null}
                        </div>
                    </div>
                ) : null}
            </div>
        </header>
    )
}
