'use client'

import { useRef } from 'react'
import { useGSAP } from '@gsap/react'
import { gsap } from 'gsap'
import { ensureGsapRegistered } from '@/app/components/gsap/registry'
import { cn } from '@/lib/utils'
import type { GsapSvgProps } from './types'

export function AnimatedPrismOrbit({
    className,
    size = 170,
    animate = true,
}: GsapSvgProps) {
    const ref = useRef<SVGSVGElement>(null)

    useGSAP(
        () => {
            ensureGsapRegistered()

            const reduced = window.matchMedia(
                '(prefers-reduced-motion: reduce)'
            ).matches
            if (reduced || !animate) {
                return
            }

            gsap.to('[data-prism]', {
                rotation: 360,
                transformOrigin: '50% 50%',
                duration: 10,
                ease: 'none',
                repeat: -1,
            })

            gsap.to('[data-orbiter]', {
                rotation: -360,
                transformOrigin: '50% 50%',
                duration: 6.4,
                ease: 'none',
                repeat: -1,
            })
        },
        { scope: ref, dependencies: [animate] }
    )

    return (
        <svg
            ref={ref}
            className={cn('text-primary', className)}
            width={size}
            height={size}
            viewBox="0 0 120 120"
            fill="none"
            role="img"
            aria-label="Animated prism orbit"
        >
            <g data-prism>
                <polygon
                    points="60,20 24,82 96,82"
                    stroke="currentColor"
                    strokeOpacity="0.5"
                    strokeWidth="2"
                />
                <polygon
                    points="60,30 33,76 87,76"
                    fill="currentColor"
                    fillOpacity="0.14"
                />
            </g>
            <g data-orbiter>
                <circle cx="60" cy="12" r="4" fill="currentColor" />
                <circle cx="12" cy="60" r="3" fill="currentColor" opacity="0.7" />
                <circle cx="60" cy="108" r="4" fill="currentColor" />
                <circle cx="108" cy="60" r="3" fill="currentColor" opacity="0.7" />
            </g>
        </svg>
    )
}
