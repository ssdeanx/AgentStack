'use client'

import { useRef } from 'react'
import { useGSAP } from '@gsap/react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import {
    BotIcon,
    DatabaseIcon,
    WrenchIcon,
    ActivityIcon,
    ShieldIcon,
    ZapIcon,
    GitBranchIcon,
    CodeIcon,
} from 'lucide-react'
import { Badge } from '@/ui/badge'
import { BentoGrid, BentoGridItem } from '@/ui/effects/bento-grid'
import { cn } from '@/lib/utils'
import {
    SectionLayout,
    useSectionReveal,
    SECTION_HEADING,
    SECTION_BODY,
    SECTION_LAYOUT,
} from '@/app/components/primitives'
import {
    AnimatedNeuralMesh,
    AnimatedGradientRings,
    AnimatedSignalPulse,
    AnimatedCircuitGrid,
    AnimatedOrbitShards,
} from '@/app/components/gsap/svg-suite'

const BentoHeader = ({
    children,
}: {
    children: React.ReactNode
}) => (
    <div className="relative flex flex-1 w-full h-full min-h-36 rounded-xl items-center justify-center bg-card border border-border/40 overflow-hidden">
        {/* Subtle horizontal scan line */}
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent_0%,hsl(var(--primary)/0.03)_50%,transparent_100%)] pointer-events-none" />
        {/* Corner accent */}
        <div className="absolute top-0 left-0 w-12 h-px bg-linear-to-r from-primary/30 to-transparent" />
        <div className="absolute top-0 left-0 w-px h-12 bg-linear-to-b from-primary/30 to-transparent" />
        <div className="absolute bottom-0 right-0 w-12 h-px bg-linear-to-l from-primary/20 to-transparent" />
        <div className="relative z-10">{children}</div>
    </div>
)

const FEATURES = [
    {
        title: 'Multi-Agent Orchestration',
        description:
            'Coordinate complex workflows with 22+ specialized agents working in parallel with graph-based signaling.',
        header: (
            <BentoHeader>
                <AnimatedNeuralMesh size={130} className="text-primary/60" animate />
            </BentoHeader>
        ),
        icon: <BotIcon className="h-4 w-4 text-neutral-500" />,
        className: 'md:col-span-2',
    },
    {
        title: 'RAG Pipelines',
        description:
            'Built-in retrieval-augmented generation with PgVector and semantic search.',
        header: (
            <BentoHeader>
                <AnimatedGradientRings size={130} className="text-primary/60" animate />
            </BentoHeader>
        ),
        icon: <DatabaseIcon className="h-4 w-4 text-neutral-500" />,
        className: 'md:col-span-1',
    },
    {
        title: 'Enterprise Tools',
        description:
            '30+ production-ready tools for financial data, web scraping, and research.',
        header: (
            <BentoHeader>
                <AnimatedCircuitGrid size={130} className="text-primary/60" animate />
            </BentoHeader>
        ),
        icon: <WrenchIcon className="h-4 w-4 text-neutral-500" />,
        className: 'md:col-span-1',
    },
    {
        title: 'Full Observability',
        description:
            'Complete tracing and monitoring with Arize/Phoenix and structured telemetry.',
        header: (
            <BentoHeader>
                <AnimatedSignalPulse size={130} className="text-primary/60" animate />
            </BentoHeader>
        ),
        icon: <ActivityIcon className="h-4 w-4 text-neutral-500" />,
        className: 'md:col-span-2',
    },
]

const ADDITIONAL_FEATURES = [
    {
        title: 'Security & Governance',
        description:
            'Enterprise-grade security with role-based access, audit logs, and compliance features.',
        icon: ShieldIcon,
    },
    {
        title: 'Workflow Automation',
        description:
            'Visual workflow builder with conditional logic, loops, and built-in error handling.',
        icon: GitBranchIcon,
    },
    {
        title: 'Lightning Fast',
        description:
            'Optimized for performance with streaming responses and efficient resource usage.',
        icon: ZapIcon,
    },
    {
        title: 'Developer First',
        description:
            'TypeScript native with excellent DX, comprehensive docs, and an active community.',
        icon: CodeIcon,
    },
]

