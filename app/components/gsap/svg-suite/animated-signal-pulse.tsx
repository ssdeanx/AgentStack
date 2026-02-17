'use client'

import { useId, useRef } from 'react'
import { useGSAP } from '@gsap/react'
import { gsap } from 'gsap'
import { ensureGsapRegistered } from '@/app/components/gsap/registry'
import { cn } from '@/lib/utils'
import type { GsapSvgProps } from './types'

export function AnimatedSignalPulse({
    className,
    size = 220,
    animate = true,
}: GsapSvgProps) {
    const ref = useRef<SVGSVGElement>(null)
    const gradientId = useId().replace(/:/g, '')

    useGSAP(
        () => {
            ensureGsapRegistered()
            if (!ref.current) {
                return
            }

            if (!animate) {
                gsap.set('[data-ring], [data-core]', { opacity: 1, scale: 1 })
                return
            }

            gsap.to('[data-ring]', {
                scale: 1.35,
                opacity: 0,
                duration: 2.1,
                ease: 'none',
                repeat: -1,
                stagger: 0.32,
                transformOrigin: '50% 50%',
            })

            gsap.to('[data-core]', {
                scale: 1.08,
                duration: 1.1,
                ease: 'sine.inOut',
                yoyo: true,
                repeat: -1,
                transformOrigin: '50% 50%',
            })

            gsap.to('[data-sweep]', {
                rotation: 360,
                duration: 3.2,
                ease: 'none',
                repeat: -1,
                transformOrigin: '50% 50%',
            })
        },
        { scope: ref, dependencies: [animate] }
    )

    return (
        <svg
            ref={ref}
            className={cn('text-emerald-500 dark:text-emerald-400 gsap-will-change gsap-composite gsap-motion-safe gsap-svg-crisp', className)}
            width={size}
            height={size}
            viewBox="0 0 100 100"
            fill="none"
            role="img"
            aria-label="Animated signal pulse"
        >
            <defs>
                <radialGradient
                    id={gradientId}
                    cx="0"
                    cy="0"
                    r="1"
                    gradientTransform="translate(50 50) rotate(90) scale(48)"
                >
                    <stop offset="0%" stopColor="currentColor" stopOpacity="0.22" />
                    <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
                </radialGradient>
            </defs>
            <circle cx="50" cy="50" r="45" fill={`url(#${gradientId})`} />
            <circle cx="50" cy="50" r="38" stroke="currentColor" strokeOpacity="0.12" />
            <circle data-ring cx="50" cy="50" r="17" stroke="currentColor" />
            <circle
                data-ring
                cx="50"
                cy="50"
                r="25"
                stroke="currentColor"
                opacity="0.7"
            />
            <circle
                data-ring
                cx="50"
                cy="50"
                r="33"
                stroke="currentColor"
                opacity="0.5"
            />
            <g data-sweep>
                <path d="M50 50 L50 8" stroke="currentColor" strokeOpacity="0.65" strokeWidth="2" />
            </g>
            <circle data-core cx="50" cy="50" r="6" fill="currentColor" />
        </svg>
    )
}
