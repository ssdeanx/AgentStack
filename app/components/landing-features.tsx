'use client'

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
import {
    SectionLayout,
    useSectionReveal,
    SECTION_HEADING,
    SECTION_BODY,
    SECTION_LAYOUT,
} from '@/app/components/primitives'

const FeatureHeader = () => (
    <div className="flex flex-1 w-full h-full min-h-24 rounded-xl bg-linear-to-br from-neutral-200 dark:from-neutral-900 dark:to-neutral-800 to-neutral-100 opacity-50" />
)

const FEATURES = [
    {
        title: 'Multi-Agent Orchestration',
        description:
            'Coordinate complex workflows with 22+ specialized agents working together seamlessly.',
        header: <FeatureHeader />,
        icon: <BotIcon className="h-4 w-4 text-neutral-500" />,
        className: 'md:col-span-2',
    },
    {
        title: 'RAG Pipelines',
        description:
            'Built-in retrieval-augmented generation with PgVector and semantic search.',
        header: <FeatureHeader />,
        icon: <DatabaseIcon className="h-4 w-4 text-neutral-500" />,
        className: 'md:col-span-1',
    },
    {
        title: 'Enterprise Tools',
        description:
            '30+ production-ready tools for financial data and research.',
        header: <FeatureHeader />,
        icon: <WrenchIcon className="h-4 w-4 text-neutral-500" />,
        className: 'md:col-span-1',
    },
    {
        title: 'Observability',
        description:
            'Full tracing and monitoring with Arize/Phoenix integration.',
        header: <FeatureHeader />,
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
            'Visual workflow builder with conditional logic, loops, and error handling.',
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
            'TypeScript native with excellent DX, comprehensive docs, and active community.',
        icon: CodeIcon,
    },
]

export function LandingFeatures() {
    const revealRef = useSectionReveal<HTMLDivElement>({
        selector: '.feat-header, .feat-bento, .feat-grid, .feat-stats',
        stagger: 0.1,
    })

    return (
        <SectionLayout spacing="base" background="gradient-top">
            <div ref={revealRef}>
                <div className={`feat-header ${SECTION_LAYOUT.headerCenter}`}>
                    <Badge variant="outline" className="mb-4">
                        Features
                    </Badge>
                    <h2 className={`mb-4 ${SECTION_HEADING.h2}`}>
                        Everything You Need
                    </h2>
                    <p className={SECTION_BODY.subtitleCentered}>
                        A complete framework for building, deploying, and
                        monitoring AI agent applications at scale.
                    </p>
                </div>

                {/* Main feature grid (Bento) */}
                <BentoGrid className="feat-bento mb-24">
                    {FEATURES.map((feature, i) => (
                        <BentoGridItem
                            key={i}
                            title={feature.title}
                            description={feature.description}
                            header={feature.header}
                            icon={feature.icon}
                            className={feature.className}
                        />
                    ))}
                </BentoGrid>

                {/* Additional features */}
                <div className="feat-grid @container grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                    {ADDITIONAL_FEATURES.map((feature) => (
                        <div
                            key={feature.title}
                            className="group rounded-xl border border-border bg-card p-6 shadow-sm transition-all duration-300 hover:border-primary/20 hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-1"
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
                <div className="feat-stats mt-24 rounded-2xl border border-border/50 bg-muted/20 p-8 backdrop-blur-sm">
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
                                <div className="mt-1 text-sm text-muted-foreground">
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
