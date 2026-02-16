'use client'

import { useId, useRef } from 'react'
import { useGSAP } from '@gsap/react'
import { gsap } from 'gsap'
import { ensureGsapRegistered } from '@/app/components/gsap/registry'
import { cn } from '@/lib/utils'
import type { GsapSvgProps } from './types'

export function AnimatedGradientRings({
    className,
    size = 160,
    animate = true,
}: GsapSvgProps) {
    const ref = useRef<SVGSVGElement>(null)
    const gradientId = useId().replace(/:/g, '')

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

            gsap.to('[data-ring-track]', {
                rotation: 360,
                duration: 8,
                ease: 'none',
                repeat: -1,
                transformOrigin: '50% 50%',
            })

            gsap.to('[data-ring-dash]', {
                strokeDashoffset: -180,
                duration: 2.8,
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
            aria-label="Animated gradient rings"
        >
            <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="120" y2="120">
                    <stop offset="0%" stopColor="currentColor" stopOpacity="1" />
                    <stop offset="100%" stopColor="currentColor" stopOpacity="0.2" />
                </linearGradient>
            </defs>
            <g data-ring-track>
                <circle
                    cx="60"
                    cy="60"
                    r="40"
                    stroke="currentColor"
                    strokeOpacity="0.2"
                    strokeWidth="3"
                />
                <circle
                    data-ring-dash
                    cx="60"
                    cy="60"
                    r="40"
                    stroke={`url(#${gradientId})`}
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeDasharray="72 180"
                />
            </g>
        </svg>
    )
}
