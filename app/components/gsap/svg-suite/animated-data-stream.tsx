'use client'

import { useRef } from 'react'
import { useGSAP } from '@gsap/react'
import { gsap } from 'gsap'
import { ensureGsapRegistered } from '@/app/components/gsap/registry'
import { cn } from '@/lib/utils'
import type { GsapSvgProps } from './types'

export function AnimatedDataStream({
    className,
    size = 180,
    animate = true,
}: GsapSvgProps) {
    const ref = useRef<SVGSVGElement>(null)

    useGSAP(
        () => {
            ensureGsapRegistered()
            if (!ref.current) {
                return
            }

            const reduced = window.matchMedia(
                '(prefers-reduced-motion: reduce)'
            ).matches
            if (reduced || !animate) {
                gsap.set('[data-packet]', { x: 0, opacity: 1 })
                return
            }

            gsap.to('[data-packet]', {
                x: 84,
                opacity: 0.15,
                duration: 1.8,
                ease: 'none',
                repeat: -1,
                stagger: 0.24,
            })

            gsap.to('[data-bar]', {
                opacity: 0.25,
                duration: 0.75,
                yoyo: true,
                repeat: -1,
                stagger: 0.1,
            })
        },
        { scope: ref, dependencies: [animate] }
    )

    return (
        <svg
            ref={ref}
            className={cn('text-primary', className)}
            width={size}
            height={size}
            viewBox="0 0 120 120"
            fill="none"
            role="img"
            aria-label="Animated data stream"
        >
            {[28, 50, 72, 94].map((y) => (
                <line
                    key={y}
                    data-bar
                    x1="16"
                    y1={y}
                    x2="104"
                    y2={y}
                    stroke="currentColor"
                    strokeOpacity="0.25"
                    strokeWidth="2"
                />
            ))}
            {[26, 48, 70, 92].map((y) => (
                <rect
                    key={`pkt-${y}`}
                    data-packet
                    x="16"
                    y={y}
                    width="12"
                    height="4"
                    rx="2"
                    fill="currentColor"
                />
            ))}
        </svg>
    )
}
