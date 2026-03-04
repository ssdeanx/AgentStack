'use client'

import { useRef } from 'react'
import { useGSAP } from '@gsap/react'
import { gsap } from 'gsap'
import { ensureGsapRegistered } from '@/app/components/gsap/registry'
import { cn } from '@/lib/utils'
import type { GsapSvgProps } from './types'
import React from 'react'

/**
 * AnimatedPacketBurst: A high-end visual representing data throughput.
 * Features a central processing gate with high-frequency packet streams,
 * luminosity caching, and architectural depth.
 */
export function AnimatedPacketBurst({
    className,
    size = 220,
    animate = true,
}: GsapSvgProps) {
    const ref = useRef<SVGSVGElement>(null)

    useGSAP(
        () => {
            ensureGsapRegistered()
            if (!ref.current || !animate) {return}

            // High-frequency packet pulses
            gsap.to('[data-packet]', {
                x: 120,
                duration: 1, // Fixed: Using number for strict type compliance
                repeat: -1,
                ease: 'none',
                stagger: {
                    each: 0.1,
                    from: 'random'
                }
            })

            // Gate oscillation
            gsap.to('[data-gate-shutter]', {
                scaleY: 1.1,
                duration: 0.15,
                repeat: -1,
                yoyo: true,
                ease: 'steps(2)',
                stagger: 0.05
            })

            // Core energy oscillation
            gsap.to('[data-burst-core]', {
                opacity: 0.8,
                scale: 1.1,
                duration: 0.05,
                repeat: -1,
                yoyo: true,
                ease: 'none',
                repeatDelay: 0.5 // Fixed: Using number for strict type compliance
            })
        },
        { scope: ref, dependencies: [animate] }
    )

    return (
        <svg
            ref={ref}
            className={cn('text-primary/70 gsap-will-change gsap-composite gsap-motion-safe gsap-svg-crisp', className)}
            width={size}
            height={size}
            viewBox="0 0 160 160"
            fill="none"
            role="img"
            aria-label="High-end Packet Burst"
        >
            {/* Architectural Rail System */}
            <g stroke="currentColor" strokeOpacity="0.08" strokeWidth="1">
                <line x1="10" y1="80" x2="150" y2="80" strokeDasharray="2 4" />
                <line x1="10" y1="60" x2="150" y2="60" strokeDasharray="2 4" />
                <line x1="10" y1="100" x2="150" y2="100" strokeDasharray="2 4" />
            </g>

            {/* Processing Gates */}
            <g fill="currentColor" fillOpacity="0.05" stroke="currentColor" strokeOpacity="0.2">
                <rect data-gate-shutter x="35" y="50" width="4" height="60" rx="2" />
                <rect data-gate-shutter x="121" y="50" width="4" height="60" rx="2" />
            </g>

            {/* High-frequency Packets */}
            {Array.from({ length: 12 }).map((_, i) => (
                <g key={i} data-packet transform={`translate(-20, ${6 + Math.floor(i/4) * 20 + (i%4) * 4})`}>
                    <rect
                        width="8"
                        height="2.5"
                        rx="1"
                        fill="currentColor"
                        fillOpacity="0.6"
                    />
                </g>
            ))}

            {/* Central Burst Hub */}
            <g transform="translate(80, 80)">
                <circle cx="0" cy="0" r="18" fill="currentColor" fillOpacity="0.03" stroke="currentColor" strokeOpacity="0.1" />
                <circle data-burst-core cx="0" cy="0" r="6" fill="currentColor" fillOpacity="0.8" />

                {/* Orbital Shards */}
                {[0, 60, 120, 180, 240, 300].map(angle => (
                    <rect
                        key={angle}
                        x="12"
                        y="-1"
                        width="4"
                        height="2"
                        rx="0.5"
                        fill="currentColor"
                        fillOpacity="0.4"
                        transform={`rotate(${angle})`}
                    />
                ))}
            </g>
        </svg>
    )
}
