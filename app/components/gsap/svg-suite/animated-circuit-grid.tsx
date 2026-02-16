'use client'

import { useRef } from 'react'
import { useGSAP } from '@gsap/react'
import { gsap } from 'gsap'
import { ensureGsapRegistered } from '@/app/components/gsap/registry'
import { cn } from '@/lib/utils'
import type { GsapSvgProps } from './types'

export function AnimatedCircuitGrid({
    className,
    size = 180,
    animate = true,
}: GsapSvgProps) {
    const ref = useRef<SVGSVGElement>(null)

    useGSAP(
        () => {
            ensureGsapRegistered()
            if (!ref.current) {
                return
            }

            const reduced = window.matchMedia(
                '(prefers-reduced-motion: reduce)'
            ).matches
            if (reduced || !animate) {
                return
            }

            gsap.to('[data-trace]', {
                strokeDashoffset: -120,
                duration: 1.6,
                ease: 'none',
                repeat: -1,
            })

            gsap.to('[data-junction]', {
                opacity: 0.35,
                duration: 0.65,
                yoyo: true,
                repeat: -1,
                stagger: 0.08,
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
            aria-label="Animated circuit grid"
        >
            <path
                data-trace
                d="M15 24 H60 V48 H102 M24 96 H78 V72 H98"
                stroke="currentColor"
                strokeOpacity="0.6"
                strokeWidth="2"
                strokeDasharray="24 12"
            />
            <path
                d="M20 30 V60 H45 V86"
                stroke="currentColor"
                strokeOpacity="0.28"
                strokeWidth="2"
            />
            <path
                d="M84 18 V36 H56"
                stroke="currentColor"
                strokeOpacity="0.28"
                strokeWidth="2"
            />
            {[
                [15, 24],
                [60, 24],
                [60, 48],
                [102, 48],
                [24, 96],
                [78, 96],
                [78, 72],
                [98, 72],
            ].map(([x, y]) => (
                <circle
                    key={`${x}-${y}`}
                    data-junction
                    cx={x}
                    cy={y}
                    r="2.6"
                    fill="currentColor"
                />
            ))}
        </svg>
    )
}
