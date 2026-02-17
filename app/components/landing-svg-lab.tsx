'use client'

import {
    SectionLayout,
    useSectionReveal,
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

const SVG_SAMPLES = [
    {
        name: 'Signal Pulse',
        purpose: 'Heartbeat and liveness telemetry',
        Component: AnimatedSignalPulse,
    },
    {
        name: 'Liquid Blob',
        purpose: 'Adaptive model state and fluid routing',
        Component: AnimatedLiquidBlob,
    },
    {
        name: 'Gradient Rings',
        purpose: 'Layered orchestration cycles',
        Component: AnimatedGradientRings,
    },
    {
        name: 'Data Stream',
        purpose: 'Packetized event/data flow',
        Component: AnimatedDataStream,
    },
    {
        name: 'Neural Mesh',
        purpose: 'Agent graph and inter-node signaling',
        Component: AnimatedNeuralMesh,
    },
    {
        name: 'Prism Orbit',
        purpose: 'Multi-vector reasoning paths',
        Component: AnimatedPrismOrbit,
    },
    {
        name: 'Morph Waves',
        purpose: 'State transitions and confidence drift',
        Component: AnimatedMorphWaves,
    },
    {
        name: 'Radar Scan',
        purpose: 'Discovery and anomaly sweeps',
        Component: AnimatedRadarScan,
    },
    {
        name: 'Circuit Grid',
        purpose: 'Deterministic execution pathways',
        Component: AnimatedCircuitGrid,
    },
    {
        name: 'Helix DNA',
        purpose: 'Learning memory and evolution loop',
        Component: AnimatedHelixDna,
    },
    {
        name: 'Shield Matrix',
        purpose: 'Security posture and trust boundaries',
        Component: AnimatedShieldMatrix,
    },
    {
        name: 'Quantum Lattice',
        purpose: 'Parallel orchestration and graph compute',
        Component: AnimatedQuantumLattice,
    },
    {
        name: 'Token Stream',
        purpose: 'Prompt/response ingress and egress flow',
        Component: AnimatedTokenStream,
    },
    {
        name: 'Aegis Core',
        purpose: 'Trust boundaries and policy hardening',
        Component: AnimatedAegisCore,
    },
    {
        name: 'Fractal Beacon',
        purpose: 'Signal propagation and reference points',
        Component: AnimatedFractalBeacon,
    },
    {
        name: 'Orbit Shards',
        purpose: 'Multi-agent orbit and shard processing',
        Component: AnimatedOrbitShards,
    },
    {
        name: 'Wave Interference',
        purpose: 'Cross-channel sync and wave overlap',
        Component: AnimatedWaveInterference,
    },
    {
        name: 'Packet Burst',
        purpose: 'Throughput bursts and transfer cadence',
        Component: AnimatedPacketBurst,
    },
]

export function LandingSvgLab() {
    const revealRef = useSectionReveal<HTMLDivElement>({
        selector: '.svg-lab-header, .svg-lab-grid, .svg-lab-footer',
        stagger: 0.1,
    })

    return (
        <SectionLayout spacing="base" background="radial" borderBottom>
            <div ref={revealRef}>
                <div className={`svg-lab-header ${SECTION_LAYOUT.headerCenter}`}>
                    <h2 className={`mb-4 ${SECTION_HEADING.h2}`}>
                        Cutting-Edge GSAP SVG Suite
                    </h2>
                    <p className={SECTION_BODY.subtitleCentered}>
                        18 production-ready animated SVG systems tuned for 2026
                        interaction design trends: kinetic geometry, subtle
                        loops, and performance-first motion.
                    </p>
                </div>

                <div className="svg-lab-grid @container grid grid-cols-1 gap-4 @sm:grid-cols-2 @lg:grid-cols-3 @xl:grid-cols-5">
                    {SVG_SAMPLES.map(({ name, purpose, Component }) => (
                        <article
                            key={name}
                            className="group rounded-2xl border border-border bg-card/75 p-4 transition-all duration-300 ease-spring hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg"
                        >
                            <div className="gsap-svg-stage mb-3 flex aspect-square items-center justify-center rounded-xl p-2">
                                <Component
                                    className="gsap-svg-icon gsap-svg-card gsap-svg-crisp"
                                    size={128}
                                    animate
                                />
                            </div>
                            <h3 className="text-sm font-medium text-foreground">
                                {name}
                            </h3>
                            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                                {purpose}
                            </p>
                        </article>
                    ))}
                </div>

                <p className="svg-lab-footer mt-8 text-center text-sm text-muted-foreground">
                    Every SVG is reduced-motion safe and theme-compatible with
                    currentColor-based rendering.
                </p>
            </div>
        </SectionLayout>
    )
}
