'use client'

import { useRef, type RefObject } from 'react'
import { useGSAP } from '@gsap/react'
import { gsap } from 'gsap'
import { ensureGsapRegistered } from '@/app/components/gsap/registry'

interface UseSectionRevealOptions {
    /** CSS selector applied inside the scope to target child elements. Defaults to direct children. */
    selector?: string
    /** Stagger delay between child reveals in seconds. */
    stagger?: number
    /** Vertical offset in pixels for the entrance. */
    yOffset?: number
    /** Animation duration in seconds. */
    duration?: number
    /** Whether the reveal should only play once. */
    once?: boolean
    /** Delay before the section starts animating in seconds. */
    delay?: number
    /** Disable the animation entirely (useful for conditional opt-out). */
    disabled?: boolean
}

const DEFAULTS: Required<UseSectionRevealOptions> = {
    selector: ':scope > *',
    stagger: 0.08,
    yOffset: 24,
    duration: 0.55,
    once: true,
    delay: 0,
    disabled: false,
}

/**
 * Unified section-level reveal using GSAP ScrollTrigger.
 * Removes per-component Framer Motion `whileInView` drift and
 * provides a single, configurable entry animation for public sections.
 *
 * Returns a ref that should be attached to the section root element.
 */
export function useSectionReveal<T extends HTMLElement = HTMLDivElement>(
    options: UseSectionRevealOptions = {}
): RefObject<T | null> {
    const scopeRef = useRef<T>(null)
    const merged = { ...DEFAULTS, ...options }

    useGSAP(
        () => {
            if (merged.disabled) {
                return
            }

            ensureGsapRegistered()

            if (!scopeRef.current) {
                return
            }

            const prefersReducedMotion = window.matchMedia(
                '(prefers-reduced-motion: reduce)'
            ).matches

            const targets = scopeRef.current.querySelectorAll(merged.selector)

            if (targets.length === 0) {
                return
            }

            if (prefersReducedMotion) {
                gsap.set(targets, { opacity: 1, y: 0 })
                return
            }

            gsap.fromTo(
                targets,
                { opacity: 0, y: merged.yOffset },
                {
                    opacity: 1,
                    y: 0,
                    duration: merged.duration,
                    stagger: merged.stagger,
                    delay: merged.delay,
                    ease: 'power2.out',
                    scrollTrigger: {
                        trigger: scopeRef.current,
                        start: 'top 85%',
                        once: merged.once,
                    },
                }
            )
        },
        {
            scope: scopeRef,
            dependencies: [
                merged.disabled,
                merged.selector,
                merged.stagger,
                merged.yOffset,
                merged.duration,
                merged.once,
                merged.delay,
            ],
            revertOnUpdate: true,
        }
    )

    return scopeRef
}
