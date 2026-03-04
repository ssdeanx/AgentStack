'use client'

import { useRef } from 'react'
import { useGSAP } from '@gsap/react'
import { gsap } from 'gsap'
import { ensureGsapRegistered } from '@/app/components/gsap/registry'
import { cn } from '@/lib/utils'
import type { GsapSvgProps } from './types'
import React from 'react'

export function AnimatedNeuralMesh({
    className,
    size = 220,
    animate = true,
}: GsapSvgProps) {
    const ref = useRef<SVGSVGElement>(null)

    useGSAP(
        () => {
            ensureGsapRegistered()
            if (!ref.current || !animate) {return}

            // Complex connection flow
            gsap.to('[data-mesh-edge]', {
                strokeDashoffset: -100,
                duration: 8,
                repeat: -1,
                ease: 'none',
                stagger: {
                    each: 0.5,
                    from: 'random'
                }
            })

            // Node focal glow
            gsap.to('[data-mesh-node]', {
                scale: 1.15,
                opacity: 0.8,
                duration: 'random(1.5, 3)',
                repeat: -1,
                yoyo: true,
                ease: 'sine.inOut',
                stagger: {
                    each: 0.2,
                    from: 'center'
                }
            })

            // Global mesh wobble for organic feel
            gsap.to('[data-mesh-group]', {
                x: '+=3',
                y: '+=2',
                duration: 4,
                repeat: -1,
                yoyo: true,
                ease: 'sine.inOut'
            })
        },
        { scope: ref, dependencies: [animate] }
    )

    return (
        <svg
            ref={ref}
            className={cn('text-primary/70 gsap-will-change gsap-composite gsap-motion-safe gsap-svg-crisp', className)}
            width={size}
            height={size}
            viewBox="0 0 160 160"
            fill="none"
            role="img"
            aria-label="High-end Neural Mesh"
        >
            <g data-mesh-group>
                <g stroke="currentColor" strokeOpacity="0.05" strokeWidth="0.5">
                    {[20, 40, 60, 80, 100, 120, 140].map(p => (
                        <React.Fragment key={p}>
                            <line x1={p} y1="10" x2={p} y2="150" />
                            <line x1="10" y1={p} x2="150" y2={p} />
                        </React.Fragment>
                    ))}
                </g>

                <g stroke="currentColor" strokeOpacity="0.4" strokeWidth="1.2">
                    <path data-mesh-edge d="M40 50 L80 30 L120 55 L100 110 L55 125 L40 50 Z" strokeDasharray="5 15" />
                    <path data-mesh-edge d="M80 30 L100 110" strokeDasharray="4 20" />
                    <path data-mesh-edge d="M40 50 L120 55" strokeDasharray="10 25" />
                    <path data-mesh-edge d="M55 125 L80 30" strokeDasharray="3 15" />
                </g>

                {[
                    [40, 50, 4], [80, 30, 3], [120, 55, 5],
                    [100, 110, 4], [55, 125, 3.5], [85, 80, 6]
                ].map(([x, y, r], i) => (
                    <g key={i} data-mesh-node transform={`translate(${x}, ${y})`}>
                        <circle cx="0" cy="0" r={r * 2} fill="currentColor" fillOpacity="0.05" />
                        <circle cx="0" cy="0" r={r} fill="currentColor" fillOpacity="0.6" />
                        <circle cx="0" cy="0" r={r * 0.4} fill="white" fillOpacity="0.3" />
                    </g>
                ))}
            </g>
        </svg>
    )
}
