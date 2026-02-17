'use client'

import { useRef } from 'react'
import { useGSAP } from '@gsap/react'
import { gsap } from 'gsap'
import { ensureGsapRegistered } from '@/app/components/gsap/registry'
import { cn } from '@/lib/utils'
import type { GsapSvgProps } from './types'

export function AnimatedWaveInterference({
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

            gsap.to('[data-wave-a]', {
                x: 6,
                duration: 1.1,
                yoyo: true,
                repeat: -1,
                ease: 'sine.inOut',
            })

            gsap.to('[data-wave-b]', {
                x: -6,
                duration: 1.3,
                yoyo: true,
                repeat: -1,
                ease: 'sine.inOut',
            })

            gsap.to('[data-wave-dot]', {
                opacity: 0.4,
                scale: 1.25,
                duration: 0.8,
                yoyo: true,
                repeat: -1,
                stagger: 0.1,
                transformOrigin: '50% 50%',
            })
        },
        { scope: ref, dependencies: [animate] }
    )

    return (
        <svg
            ref={ref}
            className={cn(
                'text-cyan-500 dark:text-cyan-400 gsap-will-change gsap-composite gsap-motion-safe gsap-svg-crisp',
                className
            )}
            width={size}
            height={size}
            viewBox="0 0 120 120"
            fill="none"
            role="img"
            aria-label="Animated wave interference"
        >
            <path data-wave-a d="M18 50 C30 36, 42 64, 54 50 C66 36, 78 64, 90 50 C98 42, 102 50, 104 50" stroke="currentColor" strokeOpacity="0.75" strokeWidth="2" strokeLinecap="round" />
            <path data-wave-b d="M18 70 C30 56, 42 84, 54 70 C66 56, 78 84, 90 70 C98 62, 102 70, 104 70" stroke="currentColor" strokeOpacity="0.75" strokeWidth="2" strokeLinecap="round" />
            {[30, 46, 62, 78, 94].map((x) => (
                <circle key={x} data-wave-dot cx={x} cy="60" r="2" fill="currentColor" />
            ))}
            <circle cx="60" cy="60" r="8" fill="currentColor" opacity="0.14" />
        </svg>
    )
}
