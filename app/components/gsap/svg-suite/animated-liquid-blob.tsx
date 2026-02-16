'use client'

import { useId, useRef } from 'react'
import { useGSAP } from '@gsap/react'
import { gsap } from 'gsap'
import { ensureGsapRegistered } from '@/app/components/gsap/registry'
import { cn } from '@/lib/utils'
import type { GsapSvgProps } from './types'

export function AnimatedLiquidBlob({
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

            gsap.to('[data-blob-a]', {
                x: 8,
                y: -6,
                scale: 1.08,
                duration: 2.6,
                ease: 'sine.inOut',
                yoyo: true,
                repeat: -1,
                transformOrigin: '50% 50%',
            })

            gsap.to('[data-blob-b]', {
                x: -7,
                y: 5,
                scale: 0.94,
                duration: 2.2,
                ease: 'sine.inOut',
                yoyo: true,
                repeat: -1,
                transformOrigin: '50% 50%',
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
            aria-label="Animated liquid blobs"
        >
            <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="120" y2="120">
                    <stop offset="0%" stopColor="currentColor" stopOpacity="0.9" />
                    <stop offset="100%" stopColor="currentColor" stopOpacity="0.35" />
                </linearGradient>
            </defs>
            <g>
                <ellipse
                    data-blob-a
                    cx="52"
                    cy="58"
                    rx="34"
                    ry="28"
                    fill={`url(#${gradientId})`}
                />
                <ellipse
                    data-blob-b
                    cx="72"
                    cy="64"
                    rx="24"
                    ry="21"
                    fill="currentColor"
                    opacity="0.45"
                />
            </g>
        </svg>
    )
}
