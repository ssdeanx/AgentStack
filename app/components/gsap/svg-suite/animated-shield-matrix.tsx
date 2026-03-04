'use client'

import { useRef } from 'react'
import { useGSAP } from '@gsap/react'
import { gsap } from 'gsap'
import { ensureGsapRegistered } from '@/app/components/gsap/registry'
import { cn } from '@/lib/utils'
import type { GsapSvgProps } from './types'
import React from 'react'

/**
 * AnimatedShieldMatrix: High-end architectural security visual.
 * Features a double-walled frame, internal security grid,
 * multi-frequency scanlines, and refractive depth layers.
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
            if (!ref.current || !animate) {return}

            // High-frequency scanline pass
            gsap.fromTo('[data-scan-bar]',
                { y: -30, opacity: 0 },
                {
                    y: 110,
                    opacity: 0.8,
                    duration: 2.2,
                    repeat: -1,
                    ease: 'power2.inOut',
                    stagger: {
                        each: 0.8,
                        repeat: -1
                    }
                }
            )

            // Security grid flicker
            gsap.to('[data-grid-hex]', {
                opacity: 0.15,
                duration: 'random(0.5, 2)',
                repeat: -1,
                yoyo: true,
                stagger: {
                    each: 0.1,
                    from: 'random'
                }
            })

            // Encryption core pulse
            gsap.to('[data-shield-core]', {
                scale: 1.15,
                filter: 'brightness(1.5) blur(1px)',
                duration: 1.2,
                repeat: -1,
                yoyo: true,
                ease: 'sine.inOut'
            })

            // Lock node heartbeat
            gsap.to('[data-lock-node]', {
                scale: 1.3,
                opacity: 0.8,
                duration: 0.6,
                repeat: -1,
                yoyo: true,
                ease: 'power2.out',
                stagger: 0.15
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
            aria-label="High-end Shield Matrix"
        >
            <defs>
                <filter id="shield-glow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="3" result="glow" />
                </filter>
                <linearGradient id="scan-grad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="currentColor" stopOpacity="0" />
                    <stop offset="50%" stopColor="currentColor" stopOpacity="1" />
                    <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
                </linearGradient>
                <clipPath id="shield-clip">
                    <path d="M80 15 L130 35 V75 C130 115 105 145 80 155 C55 145 30 115 30 75 V35 L80 15 Z" />
                </clipPath>
            </defs>

            {/* Architectural Frame (Outer) */}
            <path
                d="M80 15 L130 35 V75 C130 115 105 145 80 155 C55 145 30 115 30 75 V35 L80 15 Z"
                stroke="currentColor"
                strokeOpacity="0.1"
                strokeWidth="4"
            />

            {/* Architectural Frame (Inner Detail) */}
            <path
                d="M80 25 L120 40 V75 C120 105 100 130 80 140 C60 130 40 105 40 75 V40 L80 25 Z"
                stroke="currentColor"
                strokeOpacity="0.4"
                strokeWidth="1.5"
            />

            <g clipPath="url(#shield-clip)">
                {/* Security Hex Grid */}
                <g stroke="currentColor" strokeOpacity="0.05" strokeWidth="1">
                    {[35, 55, 75, 95, 115, 135].map(y => (
                        <path key={y} data-grid-hex d={`M20 ${y} h120`} />
                    ))}
                    {[40, 60, 80, 100, 120].map(x => (
                        <path key={x} data-grid-hex d={`M${x} 20 v120`} />
                    ))}
                </g>

                {/* Vertical Scan Bar */}
                <rect
                    data-scan-bar
                    x="30"
                    y="0"
                    width="100"
                    height="8"
                    fill="url(#scan-grad)"
                    fillOpacity="0.5"
                />
            </g>

            {/* Lock Mechanisms */}
            <g transform="translate(80, 80)">
                <circle cx="0" cy="0" r="22" stroke="currentColor" strokeOpacity="0.1" strokeDasharray="4 6" />
                <circle data-shield-core cx="0" cy="0" r="7" fill="currentColor" filter="url(#shield-glow)" />
                <circle cx="0" cy="0" r="3" fill="white" fillOpacity="0.3" />
            </g>

            {/* Encryption Nodes */}
            {[
                [60, 60], [100, 60], [60, 100], [100, 100]
            ].map(([x, y], i) => (
                <g key={i} data-lock-node transform={`translate(${x}, ${y})`}>
                    <circle r="4" fill="currentColor" fillOpacity="0.05" />
                    <circle r="1.5" fill="currentColor" />
                </g>
            ))}

            {/* Status Beacon */}
            <path d="M70 15 H90" stroke="currentColor" strokeWidth="2" strokeOpacity="0.8" strokeLinecap="round" />
        </svg>
    )
}
