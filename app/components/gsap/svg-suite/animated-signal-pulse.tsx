'use client'

import { useId, useRef } from 'react'
import { useGSAP } from '@gsap/react'
import { gsap } from 'gsap'
import { ensureGsapRegistered } from '@/app/components/gsap/registry'
import { cn } from '@/lib/utils'
import type { GsapSvgProps } from './types'
import React from 'react'

/**
 * AnimatedSignalPulse: High-end omni-directional propagation visual.
 * Features multi-layered diffraction rings, architectural signal beams,
 * and high-frequency 'pulse' events.
 */
export function AnimatedSignalPulse({
    className,
    size = 220,
    animate = true,
}: GsapSvgProps) {
    const ref = useRef<SVGSVGElement>(null)
    const gradientId = useId().replace(/:/g, '')

    useGSAP(
        () => {
            ensureGsapRegistered()
            if (!ref.current || !animate) {return}

            // Omni-pulse wave propagation
            gsap.to('[data-signal-wave]', {
                scale: 1.6,
                opacity: 0,
                duration: 2.5,
                repeat: -1,
                ease: 'power1.out',
                stagger: {
                    each: 0.6,
                    repeat: -1
                }
            })

            // Sweep radar beam
            gsap.to('[data-signal-sweep]', {
                rotation: 360,
                duration: 4,
                repeat: -1,
                ease: 'none',
                transformOrigin: '50% 50%'
            })

            // Core activity pulse
            gsap.to('[data-signal-core]', {
                scale: 1.2,
                duration: 0.8,
                repeat: -1,
                yoyo: true,
                ease: 'sine.inOut'
            })

            // High-frequency ping particles
            const pings = gsap.utils.toArray<SVGElement>('[data-ping]')
            pings.forEach((ping) => {
                gsap.to(ping, {
                    opacity: 0.8,
                    scale: 1.5,
                    duration: 0.4,
                    repeat: -1,
                    repeatDelay: Math.random() * 2,
                    ease: 'power2.out'
                })
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
            aria-label="High-end Signal Pulse"
        >
            <defs>
                <filter id="signal-blur" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="3" result="glow" />
                </filter>
                <radialGradient id={gradientId}>
                    <stop offset="0%" stopColor="currentColor" stopOpacity="0.15" />
                    <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
                </radialGradient>
            </defs>

            {/* Ambient Base Layer */}
            <circle cx="80" cy="80" r="70" fill={`url(#${gradientId})`} />

            {/* Background Grid (Architecture) */}
            <g stroke="currentColor" strokeOpacity="0.05" strokeWidth="0.5">
                {[10, 30, 50, 70, 90, 110, 130, 150].map(p => (
                    <circle key={p} cx="80" cy="80" r={p / 2} />
                ))}
            </g>

            {/* Propagation Waves */}
            <g stroke="currentColor" strokeWidth="1.5">
                <circle data-signal-wave cx="80" cy="80" r="30" strokeOpacity="0.4" />
                <circle data-signal-wave cx="80" cy="80" r="30" strokeOpacity="0.3" strokeDasharray="4 8" />
                <circle data-signal-wave cx="80" cy="80" r="30" strokeOpacity="0.2" strokeWidth="3" />
            </g>

            {/* High-frequency Signal Sweep */}
            <g data-signal-sweep>
                <path
                    d="M80 80 L80 15"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeOpacity="0.6"
                    strokeLinecap="round"
                    filter="url(#signal-blur)"
                />
                <circle cx="80" cy="15" r="2.5" fill="currentColor" />
            </g>

            {/* Active Core Assembly */}
            <g transform="translate(80, 80)">
                <rect x="-10" y="-10" width="20" height="20" rx="4" fill="currentColor" fillOpacity="0.05" stroke="currentColor" strokeOpacity="0.2" />
                <circle data-signal-core cx="0" cy="0" r="5" fill="currentColor" filter="url(#signal-blur)" />
                <circle cx="0" cy="0" r="2" fill="white" fillOpacity="0.4" />
            </g>

            {/* Multi-point Signal Pings */}
            {[
                [40, 40], [120, 60], [100, 120], [60, 110], [50, 80]
            ].map(([x, y], i) => (
                <circle key={i} data-ping cx={x} cy={y} r="1.5" fill="currentColor" />
            ))}
        </svg>
    )
}
