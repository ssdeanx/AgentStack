'use client'

import { useRef } from 'react'
import { useGSAP } from '@gsap/react'
import { gsap } from 'gsap'
import { ensureGsapRegistered } from '@/app/components/gsap/registry'
import { cn } from '@/lib/utils'
import type { GsapSvgProps } from './types'

export function AnimatedSignalPulse({
    className,
    size = 160,
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
        },
        { scope: ref, dependencies: [animate] }
    )

    return (
        <svg
            ref={ref}
            className={cn('text-primary', className)}
            width={size}
            height={size}
            viewBox="0 0 100 100"
            fill="none"
            role="img"
            aria-label="Animated signal pulse"
        >
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
            <circle data-core cx="50" cy="50" r="6" fill="currentColor" />
        </svg>
    )
}
