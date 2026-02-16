'use client'

import { useRef } from 'react'
import { useGSAP } from '@gsap/react'
import { gsap } from 'gsap'
import { ensureGsapRegistered } from '@/app/components/gsap/registry'
import { cn } from '@/lib/utils'
import type { GsapSvgProps } from './types'

export function AnimatedHelixDna({
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
                return
            }

            gsap.to('[data-helix-a]', {
                y: -4,
                duration: 1.6,
                ease: 'sine.inOut',
                repeat: -1,
                yoyo: true,
            })

            gsap.to('[data-helix-b]', {
                y: 4,
                duration: 1.6,
                ease: 'sine.inOut',
                repeat: -1,
                yoyo: true,
            })

            gsap.to('[data-rung]', {
                opacity: 0.28,
                duration: 0.7,
                yoyo: true,
                repeat: -1,
                stagger: 0.06,
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
            aria-label="Animated DNA helix"
        >
            <path
                data-helix-a
                d="M36 12 C76 28 76 44 36 60 C-4 76 -4 92 36 108"
                stroke="currentColor"
                strokeOpacity="0.8"
                strokeWidth="2"
            />
            <path
                data-helix-b
                d="M84 12 C44 28 44 44 84 60 C124 76 124 92 84 108"
                stroke="currentColor"
                strokeOpacity="0.8"
                strokeWidth="2"
            />
            {[20, 32, 44, 56, 68, 80, 92, 104].map((y) => (
                <line
                    key={y}
                    data-rung
                    x1="42"
                    y1={y}
                    x2="78"
                    y2={y}
                    stroke="currentColor"
                    strokeOpacity="0.55"
                    strokeWidth="1.8"
                />
            ))}
        </svg>
    )
}
