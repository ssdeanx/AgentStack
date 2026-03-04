'use client'

import { useRef } from 'react'
import { useGSAP } from '@gsap/react'
import { gsap } from 'gsap'
import { ensureGsapRegistered } from '@/app/components/gsap/registry'
import { cn } from '@/lib/utils'

interface AnimatedOrbitalLogoProps {
    className?: string
    size?: number
    pulseNodes?: boolean
    rotate?: boolean
}

export function AnimatedOrbitalLogo({
    className,
    size = 48,
    pulseNodes = true,
    rotate = true,
}: AnimatedOrbitalLogoProps) {
    const svgRef = useRef<SVGSVGElement>(null)

    useGSAP(
        () => {
            ensureGsapRegistered()

            if (!svgRef.current) {
                return
            }

            // Core pulse
            gsap.fromTo(
                '[data-core]',
                { scale: 0.8, autoAlpha: 0.5 },
                {
                    scale: 1,
                    autoAlpha: 1,
                    duration: 2.5,
                    repeat: -1,
                    yoyo: true,
                    ease: 'sine.inOut',
                }
            )

            // Outer rings rotation
            if (rotate) {
                gsap.to('[data-orbit-outer]', {
                    rotation: 360,
                    transformOrigin: '50% 50%',
                    duration: 35,
                    ease: 'none',
                    repeat: -1,
                })

                gsap.to('[data-orbit-mid]', {
                    rotation: -360,
                    transformOrigin: '50% 50%',
                    duration: 25,
                    ease: 'none',
                    repeat: -1,
                })

                gsap.to('[data-orbit-inner]', {
                    rotation: 360,
                    transformOrigin: '50% 50%',
                    duration: 15,
                    ease: 'none',
                    repeat: -1,
                })
            }

            // Nodes staggered pulse
            if (pulseNodes) {
                gsap.to('[data-node]', {
                    scale: 1.4,
                    duration: 1,
                    stagger: {
                        each: 0.2,
                        repeat: -1,
                        yoyo: true,
                    },
                    ease: 'power1.inOut',
                })
            }

            // Data flow animation
            gsap.to('[data-flow]', {
                strokeDashoffset: -40,
                duration: 2,
                repeat: -1,
                ease: 'none',
            })
        },
        { scope: svgRef }
    )

    return (
        <svg
            ref={svgRef}
            className={cn('text-primary gsap-will-change gsap-composite gsap-motion-safe gsap-svg-crisp', className)}
            width={size}
            height={size}
            viewBox="0 0 100 100"
            fill="none"
            role="img"
            aria-label="AgentStack professional orbital logo"
        >
            {/* Outer dotted orbit */}
            <circle
                data-orbit-outer
                cx="50"
                cy="50"
                r="46"
                stroke="currentColor"
                strokeOpacity="0.1"
                strokeWidth="1"
                strokeDasharray="1 6"
            />

            {/* Main orbits */}
            <g data-orbit-mid>
                <circle
                    cx="50"
                    cy="50"
                    r="38"
                    stroke="currentColor"
                    strokeOpacity="0.15"
                    strokeWidth="1.5"
                />
                <circle data-node cx="88" cy="50" r="2.5" fill="currentColor" />
                <circle data-node cx="12" cy="50" r="2.5" fill="currentColor" />
            </g>

            <g data-orbit-inner>
                <circle
                    cx="50"
                    cy="50"
                    r="28"
                    stroke="currentColor"
                    strokeOpacity="0.25"
                    strokeWidth="2"
                    strokeDasharray="15 8"
                />
                <circle data-node cx="50" cy="22" r="3.5" fill="currentColor" />
                <circle data-node cx="50" cy="78" r="3.5" fill="currentColor" />
            </g>

            {/* Data flow lines */}
            <path
                data-flow
                d="M50 22 A28 28 0 0 1 78 50"
                stroke="currentColor"
                strokeOpacity="0.4"
                strokeWidth="2"
                strokeDasharray="4 8"
            />
            <path
                data-flow
                d="M22 50 A28 28 0 0 0 50 78"
                stroke="currentColor"
                strokeOpacity="0.4"
                strokeWidth="2"
                strokeDasharray="4 8"
            />

            {/* Hexagonal Core */}
            <path
                data-core
                d="M50 38 L60.4 44 V56 L50 62 L39.6 56 V44 Z"
                fill="currentColor"
                fillOpacity="0.1"
                stroke="currentColor"
                strokeWidth="1.5"
            />
            <circle cx="50" cy="50" r="4" fill="currentColor" />
        </svg>
    )
}
