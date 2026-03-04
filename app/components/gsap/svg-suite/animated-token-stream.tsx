'use client'

import { useRef } from 'react'
import { useGSAP } from '@gsap/react'
import { gsap } from 'gsap'
import { ensureGsapRegistered } from '@/app/components/gsap/registry'
import { cn } from '@/lib/utils'
import type { GsapSvgProps } from './types'
import React from 'react'

/**
 * AnimatedTokenStream: High-end LLM token throughput visual.
 * Features a linguistic processing core, ingestion/egress channels,
 * high-frequency token particles, and transformation bloom.
 */
export function AnimatedTokenStream({
    className,
    size = 220,
    animate = true,
}: GsapSvgProps) {
    const ref = useRef<SVGSVGElement>(null)

    useGSAP(
        () => {
            ensureGsapRegistered()
            if (!ref.current || !animate) {return}

            // High-frequency token flow (Ingress/Egress)
            gsap.to('[data-token-ingress]', {
                x: 80,
                opacity: 0,
                duration: 'random(0.4, 0.8)',
                repeat: -1,
                ease: 'none',
                stagger: {
                    each: 0.1,
                    from: 'start'
                }
            })

            gsap.to('[data-token-egress]', {
                x: 160,
                opacity: 0,
                duration: 'random(0.4, 0.8)',
                repeat: -1,
                ease: 'none',
                stagger: {
                    each: 0.1,
                    from: 'start'
                }
            })

            // Core transformation bloom
            gsap.to('[data-token-bloom]', {
                scale: 1.2,
                opacity: 0.8,
                duration: 'random(1, 2)',
                repeat: -1,
                yoyo: true,
                ease: 'sine.inOut'
            })

            // Linguistic rings rotation
            gsap.to('[data-linguistic-ring]', {
                rotation: '+=360',
                duration: 12,
                repeat: -1,
                ease: 'none',
                transformOrigin: '50% 50%'
            })

            gsap.to('[data-linguistic-ring-inner]', {
                rotation: '-=360',
                duration: 18,
                repeat: -1,
                ease: 'none',
                transformOrigin: '50% 50%'
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
            aria-label="High-end Token Stream"
        >
            <defs>
                <filter id="token-glow" x="-40%" y="-40%" width="180%" height="180%">
                    <feGaussianBlur stdDeviation="3" result="glow" />
                    <feComposite in="SourceGraphic" in2="glow" operator="over" />
                </filter>
                <linearGradient id="token-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="currentColor" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
                </linearGradient>
            </defs>

            {/* Ingestion/Egress Architectural Rails */}
            <g stroke="currentColor" strokeOpacity="0.08" strokeWidth="1">
                <path d="M10 65 H70 M10 95 H70" strokeDasharray="2 4" />
                <path d="M90 65 H150 M90 95 H150" strokeDasharray="2 4" />
            </g>

            {/* Linguistic Core Assembly */}
            <g transform="translate(80, 80)">
                <circle cx="0" cy="0" r="35" fill="currentColor" fillOpacity="0.03" stroke="currentColor" strokeOpacity="0.1" />

                {/* Rotating Linguistic Rings */}
                <circle data-linguistic-ring cx="0" cy="0" r="28" stroke="currentColor" strokeOpacity="0.2" strokeWidth="1" strokeDasharray="4 15" />
                <circle data-linguistic-ring-inner cx="0" cy="0" r="22" stroke="currentColor" strokeOpacity="0.3" strokeWidth="2" strokeDasharray="8 20" />

                {/* Central Bloom Core */}
                <circle data-token-bloom cx="0" cy="0" r="10" fill="currentColor" filter="url(#token-glow)" />
                <circle cx="0" cy="0" r="4" fill="white" fillOpacity="0.4" />
            </g>

            {/* Streaming Token Particles */}
            <g>
                {/* Ingress Tokens */}
                {Array.from({ length: 8 }).map((_, i) => (
                    <rect
                        key={`in-${i}`}
                        data-token-ingress
                        x="-10"
                        y={62 + (i % 2) * 30 + (Math.floor(i / 2) * 2)}
                        width="6"
                        height="4"
                        rx="1"
                        fill="currentColor"
                        fillOpacity="0.4"
                    />
                ))}

                {/* Egress Tokens */}
                {Array.from({ length: 8 }).map((_, i) => (
                    <rect
                        key={`out-${i}`}
                        data-token-egress
                        x="90"
                        y={62 + (i % 2) * 30 + (Math.floor(i / 2) * 2)}
                        width="8"
                        height="4"
                        rx="1"
                        fill="url(#token-grad)"
                    />
                ))}
            </g>
        </svg>
    )
}
