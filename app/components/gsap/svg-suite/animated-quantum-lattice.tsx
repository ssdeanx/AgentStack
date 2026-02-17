'use client'

import { useRef } from 'react'
import { useGSAP } from '@gsap/react'
import { gsap } from 'gsap'
import { ensureGsapRegistered } from '@/app/components/gsap/registry'
import { cn } from '@/lib/utils'
import type { GsapSvgProps } from './types'

/**
 * Orchestration lattice: multi-node compute graph with directional flow lanes.
 */
export function AnimatedQuantumLattice({
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

            gsap.to('[data-lane-flow]', {
                strokeDashoffset: -40,
                duration: 1.2,
                ease: 'none',
                repeat: -1,
            })

            gsap.to('[data-node-core]', {
                scale: 1.18,
                opacity: 0.45,
                duration: 0.8,
                yoyo: true,
                repeat: -1,
                stagger: 0.08,
                transformOrigin: '50% 50%',
            })

            gsap.to('[data-outer-ring]', {
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
                'text-violet-500 dark:text-violet-400 gsap-will-change gsap-composite gsap-motion-safe gsap-svg-crisp',
                className
            )}
            width={size}
            height={size}
            viewBox="0 0 120 120"
            fill="none"
            role="img"
            aria-label="Animated quantum lattice"
        >
            <g data-outer-ring>
                <circle
                    cx="60"
                    cy="60"
                    r="44"
                    stroke="currentColor"
                    strokeOpacity="0.18"
                    strokeDasharray="7 9"
                />
            </g>

            <path d="M24 36 H96" stroke="currentColor" strokeOpacity="0.2" />
            <path d="M24 60 H96" stroke="currentColor" strokeOpacity="0.2" />
            <path d="M24 84 H96" stroke="currentColor" strokeOpacity="0.2" />

            <path
                data-lane-flow
                d="M24 60 H96"
                stroke="currentColor"
                strokeOpacity="0.9"
                strokeWidth="2"
                strokeDasharray="10 10"
            />

            {[
                [30, 36],
                [60, 36],
                [90, 36],
                [30, 60],
                [60, 60],
                [90, 60],
                [30, 84],
                [60, 84],
                [90, 84],
            ].map(([x, y]) => (
                <g key={`${x}-${y}`}>
                    <circle cx={x} cy={y} r="5" fill="currentColor" opacity="0.2" />
                    <circle data-node-core cx={x} cy={y} r="2" fill="currentColor" />
                </g>
            ))}
        </svg>
    )
}
