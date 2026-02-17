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

            gsap.fromTo(
                '[data-core]',
                { scale: 0.85, autoAlpha: 0.75 },
                {
                    scale: 1,
                    autoAlpha: 1,
                    duration: 0.6,
                    ease: 'power2.out',
                }
            )

            if (rotate) {
                gsap.to('[data-orbit-a]', {
                    rotation: 360,
                    transformOrigin: '50% 50%',
                    duration: 10,
                    ease: 'none',
                    repeat: -1,
                })

                gsap.to('[data-orbit-b]', {
                    rotation: -360,
                    transformOrigin: '50% 50%',
                    duration: 14,
                    ease: 'none',
                    repeat: -1,
                })
            }

            if (pulseNodes) {
                gsap.to('[data-node]', {
                    scale: 1.12,
                    autoAlpha: 0.75,
                    duration: 1.2,
                    ease: 'sine.inOut',
                    repeat: -1,
                    yoyo: true,
                    stagger: {
                        each: 0.15,
                        repeat: -1,
                        yoyo: true,
                    },
                })
            }

            gsap.to('[data-link-pulse]', {
                strokeDashoffset: -42,
                duration: 1.1,
                ease: 'none',
                repeat: -1,
            })

            gsap.to('[data-link-pulse]', {
                strokeDashoffset: -42,
                duration: 1.1,
                ease: 'none',
                repeat: -1,
            })
        },
        { scope: svgRef }
    )

    return (
        <svg
            ref={svgRef}
            className={cn('text-blue-500 dark:text-blue-400 gsap-will-change gsap-composite gsap-motion-safe gsap-svg-crisp', className)}
            width={size}
            height={size}
            viewBox="0 0 100 100"
            fill="none"
            role="img"
            aria-label="AgentStack animated orbital logo"
        >
            <g data-orbit-group data-orbit-a>
                <circle
                    cx="50"
                    cy="50"
                    r="34"
                    stroke="currentColor"
                    strokeOpacity="0.28"
                    strokeWidth="2"
                />
                <circle data-node cx="84" cy="50" r="4" fill="currentColor" />
                <circle
                    data-node
                    cx="50"
                    cy="16"
                    r="3"
                    fill="currentColor"
                    fillOpacity="0.9"
                />
            </g>

            <g data-orbit-group data-orbit-b>
                <ellipse
                    cx="50"
                    cy="50"
                    rx="25"
                    ry="15"
                    stroke="currentColor"
                    strokeOpacity="0.2"
                    strokeWidth="2"
                    transform="rotate(35 50 50)"
                />
                <circle
                    data-node
                    cx="72"
                    cy="35"
                    r="3"
                    fill="currentColor"
                    fillOpacity="0.85"
                />
            </g>

            <path
                data-link-pulse
                d="M28 64 Q50 50 72 36"
                stroke="currentColor"
                strokeOpacity="0.5"
                strokeWidth="1.8"
                strokeDasharray="6 8"
                fill="none"
            />

            <path
                data-link-pulse
                d="M28 64 Q50 50 72 36"
                stroke="currentColor"
                strokeOpacity="0.5"
                strokeWidth="1.8"
                strokeDasharray="6 8"
                fill="none"
            />

            <circle
                data-core
                cx="50"
                cy="50"
                r="12"
                fill="currentColor"
                fillOpacity="0.18"
            />
            <circle cx="50" cy="50" r="7" fill="currentColor" />
        </svg>
    )
}
