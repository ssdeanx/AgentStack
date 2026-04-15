'use client'

import { useRef } from 'react'
import { useGSAP } from '@gsap/react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { ensureGsapRegistered } from '@/app/components/gsap/registry'
import { HeroCenterpiece } from '@/app/components/gsap/hero-centerpiece'
import { NetworkBackground } from '@/app/components/network-background'

/**
 * LandingHero: Professional, production-grade hero section.
 * Features a high-precision architectural centerpiece and zero-jitter GSAP orchestration.
 * Completely removed unstable legacy network backgrounds and Framer Motion slop.
 */
export function LandingHero() {
    const sectionRef = useRef<HTMLElement>(null)
    const containerRef = useRef<HTMLDivElement>(null)
    const glowRef1 = useRef<HTMLDivElement>(null)
    const glowRef2 = useRef<HTMLDivElement>(null)
    const glowRef3 = useRef<HTMLDivElement>(null)

    useGSAP(
        () => {
            ensureGsapRegistered()
            gsap.registerPlugin(ScrollTrigger)

            if (!sectionRef.current) { return }

            const tl = gsap.timeline()

            // Synchronized entry sequence
            tl.fromTo(
                '.hero-reveal',
                { opacity: 0, y: 40, filter: 'blur(12px)' },
                {
                    opacity: 1,
                    y: 0,
                    filter: 'blur(0px)',
                    duration: 1.2,
                    ease: 'expo.out',
                    stagger: 0.15,
                }
            )

            // Dynamic ambient illumination
            tl.fromTo(
                [glowRef1.current, glowRef2.current, glowRef3.current],
                { opacity: 0, scale: 0.7 },
                {
                    opacity: 0.6,
                    scale: 1,
                    duration: 3,
                    ease: 'sine.out',
                    stagger: 0.5
                },
                '-=1'
            )

            // Structural depth on scroll
            gsap.to('.hero-parallax-deep', {
                y: -100,
                scrollTrigger: {
                    trigger: sectionRef.current,
                    start: 'top top',
                    end: 'bottom top',
                    scrub: true
                }
            })
        },
        { scope: sectionRef }
    )

    return (
        <section
            ref={sectionRef}
            className="relative min-h-[min(100vh,900px)] w-full overflow-hidden bg-background py-16 sm:py-20 lg:py-24"
        >
            {/* Network Architectural Background (Strict Grid) */}
            <NetworkBackground className="opacity-40" />

            {/* Ambient High-End Glows (Obsidian Theme) */}
            <div ref={glowRef1} className="pointer-events-none absolute -left-[10%] -top-[10%] size-[60%] rounded-full bg-primary/10 blur-[120px] hero-parallax-deep" />
            <div ref={glowRef2} className="pointer-events-none absolute -right-[10%] top-[10%] size-[50%] rounded-full bg-primary/5 blur-[100px] hero-parallax-deep" />
            <div ref={glowRef3} className="pointer-events-none absolute bottom-[-20%] left-1/2 -translate-x-1/2 size-[70%] rounded-full bg-primary/5 blur-[140px]" />

            <div
                ref={containerRef}
                className="container relative z-10 mx-auto grid h-full grid-cols-1 items-center gap-12 px-6 lg:grid-cols-2 lg:gap-16"
            >
                {/* Left: Logical Architecture */}
                <div className="relative z-10 max-w-2xl">
                    <div className="mb-8 inline-flex items-center gap-3 rounded-full border border-primary/20 bg-primary/5 px-4 py-2 backdrop-blur-2xl hero-reveal sm:px-5">
                        <div className="relative flex h-2 w-2">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/40 opacity-75"></span>
                            <span className="relative inline-flex h-2 w-2 rounded-full bg-primary"></span>
                        </div>
                        <span className="font-mono text-[10px] uppercase tracking-[0.4em] text-foreground/70 font-bold">
                            Mastra Production Core v1.1
                        </span>
                    </div>

                    <h1 className="mb-6 text-5xl font-black leading-[0.85] tracking-tight text-foreground sm:text-7xl lg:text-8xl hero-reveal">
                        AGENT
                        <br />
                        <span className="text-transparent bg-clip-text bg-linear-to-b from-foreground via-foreground/90 to-primary/60">
                            SYSTEM
                        </span>
                    </h1>

                    <p className="mb-10 max-w-xl text-balance text-lg leading-relaxed text-muted-foreground/80 font-medium sm:text-xl md:text-2xl hero-reveal">
                        The framework for high-precision multi-agent systems.
                        Engineered for
                        <span className="text-foreground"> architectural stability</span>,
                        observability, and production deployment at scale.
                    </p>

                    <div className="flex flex-col gap-4 sm:flex-row hero-reveal">
                        <button className="group relative h-14 w-full overflow-hidden rounded-2xl bg-primary px-8 text-base font-bold text-primary-foreground shadow-2xl transition-all hover:scale-[1.02] active:scale-95 sm:w-auto sm:px-10 sm:text-lg">
                            <span className="relative z-10 flex items-center justify-center gap-4">
                                Deployment Start
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="size-5 transition-transform group-hover:translate-x-1">
                                    <path d="M5 12h14M12 5l7 7-7 7" />
                                </svg>
                            </span>
                            <div className="absolute inset-0 bg-linear-to-r from-white/0 via-white/10 to-white/0 -translate-x-full group-hover:duration-700 group-hover:translate-x-full transition-transform" />
                        </button>

                        <button className="h-14 w-full rounded-2xl border border-white/10 bg-white/5 px-8 text-base font-bold text-foreground/80 backdrop-blur-3xl transition-all hover:bg-white/10 hover:border-white/20 sm:w-auto sm:px-10 sm:text-lg">
                            System Docs
                        </button>
                    </div>
                </div>

                {/* Right: The High-Precision Professional Centerpiece */}
                <div className="relative flex justify-center hero-reveal lg:justify-end lg:pr-12">
                    <div className="relative">
                        <HeroCenterpiece size={580} className="text-primary" />
                        {/* High-end glow plate */}
                        <div className="absolute inset-0 bg-primary/5 blur-3xl rounded-full scale-75 pointer-events-none" />
                        {/* Architectural shadow floor */}
                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-[80%] h-4 bg-primary/10 blur-2xl rounded-full" />
                    </div>
                </div>
            </div>

            {/* Status Monitoring Bar (Bottom) */}
            <div className="absolute bottom-0 left-0 right-0 h-24 bg-linear-to-t from-background to-transparent z-20 pointer-events-none" />

            <div className="absolute bottom-10 left-12 hero-reveal hidden xl:flex gap-12 font-mono text-[9px] uppercase tracking-[0.3em] text-foreground/30">
                <div className="flex items-center gap-3">
                    <div className="size-1 rounded-full bg-primary" />
                    <span>Latent Orchestration: Active</span>
                </div>
                <div className="flex items-center gap-3">
                    <div className="size-1 rounded-full bg-primary" />
                    <span>Nodes Online: 1,024</span>
                </div>
            </div>
        </section>
    )
}
