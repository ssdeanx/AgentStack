'use client'

import { useRef } from 'react'
import { useGSAP } from '@gsap/react'
import { gsap } from 'gsap'
import { ensureGsapRegistered } from '@/app/components/gsap/registry'
import { cn } from '@/lib/utils'
import type { GsapSvgProps } from './types'

export function AnimatedFractalBeacon({
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

            gsap.to('[data-beacon-wave]', {
                scale: 1.28,
                opacity: 0.05,
                duration: 1.8,
                repeat: -1,
                stagger: 0.2,
                transformOrigin: '50% 50%',
            })

            gsap.to('[data-beacon-core]', {
                opacity: 0.45,
                scale: 1.22,
                duration: 0.7,
                yoyo: true,
                repeat: -1,
                transformOrigin: '50% 50%',
            })
        },
        { scope: ref, dependencies: [animate] }
    )

    return (
        <svg
            ref={ref}
            className={cn(
                'text-fuchsia-500 dark:text-fuchsia-400 gsap-will-change gsap-composite gsap-motion-safe gsap-svg-crisp',
                className
            )}
            width={size}
            height={size}
            viewBox="0 0 120 120"
            fill="none"
            role="img"
            aria-label="Animated fractal beacon"
        >
            <circle data-beacon-wave cx="60" cy="60" r="13" stroke="currentColor" strokeOpacity="0.35" strokeWidth="2" />
            <circle data-beacon-wave cx="60" cy="60" r="24" stroke="currentColor" strokeOpacity="0.28" strokeWidth="2" />
            <circle data-beacon-wave cx="60" cy="60" r="35" stroke="currentColor" strokeOpacity="0.2" strokeWidth="2" />
            <path d="M60 20 V48" stroke="currentColor" strokeOpacity="0.55" strokeWidth="2" />
            <path d="M60 72 V100" stroke="currentColor" strokeOpacity="0.55" strokeWidth="2" />
            <path d="M20 60 H48" stroke="currentColor" strokeOpacity="0.55" strokeWidth="2" />
            <path d="M72 60 H100" stroke="currentColor" strokeOpacity="0.55" strokeWidth="2" />
            <circle cx="60" cy="60" r="9" fill="currentColor" opacity="0.18" />
            <circle data-beacon-core cx="60" cy="60" r="4" fill="currentColor" />
        </svg>
    )
}
