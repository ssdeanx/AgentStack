'use client'

import { useRef } from 'react'
import { useGSAP } from '@gsap/react'
import { ensureGsapRegistered } from '@/app/components/gsap/registry'
import { cn } from '@/lib/utils'

export function NetworkBackground({ className }: { className?: string }) {
    const ref = useRef<SVGSVGElement>(null)

    useGSAP(
        () => {
            ensureGsapRegistered()
            if (!ref.current) { return }

            // Architectural grid expansion
            gsap.fromTo('[data-net-grid]',
                { opacity: 0, scale: 0.95 },
                { opacity: 1, scale: 1, duration: 2, ease: 'expo.out' }
            )

            // Systematic pulse progression
            gsap.to('[data-net-pulse]', {
                strokeDashoffset: -100,
                duration: 10,
                repeat: -1,
                ease: 'none',
                stagger: 2
            })
        },
        { scope: ref }
    )

    return (
        <div className={cn('absolute inset-0 z-0 pointer-events-none', className)}>
            <svg
                ref={ref}
                className="size-full opacity-20"
                viewBox="0 0 1000 1000"
                preserveAspectRatio="xMidYMid slice"
                fill="none"
                stroke="currentColor"
                strokeWidth="0.5"
            >
                {/* Horizontal System Struts */}
                <g data-net-grid strokeOpacity="0.1">
                    <line x1="0" y1="100" x2="1000" y2="100" />
                    <line x1="0" y1="200" x2="1000" y2="200" />
                    <line x1="0" y1="300" x2="1000" y2="300" />
                    <line x1="0" y1="400" x2="1000" y2="400" />
                    <line x1="0" y1="500" x2="1000" y2="500" />
                    <line x1="0" y1="600" x2="1000" y2="600" />
                    <line x1="0" y1="700" x2="1000" y2="700" />
                    <line x1="0" y1="800" x2="1000" y2="800" />
                    <line x1="0" y1="900" x2="1000" y2="900" />
                </g>

                {/* Vertical System Struts */}
                <g data-net-grid strokeOpacity="0.1">
                    <line x1="100" y1="0" x2="100" y2="1000" />
                    <line x1="200" y1="0" x2="200" y2="1000" />
                    <line x1="300" y1="0" x2="300" y2="1000" />
                    <line x1="400" y1="0" x2="400" y2="1000" />
                    <line x1="500" y1="0" x2="500" y2="1000" />
                    <line x1="600" y1="0" x2="600" y2="1000" />
                    <line x1="700" y1="0" x2="700" y2="1000" />
                    <line x1="800" y1="0" x2="800" y2="1000" />
                    <line x1="900" y1="0" x2="900" y2="1000" />
                </g>

                {/* Primary Data Highways (Pulse Target) */}
                <g strokeWidth="1" strokeOpacity="0.3" strokeDasharray="10 40">
                    <line data-net-pulse x1="500" y1="0" x2="500" y2="1000" />
                    <line data-net-pulse x1="0" y1="500" x2="1000" y2="500" />
                </g>

                {/* Junction Points - Defined Manually */}
                <g opacity="0.4">
                    <circle cx="500" cy="500" r="2" fill="currentColor" />
                    <circle cx="200" cy="200" r="1.5" fill="currentColor" />
                    <circle cx="800" cy="200" r="1.5" fill="currentColor" />
                    <circle cx="200" cy="800" r="1.5" fill="currentColor" />
                    <circle cx="800" cy="800" r="1.5" fill="currentColor" />
                </g>
            </svg>
        </div>
    )
}
