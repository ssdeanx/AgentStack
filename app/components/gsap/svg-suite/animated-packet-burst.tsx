'use client'

import { useRef } from 'react'
import { useGSAP } from '@gsap/react'
import { gsap } from 'gsap'
import { ensureGsapRegistered } from '@/app/components/gsap/registry'
import { cn } from '@/lib/utils'
import type { GsapSvgProps } from './types'

export function AnimatedPacketBurst({
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

            gsap.to('[data-packet-left]', {
                x: 30,
                duration: 1.2,
                ease: 'none',
                repeat: -1,
            })

            gsap.to('[data-packet-right]', {
                x: -30,
                duration: 1.4,
                ease: 'none',
                repeat: -1,
            })

            gsap.to('[data-packet-core]', {
                scale: 1.18,
                opacity: 0.4,
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
                'text-indigo-500 dark:text-indigo-400 gsap-will-change gsap-composite gsap-motion-safe gsap-svg-crisp',
                className
            )}
            width={size}
            height={size}
            viewBox="0 0 120 120"
            fill="none"
            role="img"
            aria-label="Animated packet burst"
        >
            <rect x="46" y="46" width="28" height="28" rx="8" fill="currentColor" opacity="0.16" />
            <circle data-packet-core cx="60" cy="60" r="4" fill="currentColor" />

            <path d="M14 60 H46" stroke="currentColor" strokeOpacity="0.4" strokeWidth="2" />
            <path d="M74 60 H106" stroke="currentColor" strokeOpacity="0.4" strokeWidth="2" />

            <rect data-packet-left x="14" y="56" width="6" height="8" rx="2" fill="currentColor" />
            <rect data-packet-left x="24" y="56" width="6" height="8" rx="2" fill="currentColor" opacity="0.65" />

            <rect data-packet-right x="100" y="56" width="6" height="8" rx="2" fill="currentColor" />
            <rect data-packet-right x="90" y="56" width="6" height="8" rx="2" fill="currentColor" opacity="0.65" />
        </svg>
    )
}
