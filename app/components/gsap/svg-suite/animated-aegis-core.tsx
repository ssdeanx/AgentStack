'use client'

import { useRef } from 'react'
import { useGSAP } from '@gsap/react'
import { gsap } from 'gsap'
import { ensureGsapRegistered } from '@/app/components/gsap/registry'
import { cn } from '@/lib/utils'
import type { GsapSvgProps } from './types'

export function AnimatedAegisCore({
    className,
    size = 220,
    animate = true,
}: GsapSvgProps) {
    const ref = useRef<SVGSVGElement>(null)

    useGSAP(
        () => {
            ensureGsapRegistered()
            if (!animate) {
                return
            }

            gsap.to('[data-aegis-ring]', {
                rotation: 360,
                duration: 10,
                ease: 'none',
                repeat: -1,
                transformOrigin: '50% 50%',
            })

            gsap.to('[data-aegis-node]', {
                opacity: 0.25,
                scale: 1.2,
                duration: 0.9,
                yoyo: true,
                repeat: -1,
                stagger: 0.12,
                transformOrigin: '50% 50%',
            })
        },
        { scope: ref, dependencies: [animate] }
    )

    return (
        <svg
            ref={ref}
            className={cn(
                'text-emerald-500 dark:text-emerald-400 gsap-will-change gsap-composite gsap-motion-safe gsap-svg-crisp',
                className
            )}
            width={size}
            height={size}
            viewBox="0 0 120 120"
            fill="none"
            role="img"
            aria-label="Animated aegis core"
        >
            <g data-aegis-ring>
                <circle cx="60" cy="60" r="42" stroke="currentColor" strokeOpacity="0.22" strokeDasharray="8 7" />
                <circle cx="60" cy="60" r="31" stroke="currentColor" strokeOpacity="0.35" strokeDasharray="5 6" />
            </g>
            <path d="M60 22 L84 34 V54 C84 72 72 84 60 91 C48 84 36 72 36 54 V34 Z" fill="currentColor" opacity="0.14" />
            <path d="M60 29 L78 38 V54 C78 68 69 77 60 83 C51 77 42 68 42 54 V38 Z" stroke="currentColor" strokeOpacity="0.8" strokeWidth="2" />
            {[44, 52, 60, 68, 76].map((x) => (
                <circle key={x} data-aegis-node cx={x} cy="60" r="2" fill="currentColor" />
            ))}
            <circle cx="60" cy="60" r="4" fill="currentColor" />
        </svg>
    )
}
