'use client'

import { useState, useEffect, useRef } from 'react'
import { useGSAP } from '@gsap/react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { motion, useInView } from 'framer-motion'
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
    SECTION_HEADING,
    SECTION_LAYOUT,
    SECTION_BODY,
} from '@/app/components/primitives'
import { Badge } from '@/ui/badge'
import { AnimatedPacketBurst } from '@/app/components/gsap/svg-suite'
import React from 'react'

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
    const sectionRef = useRef<HTMLDivElement>(null)
    const lineRef = useRef<HTMLDivElement>(null)

    const revealRef = useSectionReveal<HTMLDivElement>({
        selector: '.stat-header, .stat-bar, .stat-footer',
        stagger: 0.06,
    })

    useGSAP(
        () => {
            if (!sectionRef.current) { return }
            gsap.registerPlugin(ScrollTrigger)

            // Individual stat cards cascade in with 3D tilt
            const cards = sectionRef.current.querySelectorAll('.stat-card-item')
            if (cards.length > 0) {
                gsap.fromTo(
                    cards,
                    { opacity: 0, y: 40, rotateY: -8, scale: 0.95 },
                    {
                        opacity: 1,
                        y: 0,
                        rotateY: 0,
                        scale: 1,
                        duration: 0.6,
                        stagger: 0.12,
                        ease: 'power3.out',
                        scrollTrigger: {
                            trigger: sectionRef.current.querySelector('.stat-card-grid'),
                            start: 'top 80%',
                            once: true,
                        },
                    }
                )
            }

            // Animated divider line that draws across on scroll
            if (lineRef.current) {
                gsap.fromTo(
                    lineRef.current,
                    { scaleX: 0, transformOrigin: 'left center' },
                    {
                        scaleX: 1,
                        duration: 1.2,
                        ease: 'power2.inOut',
                        scrollTrigger: {
                            trigger: lineRef.current,
                            start: 'top 85%',
                            once: true,
                        },
                    }
                )
            }
        },
        { scope: sectionRef }
    )

    return (
        <SectionLayout spacing="base" background="grid" borderBottom>
            <div ref={sectionRef}>
                <div className={`stat-header ${SECTION_LAYOUT.headerCenter}`}>
                    <Badge variant="outline" className="mb-4">
                        Platform Metrics
                    </Badge>
                    <div className="mb-5 flex justify-center">
                        <motion.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            whileInView={{ scale: 1, opacity: 1 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5, ease: 'easeOut' }}
                            className="gsap-svg-stage relative flex items-center justify-center rounded-2xl border border-border/60 bg-linear-to-br from-card to-primary/5 p-2"
                        >
                            <AnimatedPacketBurst
                                className="gsap-svg-icon gsap-svg-crisp"
                                size={142}
                                animate
                            />
                        </motion.div>
                    </div>
                    <h2 className={`mb-4 ${SECTION_HEADING.h2}`}>
                        Measurable Performance at Scale
                    </h2>
                    <p className={SECTION_BODY.subtitleCentered}>
                        Real adoption, production usage, and enterprise trust
                        metrics from the AgentStack ecosystem.
                    </p>
                </div>

                {/* Animated drawing line separator */}
                <div
                    ref={lineRef}
                    className="mb-12 h-px origin-left scale-x-0 bg-linear-to-r from-transparent via-primary/40 to-transparent"
                />

                {/* Primary stats */}
                <div ref={revealRef} className="stat-card-grid @container mb-16 grid grid-cols-2 gap-6 @md:grid-cols-4 perspective-1000">
                    {STATS.map((stat) => (
                        <motion.div
                            key={stat.label}
                            whileHover={{
                                rotateY: 8,
                                rotateX: -4,
                                translateZ: 20,
                                scale: 1.03
                            }}
                            transition={{ type: "spring", stiffness: 300, damping: 20 }}
                            className="stat-card-item group relative rounded-2xl border border-border bg-card p-6 text-center shadow-sm transition-all duration-300 hover:border-primary/20 hover:shadow-2xl hover:shadow-primary/10 transform-style-3d glass-morphism"
                            style={{ opacity: 0 }}
                        >
                            <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-xl border border-border bg-background shadow-sm text-foreground transition-all duration-300 group-hover:border-primary/30 group-hover:text-primary group-hover:scale-110">
                                <stat.icon
                                    className="size-6"
                                    strokeWidth={1.5}
                                />
                            </div>

                            <div className="mb-2 text-4xl font-bold tracking-tight text-foreground sm:text-5xl group-hover:text-primary transition-colors">
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

                            {/* Hover glow */}
                            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_100%,oklch(0.6_0.2_265/10%)_0%,transparent_60%)] opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl pointer-events-none" />
                        </motion.div>
                    ))}
                </div>

                {/* Secondary stats bar */}
                <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    whileInView={{ y: 0, opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                    className="stat-bar rounded-2xl border border-border bg-card/30 p-6 backdrop-blur-sm glass-ultra"
                >
                    <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
                        {SECONDARY_STATS.map((stat) => (
                            <div
                                key={stat.label}
                                className="flex items-center justify-center gap-4 text-center transition-all duration-200 ease-smooth hover:scale-105 md:justify-start group"
                            >
                                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground transition-colors duration-200 group-hover:bg-primary/10 group-hover:text-primary group-hover:rotate-6">
                                    <stat.icon className="size-5" />
                                </div>
                                <div className="text-left">
                                    <div className="text-2xl font-bold text-foreground group-hover:text-primary transition-colors">
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
                </motion.div>

                <p className={`stat-footer mt-8 text-center ${SECTION_BODY.body}`}>
                    Join thousands of developers building the future of AI
                    applications
                </p>
            </div>
        </SectionLayout>
    )
}
