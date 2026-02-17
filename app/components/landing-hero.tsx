'use client'

import { useGSAP } from '@gsap/react'
import { gsap } from 'gsap'
import { useRef } from 'react'
import { ensureGsapRegistered } from '@/app/components/gsap/registry'
import { AnimatedOrbitalLogo } from '@/app/components/gsap/animated-orbital-logo'
import { AnimatedQuantumLattice } from '@/app/components/gsap/svg-suite'
import { NetworkBackground } from './network-background'

export function LandingHero() {
    const sectionRef = useRef<HTMLElement>(null)
    const contentRef = useRef<HTMLDivElement>(null)

    useGSAP(
        () => {
            ensureGsapRegistered()

            if (!sectionRef.current || !contentRef.current) {
                return
            }

            const prefersReducedMotion = window.matchMedia(
                '(prefers-reduced-motion: reduce)'
            ).matches

            if (prefersReducedMotion) {
                gsap.set('.hero-element', { opacity: 1, y: 0 })
                gsap.set(contentRef.current, { y: 0, scale: 1 })
                return
            }

            const tl = gsap.timeline()

            tl.fromTo(
                '.hero-element',
                { opacity: 0, y: 20 },
                {
                    opacity: 1,
                    y: 0,
                    duration: 0.6,
                    ease: 'power2.out',
                    stagger: 0.1,
                }
            )

            gsap.to(contentRef.current, {
                y: -50,
                scale: 1.05,
                ease: 'none',
                scrollTrigger: {
                    trigger: sectionRef.current,
                    start: 'top bottom',
                    end: 'bottom top',
                    scrub: 1,
                },
            })
        },
        {
            scope: sectionRef,
        }
    )

    return (
        <section
            ref={sectionRef}
            className="relative h-200 w-full overflow-hidden border-b border-border bg-background"
        >
            {/* Interactive System Visualization */}
            <NetworkBackground />

            {/* Vignette to focus attention */}
            <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_center,transparent_0%,var(--background)_100%)]" />

            <div className="pointer-events-none absolute right-6 top-24 z-10 hidden xl:block hero-element">
                <div className="gsap-svg-stage relative flex items-center justify-center rounded-2xl border border-white/15 bg-black/40 p-2 backdrop-blur-xl">
                    <AnimatedQuantumLattice
                        className="gsap-svg-icon gsap-svg-crisp text-cyan-300"
                        size={150}
                        animate
                    />
                </div>
            </div>

            <div className="container relative z-10 mx-auto flex h-full flex-col items-center justify-center px-4 text-center">
                {/* Main Content */}
                <div ref={contentRef} className="mx-auto max-w-4xl">
                    <div className="mb-6 inline-flex items-center rounded-full border border-white/10 bg-black/50 px-3 py-1 text-sm backdrop-blur-md shadow-lg shadow-black/20 hero-element">
                        <AnimatedOrbitalLogo
                            size={34}
                            className="me-2 text-cyan-300"
                        />
                        <span className="flex size-2 me-2 rounded-full bg-green-500 animate-pulse"></span>
                        <span className="text-white/80 font-mono text-xs tracking-wider">
                            SYSTEM OPERATIONAL
                        </span>
                    </div>

                    <h1 className="mb-8 text-5xl font-bold tracking-tight text-foreground sm:text-6xl lg:text-8xl drop-shadow-2xl hero-element">
                        Agent Orchestration
                        <br />
                        <span className="text-transparent bg-clip-text bg-linear-to-b from-white to-white/50">
                            Interactive Swarm
                        </span>
                    </h1>

                    <p className="mx-auto mb-12 max-w-xl text-lg leading-relaxed text-muted-foreground sm:text-xl hero-element">
                        Visualizing real-time agent interactions. Hover over the
                        nodes to interact with the neural network.
                    </p>

                    <div className="flex items-center justify-center gap-4 hero-element">
                        <div className="h-px w-24 bg-linear-to-r from-transparent via-border to-transparent" />
                        <span className="text-xs text-muted-foreground font-mono uppercase tracking-widest">
                            Live Simulation
                        </span>
                        <div className="h-px w-24 bg-linear-to-r from-transparent via-border to-transparent" />
                    </div>
                </div>
            </div>
        </section>
    )
}
