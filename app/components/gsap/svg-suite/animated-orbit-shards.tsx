'use client'

import { useRef } from 'react'
import { useGSAP } from '@gsap/react'
import { gsap } from 'gsap'
import { ensureGsapRegistered } from '@/app/components/gsap/registry'
import { cn } from '@/lib/utils'
import type { GsapSvgProps } from './types'

export function AnimatedOrbitShards({
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

            gsap.to('[data-shard-orbit-a]', {
                rotation: 360,
                duration: 7,
                ease: 'none',
                repeat: -1,
                transformOrigin: '50% 50%',
            })

            gsap.to('[data-shard-orbit-b]', {
                rotation: -360,
                duration: 9,
                ease: 'none',
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
                'text-sky-500 dark:text-sky-400 gsap-will-change gsap-composite gsap-motion-safe gsap-svg-crisp',
                className
            )}
            width={size}
            height={size}
            viewBox="0 0 120 120"
            fill="none"
            role="img"
            aria-label="Animated orbit shards"
        >
            <circle cx="60" cy="60" r="12" fill="currentColor" opacity="0.16" />
            <circle cx="60" cy="60" r="4" fill="currentColor" />

            <g data-shard-orbit-a>
                <rect x="58" y="19" width="4" height="8" rx="1.5" fill="currentColor" />
                <rect x="91" y="58" width="8" height="4" rx="1.5" fill="currentColor" />
                <rect x="58" y="93" width="4" height="8" rx="1.5" fill="currentColor" />
                <rect x="21" y="58" width="8" height="4" rx="1.5" fill="currentColor" />
            </g>

            <g data-shard-orbit-b opacity="0.75">
                <rect x="72" y="24" width="3" height="6" rx="1" fill="currentColor" />
                <rect x="89" y="43" width="6" height="3" rx="1" fill="currentColor" />
                <rect x="88" y="74" width="6" height="3" rx="1" fill="currentColor" />
                <rect x="72" y="91" width="3" height="6" rx="1" fill="currentColor" />
                <rect x="45" y="91" width="3" height="6" rx="1" fill="currentColor" />
                <rect x="26" y="74" width="6" height="3" rx="1" fill="currentColor" />
                <rect x="25" y="43" width="6" height="3" rx="1" fill="currentColor" />
                <rect x="45" y="24" width="3" height="6" rx="1" fill="currentColor" />
            </g>
        </svg>
    )
}
