'use client'

import type { PropsWithChildren } from 'react'
import { useRef } from 'react'
import { usePathname } from 'next/navigation'
import { useGSAP } from '@gsap/react'
import { gsap } from 'gsap'
import { ensureGsapRegistered } from '@/app/components/gsap/registry'

export function PublicPageReveal({ children }: PropsWithChildren) {
    const scopeRef = useRef<HTMLDivElement>(null)
    const pathname = usePathname()

    useGSAP(
        () => {
            ensureGsapRegistered()

            if (!scopeRef.current) {
                return
            }

            const prefersReducedMotion = window.matchMedia(
                '(prefers-reduced-motion: reduce)'
            ).matches

            if (prefersReducedMotion) {
                gsap.set(scopeRef.current, { autoAlpha: 1, y: 0 })
                return
            }

            gsap.fromTo(
                scopeRef.current,
                { autoAlpha: 0.001, y: 10 },
                {
                    autoAlpha: 1,
                    y: 0,
                    duration: 0.45,
                    ease: 'power2.out',
                    clearProps: 'opacity,visibility,transform',
                }
            )
        },
        {
            scope: scopeRef,
            dependencies: [pathname],
            revertOnUpdate: true,
        }
    )

    return <div ref={scopeRef}>{children}</div>
}
