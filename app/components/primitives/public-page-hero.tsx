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
    className,
}: PublicPageHeroProps) {
    return (
        <header className={cn(SECTION_LAYOUT.headerCenter, className)}>
            {Accent ? (
                <div className="mb-5 flex justify-center">
                    <div className="rounded-2xl border border-border/60 bg-card/60 p-3 shadow-sm">
                        <Accent className="gsap-svg-icon" size={120} />
                    </div>
                </div>
            ) : null}

            {badge ? (
                <Badge variant="outline" className="mb-4">
                    {badge}
                </Badge>
            ) : null}

            <h1 className={`mb-4 ${SECTION_HEADING.pageTitle}`}>{title}</h1>
            <p className={SECTION_BODY.subtitleCentered}>{description}</p>
        </header>
    )
}
