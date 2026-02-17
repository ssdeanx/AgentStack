'use client'

import Link from 'next/link'
import { Button } from '@/ui/button'
import {
    ArrowRightIcon,
    GithubIcon,
    SparklesIcon,
    RocketIcon,
    ZapIcon,
    CheckCircleIcon,
} from 'lucide-react'
import {
    SectionLayout,
    useSectionReveal,
    SECTION_HEADING,
    SECTION_BODY,
} from '@/app/components/primitives'
import { AnimatedTokenStream } from '@/app/components/gsap/svg-suite'

const CTA_FEATURES = [
    'Free to start',
    'Open source',
    'Enterprise ready',
    'Active community',
]

const QUICK_LINKS = [
    {
        title: 'Quick Start Guide',
        description: 'Get up and running in 5 minutes',
        href: '/docs/getting-started',
        icon: RocketIcon,
    },
    {
        title: 'API Reference',
        description: 'Complete API documentation',
        href: '/api-reference',
        icon: ZapIcon,
    },
    {
        title: 'Examples',
        description: 'Browse code samples',
        href: '/examples',
        icon: SparklesIcon,
    },
]

export function LandingCTA() {
    const revealRef = useSectionReveal<HTMLDivElement>({
        selector:
            '.cta-badge, .cta-heading, .cta-desc, .cta-visual, .cta-buttons, .cta-features, .cta-links, .cta-terminal',
        stagger: 0.1,
        yOffset: 20,
    })

    return (
        <SectionLayout spacing="base" background="gradient-bottom" borderTop>
            <div ref={revealRef}>
                {/* Main CTA */}
                <div className="mx-auto max-w-4xl text-center">
                    {/* Badge */}
                    <div className="cta-badge mb-8 inline-flex items-center gap-2 rounded-full border border-border bg-muted/50 px-4 py-1.5 text-sm backdrop-blur-sm">
                        <SparklesIcon className="size-4 text-foreground" />
                        <span className="font-medium text-foreground">
                            Start building in minutes
                        </span>
                    </div>

                    {/* Heading */}
                    <h2
                        className={`cta-heading mb-6 ${SECTION_HEADING.pageTitle}`}
                    >
                        Ready to Build{' '}
                        <span className="text-muted-foreground">
                            Something Amazing?
                        </span>
                    </h2>

                    {/* Description */}
                    <p
                        className={`cta-desc mx-auto mb-10 max-w-2xl ${SECTION_BODY.subtitleCentered} lg:text-xl`}
                    >
                        Join thousands of developers building the next
                        generation of AI applications with AgentStack. Open
                        source, enterprise-ready, and backed by an amazing
                        community.
                    </p>

                    <div className="cta-visual mb-10 flex justify-center">
                        <div className="gsap-svg-stage relative flex items-center justify-center rounded-3xl border border-border/60 bg-linear-to-br from-card via-card to-primary/5 p-3">
                            <AnimatedTokenStream
                                className="gsap-svg-icon gsap-svg-crisp"
                                size={160}
                                animate
                            />
                        </div>
                    </div>

                    {/* CTA Buttons */}
                    <div className="cta-buttons flex flex-col items-center justify-center gap-4 sm:flex-row">
                        <Button
                            size="lg"
                            asChild
                            className="group h-14 min-w-50 bg-foreground text-background px-8 text-base transition-all duration-300 ease-spring hover:bg-foreground/90 hover:-translate-y-0.5"
                        >
                            <Link href="/chat">
                                <RocketIcon className="mr-2 size-5" />
                                Launch Chat
                                <ArrowRightIcon className="ml-2 size-4 transition-transform duration-200 ease-spring group-hover:translate-x-1" />
                            </Link>
                        </Button>
                        <Button
                            size="lg"
                            variant="outline"
                            asChild
                            className="group h-14 min-w-50 border px-8 text-base backdrop-blur-sm transition-all duration-300 ease-spring hover:-translate-y-0.5 hover:bg-muted"
                        >
                            <Link
                                href="https://github.com/ssdeanx/agentstack"
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                <GithubIcon className="mr-2 size-5" />
                                Star on GitHub
                            </Link>
                        </Button>
                    </div>

                    {/* Feature badges */}
                    <div className="cta-features mt-10 flex flex-wrap items-center justify-center gap-6">
                        {CTA_FEATURES.map((feature) => (
                            <div
                                key={feature}
                                className="flex items-center gap-2 text-sm text-muted-foreground"
                            >
                                <CheckCircleIcon className="size-4 text-green-500" />
                                <span>{feature}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Quick links */}
                <div className="cta-links mx-auto mt-20 max-w-4xl">
                    <div className="@container grid gap-4 @md:grid-cols-3">
                        {QUICK_LINKS.map((link) => (
                            <Link
                                key={link.title}
                                href={link.href}
                                className="card-3d group flex h-full flex-col rounded-2xl border border-border bg-card/50 p-6 backdrop-blur-sm transition-all duration-300 ease-spring hover:border-primary/50 hover:bg-card hover:shadow-lg hover:-translate-y-1"
                            >
                                <div className="mb-4 flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-all duration-300 ease-spring group-hover:bg-primary group-hover:text-primary-foreground group-hover:scale-110">
                                    <link.icon className="size-6" />
                                </div>
                                <h3 className="mb-1 font-semibold text-foreground group-hover:text-primary transition-colors duration-200">
                                    {link.title}
                                </h3>
                                <p className="text-sm text-muted-foreground">
                                    {link.description}
                                </p>
                                <div className="mt-4 flex items-center text-sm font-medium text-primary opacity-0 transition-all duration-200 ease-spring group-hover:opacity-100 group-hover:translate-x-1">
                                    Learn more
                                    <ArrowRightIcon className="ml-1 size-4 transition-transform group-hover:translate-x-1" />
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>

                {/* Terminal/Code preview */}
                <div className="cta-terminal mx-auto mt-16 max-w-2xl">
                    <div className="overflow-hidden rounded-2xl border border-border bg-zinc-950 shadow-2xl">
                        {/* Terminal header */}
                        <div className="flex items-center gap-2 border-b border-zinc-800 bg-zinc-900 px-4 py-3">
                            <div className="flex gap-1.5">
                                <div className="size-3 rounded-full bg-red-500" />
                                <div className="size-3 rounded-full bg-yellow-500" />
                                <div className="size-3 rounded-full bg-green-500" />
                            </div>
                            <span className="ml-2 text-sm text-zinc-400">
                                terminal
                            </span>
                        </div>

                        {/* Terminal content */}
                        <div className="p-6 font-mono text-sm">
                            <div className="flex items-center gap-2">
                                <span className="text-green-400">$</span>
                                <span className="text-zinc-300">
                                    npx create-mastra@latest
                                </span>
                            </div>
                            <div className="mt-3 text-zinc-500">
                                <span className="text-blue-400">✔</span>{' '}
                                Creating your AgentStack project...
                            </div>
                            <div className="mt-1 text-zinc-500">
                                <span className="text-blue-400">✔</span>{' '}
                                Installing dependencies...
                            </div>
                            <div className="mt-1 text-zinc-500">
                                <span className="text-blue-400">✔</span> Setting
                                up agents and tools...
                            </div>
                            <div className="mt-3 flex items-center gap-2">
                                <span className="text-green-400">$</span>
                                <span className="text-zinc-300">
                                    npm run dev
                                </span>
                            </div>
                            <div className="mt-3 text-green-400">
                                ✨ Your AI agents are ready at{' '}
                                <span className="underline">
                                    http://localhost:3000
                                </span>
                            </div>
                        </div>
                    </div>
                    <p className="mt-4 text-center text-sm text-muted-foreground">
                        Get started with a single command. No configuration
                        required.
                    </p>
                </div>
            </div>
        </SectionLayout>
    )
}
