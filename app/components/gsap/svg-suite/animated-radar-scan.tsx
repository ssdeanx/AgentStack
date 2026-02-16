'use client'

import { useId, useRef } from 'react'
import { useGSAP } from '@gsap/react'
import { gsap } from 'gsap'
import { ensureGsapRegistered } from '@/app/components/gsap/registry'
import { cn } from '@/lib/utils'
import type { GsapSvgProps } from './types'

export function AnimatedRadarScan({
    className,
    size = 170,
    animate = true,
}: GsapSvgProps) {
    const ref = useRef<SVGSVGElement>(null)
    const gradientId = useId().replace(/:/g, '')

    useGSAP(
        () => {
            ensureGsapRegistered()

            const reduced = window.matchMedia(
                '(prefers-reduced-motion: reduce)'
            ).matches
            if (reduced || !animate) {
                return
            }

            gsap.to('[data-scan-arm]', {
                rotation: 360,
                transformOrigin: '50% 50%',
                duration: 3.2,
                ease: 'none',
                repeat: -1,
            })

            gsap.to('[data-contact]', {
                opacity: 0.15,
                scale: 1.25,
                duration: 0.8,
                repeat: -1,
                yoyo: true,
                stagger: 0.2,
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
            aria-label="Animated radar scan"
        >
            <defs>
                <radialGradient id={gradientId} cx="0" cy="0" r="1" gradientTransform="translate(60 60) rotate(90) scale(60)">
                    <stop offset="0%" stopColor="currentColor" stopOpacity="0.12" />
                    <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
                </radialGradient>
            </defs>
            <circle cx="60" cy="60" r="50" fill={`url(#${gradientId})`} />
            <circle cx="60" cy="60" r="40" stroke="currentColor" strokeOpacity="0.24" />
            <circle cx="60" cy="60" r="24" stroke="currentColor" strokeOpacity="0.2" />
            <g data-scan-arm>
                <path d="M60 60 L60 10" stroke="currentColor" strokeOpacity="0.75" strokeWidth="2" />
            </g>
            <circle data-contact cx="40" cy="42" r="3" fill="currentColor" />
            <circle data-contact cx="77" cy="76" r="3" fill="currentColor" />
            <circle data-contact cx="64" cy="28" r="2.5" fill="currentColor" />
        </svg>
    )
}
