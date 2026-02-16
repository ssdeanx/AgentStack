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
} from '@/app/components/gsap/svg-suite'

const SVG_SAMPLES = [
    { name: 'Signal Pulse', Component: AnimatedSignalPulse },
    { name: 'Liquid Blob', Component: AnimatedLiquidBlob },
    { name: 'Gradient Rings', Component: AnimatedGradientRings },
    { name: 'Data Stream', Component: AnimatedDataStream },
    { name: 'Neural Mesh', Component: AnimatedNeuralMesh },
    { name: 'Prism Orbit', Component: AnimatedPrismOrbit },
    { name: 'Morph Waves', Component: AnimatedMorphWaves },
    { name: 'Radar Scan', Component: AnimatedRadarScan },
    { name: 'Circuit Grid', Component: AnimatedCircuitGrid },
    { name: 'Helix DNA', Component: AnimatedHelixDna },
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
                        10 production-ready animated SVG systems tuned for 2026
                        interaction design trends: kinetic geometry, subtle
                        loops, and performance-first motion.
                    </p>
                </div>

                <div className="svg-lab-grid @container grid grid-cols-1 gap-4 @sm:grid-cols-2 @lg:grid-cols-3 @xl:grid-cols-5">
                    {SVG_SAMPLES.map(({ name, Component }) => (
                        <article
                            key={name}
                            className="group rounded-2xl border border-border bg-card/70 p-4 transition-all duration-300 ease-spring hover:border-primary/35 hover:shadow-lg"
                        >
                            <div className="mb-3 flex aspect-square items-center justify-center rounded-xl bg-muted/40">
                                <Component className="gsap-svg-icon" />
                            </div>
                            <h3 className="text-sm font-medium text-foreground">
                                {name}
                            </h3>
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
