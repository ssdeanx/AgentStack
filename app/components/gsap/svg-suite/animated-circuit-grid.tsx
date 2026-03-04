'use client'

import { useRef } from 'react'
import { useGSAP } from '@gsap/react'
import { gsap } from 'gsap'
import { ensureGsapRegistered } from '@/app/components/gsap/registry'
import { cn } from '@/lib/utils'
import type { GsapSvgProps } from './types'
import React from 'react'

/**
 * AnimatedCircuitGrid: High-end PCB architecture visual.
 * Features multi-layered logic traces, power bus rails,
 * high-frequency logic pulses, and refractive signal junctions.
 */
export function AnimatedCircuitGrid({
    className,
    size = 220,
    animate = true,
}: GsapSvgProps) {
    const ref = useRef<SVGSVGElement>(null)

    useGSAP(
        () => {
            ensureGsapRegistered()
            if (!ref.current || !animate) {return}

            // High-frequency logic pulses
            gsap.to('[data-circuit-pulse]', {
                strokeDashoffset: -120,
                duration: 2, // Fixed: Using number for strict type compliance
                repeat: -1,
                ease: 'none',
                stagger: {
                    each: 0.4,
                    from: 'random'
                }
            })

            // Power rail glow
            gsap.to('[data-power-rail]', {
                opacity: 0.6,
                duration: 0.1,
                repeat: -1,
                yoyo: true,
                ease: 'none',
                repeatDelay: 1 // Fixed: Using number for strict type compliance
            })

            // Via/Junction active status
            gsap.to('[data-circuit-via]', {
                scale: 1.4,
                opacity: 0.8,
                duration: 0.4,
                repeat: -1,
                yoyo: true,
                ease: 'power2.out',
                stagger: {
                    each: 0.1,
                    from: 'center'
                }
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
            aria-label="High-end Circuit Grid"
        >
            <defs>
                <filter id="circuit-glow" x="-30%" y="-30%" width="160%" height="160%">
                    <feGaussianBlur stdDeviation="2.5" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
                <linearGradient id="trace-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="currentColor" stopOpacity="0.05" />
                    <stop offset="50%" stopColor="currentColor" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="currentColor" stopOpacity="0.05" />
                </linearGradient>
            </defs>

            {/* Background Substrate Grid */}
            <g stroke="currentColor" strokeOpacity="0.03" strokeWidth="0.5">
                {[20, 40, 60, 80, 100, 120, 140].map(p => (
                    <React.Fragment key={p}>
                        <line x1={p} y1="10" x2={p} y2="150" />
                        <line x1="10" y1={p} x2="150" y2={p} />
                    </React.Fragment>
                ))}
            </g>

            {/* Power rails (Architectural depth) */}
            <g stroke="currentColor" strokeOpacity="0.1" strokeWidth="2.5">
                <line data-power-rail x1="10" y1="30" x2="150" y2="30" />
                <line data-power-rail x1="10" y1="130" x2="150" y2="130" />
            </g>

            {/* Complex Logic Traces */}
            <g stroke="url(#trace-grad)" strokeWidth="1.5" fill="none">
                <path d="M20 30 V50 H60 V80 H100 V130" />
                <path d="M40 30 V70 H80 V100 H140 V130" />
                <path d="M140 30 V60 H110 V90 H40 V130" />
                <path d="M80 30 V130" strokeOpacity="0.15" />
            </g>

            {/* High-frequency Logic Pulses */}
            <g stroke="currentColor" strokeWidth="2.5" fill="none" strokeDasharray="10 30" strokeLinecap="round">
                <path data-circuit-pulse d="M20 30 V50 H60 V80 H100 V130" strokeOpacity="0.8" />
                <path data-circuit-pulse d="M40 30 V70 H80 V100 H140 V130" strokeOpacity="0.6" />
                <path data-circuit-pulse d="M140 30 V60 H110 V90 H40 V130" strokeOpacity="0.7" />
            </g>

            {/* Signal Vias / Junctions */}
            {[
                [20, 30], [40, 30], [80, 30], [140, 30],
                [60, 50], [80, 70], [110, 60],
                [60, 80], [100, 80], [80, 100], [110, 90],
                [40, 130], [80, 130], [100, 130], [140, 130]
            ].map(([x, y], i) => (
                <g key={i} transform={`translate(${x}, ${y})`}>
                    <circle r="5" fill="currentColor" fillOpacity="0.05" />
                    <circle data-circuit-via r="1.8" fill="currentColor" filter="url(#circuit-glow)" />
                    <circle r="0.8" fill="white" fillOpacity="0.4" />
                </g>
            ))}
        </svg>
    )
}
