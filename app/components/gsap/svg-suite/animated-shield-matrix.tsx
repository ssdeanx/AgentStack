'use client'

import { useRef } from 'react'
import { useGSAP } from '@gsap/react'
import { gsap } from 'gsap'
import { ensureGsapRegistered } from '@/app/components/gsap/registry'
import { cn } from '@/lib/utils'
import type { GsapSvgProps } from './types'

/**
 * Security lattice icon: shield frame + scanning lock lines + node heartbeat.
 */
export function AnimatedShieldMatrix({
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

            gsap.to('[data-scan-line]', {
                y: 38,
                duration: 1.4,
                ease: 'sine.inOut',
                yoyo: true,
                repeat: -1,
            })

            gsap.to('[data-pulse-node]', {
                opacity: 0.3,
                scale: 1.25,
                duration: 0.9,
                yoyo: true,
                repeat: -1,
                stagger: 0.08,
                transformOrigin: '50% 50%',
            })

            gsap.to('[data-lock-ring]', {
                rotation: 360,
                duration: 8,
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
                'text-green-500 dark:text-green-400 gsap-will-change gsap-composite gsap-motion-safe gsap-svg-crisp',
                className
            )}
            width={size}
            height={size}
            viewBox="0 0 120 120"
            fill="none"
            role="img"
            aria-label="Animated shield matrix"
        >
            <path
                d="M60 10 L94 24 V52 C94 78 75 98 60 106 C45 98 26 78 26 52 V24 Z"
                stroke="currentColor"
                strokeOpacity="0.75"
                strokeWidth="2"
            />
            <path
                d="M60 22 L84 32 V52 C84 70 71 84 60 91 C49 84 36 70 36 52 V32 Z"
                fill="currentColor"
                opacity="0.12"
            />
            <g data-lock-ring>
                <circle
                    cx="60"
                    cy="55"
                    r="17"
                    stroke="currentColor"
                    strokeOpacity="0.4"
                    strokeDasharray="8 8"
                />
            </g>
            <path
                data-scan-line
                d="M43 43 H77"
                stroke="currentColor"
                strokeOpacity="0.9"
                strokeWidth="2"
                strokeLinecap="round"
            />
            {[44, 52, 60, 68, 76].map((x) => (
                <circle
                    key={x}
                    data-pulse-node
                    cx={x}
                    cy="55"
                    r="1.7"
                    fill="currentColor"
                />
            ))}
            <rect
                x="54"
                y="50"
                width="12"
                height="10"
                rx="2"
                fill="currentColor"
                opacity="0.85"
            />
            <path
                d="M56 50 V46 C56 43.8 57.8 42 60 42 C62.2 42 64 43.8 64 46 V50"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
            />
        </svg>
    )
}
