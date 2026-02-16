'use client'

import { useRef } from 'react'
import { useGSAP } from '@gsap/react'
import { gsap } from 'gsap'
import { ensureGsapRegistered } from '@/app/components/gsap/registry'
import { cn } from '@/lib/utils'
import type { GsapSvgProps } from './types'

const WAVE_A = 'M0 58 C20 48 40 68 60 58 C80 48 100 68 120 58'
const WAVE_B = 'M0 62 C20 72 40 52 60 62 C80 72 100 52 120 62'

export function AnimatedMorphWaves({
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

            gsap.to('[data-wave-main]', {
                attr: { d: WAVE_B },
                duration: 1.8,
                ease: 'sine.inOut',
                yoyo: true,
                repeat: -1,
            })

            gsap.to('[data-wave-secondary]', {
                x: 10,
                duration: 1.5,
                ease: 'sine.inOut',
                yoyo: true,
                repeat: -1,
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
            aria-label="Animated morph waves"
        >
            <path
                data-wave-main
                d={WAVE_A}
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
            />
            <path
                data-wave-secondary
                d="M0 74 C20 64 40 84 60 74 C80 64 100 84 120 74"
                stroke="currentColor"
                strokeOpacity="0.45"
                strokeWidth="2"
                strokeLinecap="round"
            />
        </svg>
    )
}
