'use client'

import React, { useRef } from 'react'
import { useGSAP } from '@gsap/react'
import { gsap } from 'gsap'
import { ensureGsapRegistered } from '@/app/components/gsap/registry'
import { cn } from '@/lib/utils'
import type { GsapSvgProps } from './types'

/**
 * AnimatedLiquidBlob: High-precision architectural fluid schematic.
 * Replaces 'slop' blobs with structured arcs and zero IDs.
 */
export function AnimatedLiquidBlob({
    className,
    size = 200,
    animate = true,
}: GsapSvgProps) {
    const ref = useRef<SVGSVGElement>(null)

    useGSAP(
        () => {
            ensureGsapRegistered()
            if (!ref.current || !animate) { return }

            // Fluid oscillation
            gsap.to('[data-blob-layer]', {
                rotation: 'random(5, 15)',
                scale: 'random(0.95, 1.05)',
                duration: 'random(2, 4)',
                repeat: -1,
                yoyo: true,
                ease: 'sine.inOut',
                transformOrigin: 'center'
            })

            // Surface tension reflections
            gsap.to('[data-blob-reflect]', {
                opacity: 0.1,
                duration: 2,
                repeat: -1,
                yoyo: true,
                ease: 'power1.inOut'
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
            viewBox="0 0 120 120"
            fill="none"
            role="img"
            aria-label="Architectural Fluid Topology"
        >
            {/* Structured Fluid Boundary */}
            <g data-blob-layer>
                <circle cx="60" cy="60" r="45" stroke="currentColor" strokeOpacity="0.1" strokeWidth="1" />
                <circle cx="60" cy="60" r="40" stroke="currentColor" strokeOpacity="0.2" strokeWidth="0.5" strokeDasharray="2 6" />

                {/* Internal Volume schematic */}
                <ellipse cx="60" cy="60" rx="35" ry="30" fill="currentColor" fillOpacity="0.05" stroke="currentColor" strokeOpacity="0.3" strokeWidth="1" />
            </g>

            {/* Reflection Facets (Architectural Highlight) */}
            <g data-blob-reflect opacity="0.4">
                <path d="M45 40 Q60 30 75 40" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                <circle cx="50" cy="35" r="1.5" fill="white" fillOpacity="0.4" />
            </g>

            {/* Topology Markers */}
            {[0, 90, 180, 270].map(angle => (
                <rect
                    key={angle}
                    transform={`rotate(${angle} 60 60) translate(60, 15)`}
                    width="1" height="6" fill="currentColor" fillOpacity="0.4"
                />
            ))}
        </svg>
    )
}