export function LandingFeatures() {
    const sectionRef = useRef<HTMLDivElement>(null)
    const revealRef = useSectionReveal<HTMLDivElement>({
        selector: '.feat-header, .feat-stats',
        stagger: 0.1,
    })

    useGSAP(
        () => {
            if (!sectionRef.current) { return }

            gsap.registerPlugin(ScrollTrigger)

            // Set initial states for GSAP-controlled elements
            gsap.set('.bento-stagger-init', { opacity: 0, y: 50, rotateX: 12, transformOrigin: 'top center' })
            gsap.set('.feat-card-anim', { opacity: 0, y: 24, scale: 0.97 })

            // 3D staggered entrance for bento items
            const bentoItems = sectionRef.current.querySelectorAll('.bento-stagger-init')
            if (bentoItems.length > 0) {
                gsap.to(bentoItems, {
                    opacity: 1,
                    y: 0,
                    rotateX: 0,
                    duration: 0.7,
                    stagger: 0.12,
                    ease: 'power3.out',
                    scrollTrigger: {
                        trigger: sectionRef.current,
                        start: 'top 78%',
                        once: true,
                    },
                })
            }

            // Additional feature cards stagger
            const gridCards = sectionRef.current.querySelectorAll('.feat-card-anim')
            if (gridCards.length > 0) {
                gsap.to(gridCards, {
                    opacity: 1,
                    y: 0,
                    scale: 1,
                    duration: 0.5,
                    stagger: 0.08,
                    ease: 'power2.out',
                    scrollTrigger: {
                        trigger: gridCards[0],
                        start: 'top 88%',
                        once: true,
                    },
                })
            }
        },
        { scope: sectionRef }
    )

    return (
        <SectionLayout spacing="base" background="gradient-top">
            <div ref={sectionRef}>
                <div ref={revealRef}>
                    <div className={`feat-header ${SECTION_LAYOUT.headerCenter}`}>
                        <Badge variant="outline" className="mb-4">
                            Features
                        </Badge>
                        <div className="mb-5 flex justify-center">
                            <div className="gsap-svg-stage relative flex items-center justify-center rounded-2xl border border-border/60 bg-linear-to-br from-card to-primary/5 p-2">
                                <AnimatedOrbitShards
                                    className="gsap-svg-icon gsap-svg-crisp"
                                    size={142}
                                    animate
                                />
                            </div>
                        </div>
                        <h2 className={`mb-4 ${SECTION_HEADING.h2}`}>
                            Everything You Need
                        </h2>
                        <p className={SECTION_BODY.subtitleCentered}>
                            A complete framework for building, deploying, and
                            monitoring AI agent applications at scale.
                        </p>
                    </div>
                </div>

                {/* Main feature grid (Bento) with 3D scroll entrance */}
                <div className="preserve-3d">
                    <BentoGrid className="mb-24">
                        {FEATURES.map((feature) => (
                            <div key={feature.title} className="bento-stagger-init contents">
                                <BentoGridItem
                                    title={feature.title}
                                    description={feature.description}
                                    header={feature.header}
                                    icon={feature.icon}
                                    className={cn(
                                        'hover:shadow-2xl hover:shadow-primary/10 hover:border-primary/20 transition-all duration-500 hover:-translate-y-0.5',
                                        feature.className
                                    )}
                                />
                            </div>
                        ))}
                    </BentoGrid>
                </div>

                {/* Additional features */}
                <div className="@container grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                    {ADDITIONAL_FEATURES.map((feature) => (
                        <div
                            key={feature.title}
                            className="feat-card-anim group rounded-xl border border-border bg-card p-6 shadow-sm transition-all duration-400 hover:border-primary/20 hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-1"
                        >
                            <div className="mb-4 inline-flex size-10 items-center justify-center rounded-lg border border-border bg-background shadow-sm text-foreground transition-all group-hover:border-primary/30 group-hover:text-primary group-hover:scale-110">
                                <feature.icon
                                    className="size-5"
                                    strokeWidth={1.5}
                                />
                            </div>
                            <h3 className="mb-2 font-semibold text-foreground">
                                {feature.title}
                            </h3>
                            <p className={SECTION_BODY.body}>
                                {feature.description}
                            </p>
                        </div>
                    ))}
                </div>

                {/* Stats bar */}
                <div className="feat-stats mt-20 rounded-2xl border border-border/50 bg-muted/20 p-8 backdrop-blur-sm">
                    <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
                        {[
                            { value: '22+', label: 'Specialized Agents' },
                            { value: '30+', label: 'Enterprise Tools' },
                            { value: '10', label: 'Workflow Templates' },
                            { value: '99.9%', label: 'Uptime SLA' },
                        ].map((item) => (
                            <div key={item.label} className="text-center group">
                                <div className="text-3xl font-bold text-foreground lg:text-4xl transition-colors group-hover:text-primary">
                                    {item.value}
                                </div>
                                <div className="mt-1 text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
                                    {item.label}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </SectionLayout>
    )
}
