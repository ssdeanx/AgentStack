'use client'

import { useState, useEffect, useRef } from 'react'
import { useInView } from 'framer-motion'
import {
    BotIcon,
    WrenchIcon,
    GitBranchIcon,
    NetworkIcon,
    UsersIcon,
    StarIcon,
    DownloadIcon,
    BuildingIcon,
} from 'lucide-react'
import {
    SectionLayout,
    useSectionReveal,
    SECTION_BODY,
} from '@/app/components/primitives'

interface StatItem {
    label: string
    value: number
    suffix: string
    icon: React.ComponentType<{ className?: string; strokeWidth?: number }>
    description: string
}

const STATS: StatItem[] = [
    {
        label: 'Specialized Agents',
        value: 22,
        suffix: '+',
        icon: BotIcon,
        description: 'Production-ready AI agents',
    },
    {
        label: 'Enterprise Tools',
        value: 30,
        suffix: '+',
        icon: WrenchIcon,
        description: 'Integrations and utilities',
    },
    {
        label: 'Workflows',
        value: 10,
        suffix: '',
        icon: GitBranchIcon,
        description: 'Pre-built automation templates',
    },
    {
        label: 'Agent Networks',
        value: 4,
        suffix: '',
        icon: NetworkIcon,
        description: 'Multi-agent orchestration',
    },
]

const SECONDARY_STATS = [
    { label: 'Active Developers', value: 10, suffix: 'k+', icon: UsersIcon },
    { label: 'GitHub Stars', value: 2.5, suffix: 'k+', icon: StarIcon },
    { label: 'Weekly Downloads', value: 50, suffix: 'k+', icon: DownloadIcon },
    {
        label: 'Enterprise Clients',
        value: 100,
        suffix: '+',
        icon: BuildingIcon,
    },
]

function AnimatedCounter({
    value,
    suffix,
    duration = 2,
}: {
    value: number
    suffix: string
    duration?: number
}) {
    const [count, setCount] = useState(0)
    const ref = useRef<HTMLSpanElement>(null)
    const isInView = useInView(ref, { once: true, margin: '-100px' })

    useEffect(() => {
        if (!isInView) {
            return
        }

        let startTime: number
        let animationFrame: number

        const animate = (timestamp: number) => {
            if (!startTime) {
                startTime = timestamp
            }
            const progress = Math.min(
                (timestamp - startTime) / (duration * 1000),
                1
            )

            const easeOutQuart = 1 - Math.pow(1 - progress, 4)
            setCount(Math.floor(easeOutQuart * value * 10) / 10)

            if (progress < 1) {
                animationFrame = requestAnimationFrame(animate)
            } else {
                setCount(value)
            }
        }

        animationFrame = requestAnimationFrame(animate)
        return () => cancelAnimationFrame(animationFrame)
    }, [isInView, value, duration])

    return (
        <span ref={ref}>
            {Number.isInteger(value) ? Math.floor(count) : count.toFixed(1)}
            {suffix}
        </span>
    )
}

export function LandingStats() {
    const revealRef = useSectionReveal<HTMLDivElement>({
        selector: '.stat-card, .stat-bar, .stat-footer',
        stagger: 0.06,
    })

    return (
        <SectionLayout spacing="base" background="grid" borderBottom>
            <div ref={revealRef}>
                {/* Primary stats */}
                <div className="stat-card @container mb-16 grid grid-cols-2 gap-6 @md:grid-cols-4">
                    {STATS.map((stat) => (
                        <div
                            key={stat.label}
                            className="group relative rounded-2xl border border-border bg-card p-6 text-center shadow-sm transition-all duration-300 hover:border-primary/20 hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-1"
                        >
                            <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-xl border border-border bg-background shadow-sm text-foreground transition-all duration-300 group-hover:border-primary/30 group-hover:text-primary group-hover:scale-110">
                                <stat.icon
                                    className="size-6"
                                    strokeWidth={1.5}
                                />
                            </div>

                            <div className="mb-2 text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
                                <AnimatedCounter
                                    value={stat.value}
                                    suffix={stat.suffix}
                                />
                            </div>

                            <div className="mb-1 text-sm font-semibold uppercase tracking-wider text-foreground">
                                {stat.label}
                            </div>

                            <div className="text-xs text-muted-foreground">
                                {stat.description}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Secondary stats bar */}
                <div className="stat-bar rounded-2xl border border-border bg-card/30 p-6 backdrop-blur-sm">
                    <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
                        {SECONDARY_STATS.map((stat) => (
                            <div
                                key={stat.label}
                                className="flex items-center justify-center gap-4 text-center transition-all duration-200 ease-smooth hover:scale-105 md:justify-start"
                            >
                                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground transition-colors duration-200 hover:bg-foreground/10 hover:text-foreground">
                                    <stat.icon className="size-5" />
                                </div>
                                <div className="text-left">
                                    <div className="text-2xl font-bold text-foreground">
                                        <AnimatedCounter
                                            value={stat.value}
                                            suffix={stat.suffix}
                                            duration={2.5}
                                        />
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                        {stat.label}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <p className={`stat-footer mt-8 text-center ${SECTION_BODY.body}`}>
                    Join thousands of developers building the future of AI
                    applications
                </p>
            </div>
        </SectionLayout>
    )
}
