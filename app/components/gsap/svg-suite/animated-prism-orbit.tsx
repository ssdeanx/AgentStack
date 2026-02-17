'use client'

import { useRef } from 'react'
import { useGSAP } from '@gsap/react'
import { gsap } from 'gsap'
import { ensureGsapRegistered } from '@/app/components/gsap/registry'
import { cn } from '@/lib/utils'
import type { GsapSvgProps } from './types'

export function AnimatedPrismOrbit({
    className,
    size = 220,
    animate = true,
}: GsapSvgProps) {
    const ref = useRef<SVGSVGElement>(null)

    useGSAP(
        () => {
            ensureGsapRegistered()

            if (!animate) {
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

            gsap.to('[data-beam-flow]', {
                strokeDashoffset: -48,
                duration: 1.4,
                ease: 'none',
                repeat: -1,
            })

            gsap.to('[data-output-pulse]', {
                x: 8,
                opacity: 0.25,
                duration: 0.9,
                ease: 'sine.inOut',
                yoyo: true,
                repeat: -1,
            })
        },
        { scope: ref, dependencies: [animate] }
    )

    return (
        <svg
            ref={ref}
            className={cn('text-fuchsia-500 dark:text-fuchsia-400 gsap-will-change gsap-composite gsap-motion-safe gsap-svg-crisp', className)}
            width={size}
            height={size}
            viewBox="0 0 120 120"
            fill="none"
            role="img"
            aria-label="Animated prism orbit"
        >
            <path
                d="M10 60 H44"
                stroke="currentColor"
                strokeOpacity="0.32"
                strokeWidth="2"
            />
            <path
                data-beam-flow
                d="M10 60 H44"
                stroke="currentColor"
                strokeOpacity="0.9"
                strokeWidth="2"
                strokeDasharray="8 8"
            />
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
            <path
                d="M76 60 H108"
                stroke="currentColor"
                strokeOpacity="0.35"
                strokeWidth="2"
            />
            <circle
                data-output-pulse
                cx="86"
                cy="60"
                r="3"
                fill="currentColor"
            />
            <g data-orbiter>
                <circle cx="60" cy="12" r="4" fill="currentColor" />
                <circle cx="12" cy="60" r="3" fill="currentColor" opacity="0.7" />
                <circle cx="60" cy="108" r="4" fill="currentColor" />
                <circle cx="108" cy="60" r="3" fill="currentColor" opacity="0.7" />
            </g>
        </svg>
    )
}
