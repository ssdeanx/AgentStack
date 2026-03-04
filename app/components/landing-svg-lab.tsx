'use client'

import { useRef } from 'react'
import { useGSAP } from '@gsap/react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import {
    SectionLayout,
    SECTION_HEADING,
    SECTION_BODY,
    SECTION_LAYOUT,
} from '@/app/components/primitives'
import {
    AnimatedSignalPulse,
    AnimatedLiquidBlob,
    AnimatedGradientRings,
    AnimatedDataStream,
    AnimatedNeuralMesh,
    AnimatedPrismOrbit,
    AnimatedMorphWaves,
    AnimatedRadarScan,
    AnimatedCircuitGrid,
    AnimatedHelixDna,
    AnimatedShieldMatrix,
    AnimatedQuantumLattice,
    AnimatedTokenStream,
    AnimatedAegisCore,
    AnimatedFractalBeacon,
    AnimatedOrbitShards,
    AnimatedWaveInterference,
    AnimatedPacketBurst,
} from '@/app/components/gsap/svg-suite'
import { cn } from '@/lib/utils'

const SVG_SAMPLES = [
    {
        name: 'Signal Pulse',
        purpose: 'Heartbeat & liveness telemetry',
        Component: AnimatedSignalPulse,
        accent: 'from-green-500/15 to-emerald-500/5',
        textColor: 'text-green-400/90',
    },
    {
        name: 'Liquid Blob',
        purpose: 'Adaptive model state',
        Component: AnimatedLiquidBlob,
        accent: 'from-blue-500/15 to-sky-500/5',
        textColor: 'text-blue-400/90',
    },
    {
        name: 'Gradient Rings',
        purpose: 'Layered orchestration cycles',
        Component: AnimatedGradientRings,
        accent: 'from-violet-500/15 to-purple-500/5',
        textColor: 'text-violet-400/90',
    },
    {
        name: 'Data Stream',
        purpose: 'Packetized event flow',
        Component: AnimatedDataStream,
        accent: 'from-cyan-500/15 to-teal-500/5',
        textColor: 'text-cyan-400/90',
    },
    {
        name: 'Neural Mesh',
        purpose: 'Agent graph signaling',
        Component: AnimatedNeuralMesh,
        accent: 'from-purple-500/15 to-indigo-500/5',
        textColor: 'text-purple-400/90',
    },
    {
        name: 'Prism Orbit',
        purpose: 'Multi-vector reasoning',
        Component: AnimatedPrismOrbit,
        accent: 'from-pink-500/15 to-rose-500/5',
        textColor: 'text-pink-400/90',
    },
    {
        name: 'Morph Waves',
        purpose: 'State transitions',
        Component: AnimatedMorphWaves,
        accent: 'from-amber-500/15 to-yellow-500/5',
        textColor: 'text-amber-400/90',
    },
    {
        name: 'Radar Scan',
        purpose: 'Discovery & anomaly sweeps',
        Component: AnimatedRadarScan,
        accent: 'from-green-500/15 to-lime-500/5',
        textColor: 'text-green-300/90',
    },
    {
        name: 'Circuit Grid',
        purpose: 'Deterministic execution',
        Component: AnimatedCircuitGrid,
        accent: 'from-blue-500/15 to-indigo-500/5',
        textColor: 'text-blue-300/90',
    },
    {
        name: 'Helix DNA',
        purpose: 'Learning & memory loop',
        Component: AnimatedHelixDna,
        accent: 'from-fuchsia-500/15 to-purple-500/5',
        textColor: 'text-fuchsia-400/90',
    },
    {
        name: 'Shield Matrix',
        purpose: 'Security posture',
        Component: AnimatedShieldMatrix,
        accent: 'from-emerald-500/15 to-teal-500/5',
        textColor: 'text-emerald-400/90',
    },
    {
        name: 'Quantum Lattice',
        purpose: 'Parallel graph compute',
        Component: AnimatedQuantumLattice,
        accent: 'from-sky-500/15 to-cyan-500/5',
        textColor: 'text-sky-400/90',
    },
    {
        name: 'Token Stream',
        purpose: 'Prompt/response flow',
        Component: AnimatedTokenStream,
        accent: 'from-orange-500/15 to-amber-500/5',
        textColor: 'text-orange-400/90',
    },
    {
        name: 'Aegis Core',
        purpose: 'Policy hardening',
        Component: AnimatedAegisCore,
        accent: 'from-red-500/15 to-rose-500/5',
        textColor: 'text-red-400/90',
    },
    {
        name: 'Fractal Beacon',
        purpose: 'Signal propagation',
        Component: AnimatedFractalBeacon,
        accent: 'from-violet-500/15 to-fuchsia-500/5',
        textColor: 'text-violet-300/90',
    },
    {
        name: 'Orbit Shards',
        purpose: 'Multi-agent orbiting',
        Component: AnimatedOrbitShards,
        accent: 'from-indigo-500/15 to-blue-500/5',
        textColor: 'text-indigo-400/90',
    },
    {
        name: 'Wave Interference',
        purpose: 'Cross-channel sync',
        Component: AnimatedWaveInterference,
        accent: 'from-teal-500/15 to-cyan-500/5',
        textColor: 'text-teal-400/90',
    },
    {
        name: 'Packet Burst',
        purpose: 'Throughput cadence',
        Component: AnimatedPacketBurst,
        accent: 'from-pink-500/15 to-fuchsia-500/5',
        textColor: 'text-pink-300/90',
    },
]

