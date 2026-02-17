'use client'

import { useRef } from 'react'
import { useGSAP } from '@gsap/react'
import { gsap } from 'gsap'
import { ensureGsapRegistered } from '@/app/components/gsap/registry'
import { cn } from '@/lib/utils'
import type { GsapSvgProps } from './types'

/**
 * Token stream icon: ingestion, transformation, and response egress lanes.
 */
export function AnimatedTokenStream({
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

            gsap.to('[data-token-in]', {
                x: 56,
                duration: 1.6,
                ease: 'none',
                repeat: -1,
            })

            gsap.to('[data-token-out]', {
                x: -56,
                duration: 1.8,
                ease: 'none',
                repeat: -1,
            })

            gsap.to('[data-core-pulse]', {
                scale: 1.15,
                opacity: 0.35,
                duration: 0.85,
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
            className={cn(
                'text-blue-500 dark:text-blue-400 gsap-will-change gsap-composite gsap-motion-safe gsap-svg-crisp',
                className
            )}
            width={size}
            height={size}
            viewBox="0 0 120 120"
            fill="none"
            role="img"
            aria-label="Animated token stream"
        >
            <rect
                x="36"
                y="38"
                width="48"
                height="44"
                rx="10"
                stroke="currentColor"
                strokeOpacity="0.4"
                strokeWidth="2"
            />
            <circle data-core-pulse cx="60" cy="60" r="11" fill="currentColor" opacity="0.22" />
            <circle cx="60" cy="60" r="4" fill="currentColor" />

            <path d="M8 48 H36" stroke="currentColor" strokeOpacity="0.35" strokeWidth="2" />
            <path d="M84 72 H112" stroke="currentColor" strokeOpacity="0.35" strokeWidth="2" />

            <rect data-token-in x="8" y="45" width="8" height="6" rx="2" fill="currentColor" />
            <rect data-token-in x="20" y="45" width="8" height="6" rx="2" fill="currentColor" opacity="0.65" />

            <rect data-token-out x="104" y="69" width="8" height="6" rx="2" fill="currentColor" />
            <rect data-token-out x="92" y="69" width="8" height="6" rx="2" fill="currentColor" opacity="0.65" />
        </svg>
    )
}
