'use client'

import React, { useRef } from 'react'
import { useGSAP } from '@gsap/react'
import { gsap } from 'gsap'
import { ensureGsapRegistered } from '@/app/components/gsap/registry'
import { cn } from '@/lib/utils'
import type { GsapSvgProps } from './types'

/**
 * AnimatedQuantumLattice: Architectural compute-graph topology.
 * Replaces 'slop' with high-precision interconnects and zero IDs.
 */
export function AnimatedQuantumLattice({
    className,
    size = 200,
    animate = true,
}: GsapSvgProps) {
    const ref = useRef<SVGSVGElement>(null)

    useGSAP(
        () => {
            ensureGsapRegistered()
            if (!ref.current || !animate) { return }

            // Compute flow pulses
            gsap.to('[data-lattice-flow]', {
                strokeDashoffset: -60,
                duration: 4,
                repeat: -1,
                ease: 'none',
                stagger: {
                    each: 0.3,
                    from: 'random'
                }
            })

            // Logic core rotation
            gsap.to('[data-node-core]', {
                rotation: 360,
                duration: 'random(10, 20)',
                repeat: -1,
                ease: 'none',
                transformOrigin: 'center'
            })

            // Active node heartbeats
            gsap.to('[data-node-active]', {
                opacity: 1,
                scale: 1.2,
                duration: 1.5,
                repeat: -1,
                yoyo: true,
                ease: 'sine.inOut',
                stagger: {
                    grid: [4, 4],
                    from: 'center',
                    amount: 2
                }
            })
        },
        { scope: ref, dependencies: [animate] }
    )

    return (
        <svg
            ref={ref}
            className={cn('text-primary/60 gsap-will-change gsap-composite gsap-motion-safe gsap-svg-crisp', className)}
            width={size}
            height={size}
            viewBox="0 0 160 160"
            fill="none"
            role="img"
            aria-label="High-Precision Compute Topology"
        >
            {/* Technical Sub-Grid */}
            <g stroke="currentColor" strokeOpacity="0.05" strokeWidth="0.5">
                {[20, 60, 100, 140].map(v => (
                    <React.Fragment key={v}>
                        <circle cx="80" cy="80" r={v / 2} strokeDasharray="1 8" />
                        <line x1={v} y1="0" x2={v} y2="160" />
                        <line x1="0" y1={v} x2="160" y2={v} />
                    </React.Fragment>
                ))}
            </g>

            {/* Topological Lanes (Data Channels) */}
            <g stroke="currentColor" strokeOpacity="0.3" strokeWidth="1" strokeDasharray="4 16">
                <path data-lattice-flow d="M40 40 L80 120 L120 40" />
                <path data-lattice-flow d="M40 120 L80 40 L120 120" />
                <circle cx="80" cy="80" r="40" strokeOpacity="0.2" />
            </g>

            {/* Neural Logic Nodes */}
            {[
                [40, 40], [120, 40], [40, 120], [120, 120],
                [80, 80], [80, 40], [80, 120], [40, 80], [120, 80]
            ].map(([x, y], i) => (
                <g key={i} transform={`translate(${x}, ${y})`}>
                    <g data-node-core transform-origin="center">
                        <rect x="-6" y="-6" width="12" height="12" rx="2" fill="currentColor" fillOpacity="0.03" stroke="currentColor" strokeOpacity="0.1" />
                        <line x1="-8" y1="0" x2="8" y2="0" strokeOpacity="0.05" />
                    </g>
                    <circle data-node-active r="2" fill="currentColor" fillOpacity="0.4" />
                </g>
            ))}

            {/* Calibration Rings (Outer Perimeter) */}
            <circle cx="80" cy="80" r="75" stroke="currentColor" strokeOpacity="0.05" strokeWidth="0.5" strokeDasharray="1 10" />
        </svg>
    )
}