export function LandingSvgLab() {
    const sectionRef = useRef<HTMLDivElement>(null)

    useGSAP(
        () => {
            if (!sectionRef.current) { return }
            gsap.registerPlugin(ScrollTrigger)

            // Set initial invisible state for cards
            gsap.set('.svg-card-anim', { opacity: 0 })

            // Header reveal
            const header = sectionRef.current.querySelector('.svg-lab-header')
            if (header) {
                gsap.fromTo(
                    header,
                    { opacity: 0, y: 30 },
                    {
                        opacity: 1,
                        y: 0,
                        duration: 0.6,
                        ease: 'power2.out',
                        scrollTrigger: {
                            trigger: header,
                            start: 'top 85%',
                            once: true,
                        },
                    }
                )
            }

            // Grid cards: 3D wave entrance — staggered with slight Z depth variation
            const cards = sectionRef.current.querySelectorAll('.svg-card-anim')
            if (cards.length > 0) {
                gsap.fromTo(
                    cards,
                    {
                        opacity: 0,
                        y: 50,
                        rotateX: 20,
                        scale: 0.92,
                    },
                    {
                        opacity: 1,
                        y: 0,
                        rotateX: 0,
                        scale: 1,
                        duration: 0.55,
                        stagger: {
                            amount: 1.2,
                            grid: 'auto',
                            from: 'start',
                        },
                        ease: 'power2.out',
                        scrollTrigger: {
                            trigger: sectionRef.current.querySelector('.svg-lab-grid'),
                            start: 'top 80%',
                            once: true,
                        },
                    }
                )
            }
        },
        { scope: sectionRef }
    )

    return (
        <SectionLayout spacing="base" background="radial" borderBottom>
            <div ref={sectionRef}>
                {/* Header */}
                <div className={cn('svg-lab-header', SECTION_LAYOUT.headerCenter)}>
                    <div className="mb-3 inline-flex items-center rounded-full border border-border/60 bg-muted/30 px-3 py-1 text-xs font-mono tracking-wider text-muted-foreground uppercase">
                        GSAP SVG Suite
                    </div>
                    <h2 className={cn('mb-4', SECTION_HEADING.h2)}>
                        Cutting-Edge Animated Components
                    </h2>
                    <p className={SECTION_BODY.subtitleCentered}>
                        18 production-ready animated SVG systems: kinetic geometry,
                        subtle loops, and performance-first motion. Reduced-motion safe.
                    </p>
                </div>

                {/* Grid */}
                <div className="svg-lab-grid @container grid grid-cols-2 gap-4 @sm:grid-cols-3 @lg:grid-cols-4 @xl:grid-cols-6">
                    {SVG_SAMPLES.map(({ name, purpose, Component, accent, textColor }) => (
                        <article
                            key={name}
                            className={cn(
                                'svg-card-anim group relative rounded-2xl border border-border/60 p-4 transition-all duration-400 ease-spring',
                                'hover:-translate-y-1 hover:border-primary/30 hover:shadow-xl cursor-default',
                                'bg-linear-to-br',
                                accent,
                                'overflow-hidden'
                            )}
                        >
                            {/* Subtle grid overlay */}
                            <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808006_1px,transparent_1px),linear-gradient(to_bottom,#80808006_1px,transparent_1px)] bg-[size:12px_12px] pointer-events-none" />

                            {/* Hover glow */}
                            <div className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-radial-[ellipse_at_50%_0%] from-white/5 to-transparent" />

                            <div className="gsap-svg-stage relative z-10 mb-3 flex aspect-square items-center justify-center rounded-xl">
                                <Component
                                    className={cn('gsap-svg-icon gsap-svg-card gsap-svg-crisp', textColor)}
                                    size={96}
                                    animate
                                />
                            </div>
                            <h3 className="relative z-10 text-xs font-semibold text-foreground leading-tight">
                                {name}
                            </h3>
                            <p className="relative z-10 mt-0.5 text-[10px] leading-snug text-muted-foreground">
                                {purpose}
                            </p>
                        </article>
                    ))}
                </div>

                <p className="svg-lab-footer mt-8 text-center text-sm text-muted-foreground/70">
                    Every SVG is reduced-motion safe and renders with{' '}
                    <span className="font-mono text-xs">currentColor</span> for seamless
                    theme compatibility.
                </p>
            </div>
        </SectionLayout>
    )
}
