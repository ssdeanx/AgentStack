'use client'

import React, { useRef } from 'react'
import { useGSAP } from '@gsap/react'
import { gsap } from 'gsap'
import { ensureGsapRegistered } from '@/app/components/gsap/registry'
import { cn } from '@/lib/utils'

interface HeroCenterpieceProps {
    className?: string
    size?: number
}

/**
 * HeroCenterpiece: A high-end architectural schematic SVG.
 * Replaces 'slop' with mathematical precision: 0.5px strokes,
 * grid-based interconnects, and GSAP-driven logic cores.
 * 100% ID-free to ensure zero console errors.
 */
export function HeroCenterpiece({ className, size = 600 }: HeroCenterpieceProps) {
    const ref = useRef<SVGSVGElement>(null)

    useGSAP(
        () => {
            ensureGsapRegistered()
            if (!ref.current) { return }

            // High-end cinematic core rotation
            gsap.to('[data-hero-inner-core]', {
                rotation: -360,
                duration: 40,
                ease: 'none',
                repeat: -1,
                transformOrigin: 'center center'
            })

            gsap.to('[data-hero-outer-rings]', {
                rotation: 360,
                duration: 80,
                ease: 'none',
                repeat: -1,
                transformOrigin: 'center center'
            })

            // Purposeful data travel pulses (manual paths)
            gsap.to('[data-hero-data-pulse]', {
                strokeDashoffset: -100,
                duration: 3,
                repeat: -1,
                ease: 'power1.inOut',
                stagger: 0.5
            })

            // Intentional status heartbeats
            gsap.to('[data-hero-status-node]', {
                opacity: 0.3,
                scale: 1.2,
                duration: 2,
                repeat: -1,
                yoyo: true,
                ease: 'sine.inOut',
                stagger: 0.3
            })
        },
        { scope: ref }
    )

    return (
        <svg
            ref={ref}
            className={cn('gsap-will-change gsap-composite gsap-motion-safe gsap-svg-crisp mix-blend-plus-lighter opacity-90', className)}
            width={size}
            height={size}
            viewBox="0 0 400 400"
            fill="none"
            stroke="currentColor"
            role="img"
            aria-label="Agentic System Core Visual"
        >
            {/* Professional Glassmorphic Base Layers */}
            <circle cx="200" cy="200" r="180" strokeOpacity="0.05" strokeWidth="0.5" />
            <circle cx="200" cy="200" r="140" strokeOpacity="0.08" strokeWidth="1" strokeDasharray="2 4" />

            {/* Manual System Traces (No Arrays) */}
            <g strokeWidth="1" strokeOpacity="0.2">
                <path d="M200 20 V380" strokeDasharray="1 10" />
                <path d="M20 200 H380" strokeDasharray="1 10" />
                <path d="M72.7 72.7 L327.3 327.3" strokeDasharray="1 10" />
                <path d="M72.7 327.3 L327.3 72.7" strokeDasharray="1 10" />
            </g>

            {/* Dynamic Data Highways */}
            <g strokeWidth="1.5" strokeOpacity="0.3" strokeDasharray="10 90">
                <path data-hero-data-pulse d="M200 60 V340" />
                <path data-hero-data-pulse d="M60 200 H340" />
                <circle data-hero-data-pulse cx="200" cy="200" r="100" />
            </g>

            {/* High-End Outer Component Rings */}
            <g data-hero-outer-rings strokeOpacity="0.15" strokeWidth="0.5">
                <circle cx="200" cy="200" r="160" strokeDasharray="20 10" />
                <circle cx="200" cy="200" r="158" strokeDasharray="4 8" />
            </g>

            {/* Master Controller Interface (Central Core) */}
            <g data-hero-inner-core>
                {/* Central Gear/Hub */}
                <circle cx="200" cy="200" r="40" fill="currentColor" fillOpacity="0.05" strokeOpacity="0.4" strokeWidth="1" />
                <rect x="185" y="160" width="30" height="80" rx="4" fill="currentColor" fillOpacity="0.03" strokeOpacity="0.2" />
                <rect x="160" y="185" width="80" height="30" rx="4" fill="currentColor" fillOpacity="0.03" strokeOpacity="0.2" />

                {/* Core Status Nodes (Manually Placed) */}
                <circle data-hero-status-node cx="200" cy="160" r="3" fill="currentColor" />
                <circle data-hero-status-node cx="200" cy="240" r="3" fill="currentColor" />
                <circle data-hero-status-node cx="160" cy="200" r="3" fill="currentColor" />
                <circle data-hero-status-node cx="240" cy="200" r="3" fill="currentColor" />
            </g>

            {/* Peripheral System Modules - Manually Defined */}
            <g opacity="0.4">
                {/* North Module */}
                <g transform="translate(200, 80)">
                    <rect x="-8" y="-8" width="16" height="16" rx="2" strokeWidth="1" strokeOpacity="0.5" />
                    <line x1="0" y1="-12" x2="0" y2="-20" strokeWidth="0.5" />
                </g>
                {/* South Module */}
                <g transform="translate(200, 320)">
                    <rect x="-8" y="-8" width="16" height="16" rx="2" strokeWidth="1" strokeOpacity="0.5" />
                    <line x1="0" y1="12" x2="0" y2="20" strokeWidth="0.5" />
                </g>
                {/* East Module */}
                <g transform="translate(320, 200)">
                    <rect x="-8" y="-8" width="16" height="16" rx="2" strokeWidth="1" strokeOpacity="0.5" />
                    <line x1="12" y1="0" x2="20" y2="0" strokeWidth="0.5" />
                </g>
                {/* West Module */}
                <g transform="translate(80, 200)">
                    <rect x="-8" y="-8" width="16" height="16" rx="2" strokeWidth="1" strokeOpacity="0.5" />
                    <line x1="-12" y1="0" x2="-20" y2="0" strokeWidth="0.5" />
                </g>
            </g>

            {/* Fine Interaction Markers */}
            <g strokeOpacity="0.2" strokeWidth="0.5">
                <line x1="190" y1="200" x2="210" y2="200" />
                <line x1="200" y1="190" x2="200" y2="210" />
            </g>
        </svg>
    )
}
