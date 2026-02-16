'use client'

import { useRef } from 'react'
import { useGSAP } from '@gsap/react'
import { gsap } from 'gsap'
import { ensureGsapRegistered } from '@/app/components/gsap/registry'
import { cn } from '@/lib/utils'
import type { GsapSvgProps } from './types'

export function AnimatedNeuralMesh({
    className,
    size = 170,
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

            gsap.to('[data-edge]', {
                opacity: 0.15,
                duration: 1.2,
                repeat: -1,
                yoyo: true,
                stagger: 0.08,
            })

            gsap.to('[data-node]', {
                scale: 1.2,
                duration: 0.9,
                repeat: -1,
                yoyo: true,
                transformOrigin: '50% 50%',
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
            aria-label="Animated neural mesh"
        >
            <g stroke="currentColor" strokeOpacity="0.32">
                <line data-edge x1="20" y1="30" x2="60" y2="20" />
                <line data-edge x1="60" y1="20" x2="98" y2="36" />
                <line data-edge x1="20" y1="30" x2="35" y2="74" />
                <line data-edge x1="35" y1="74" x2="74" y2="62" />
                <line data-edge x1="74" y1="62" x2="98" y2="36" />
                <line data-edge x1="74" y1="62" x2="90" y2="92" />
                <line data-edge x1="35" y1="74" x2="90" y2="92" />
            </g>
            {[
                [20, 30],
                [60, 20],
                [98, 36],
                [35, 74],
                [74, 62],
                [90, 92],
            ].map(([x, y]) => (
                <circle
                    key={`${x}-${y}`}
                    data-node
                    cx={x}
                    cy={y}
                    r="3"
                    fill="currentColor"
                />
            ))}
        </svg>
    )
}
