'use client'

import Link from 'next/link'
import type { Route } from 'next'
import type { ReactElement } from 'react'
import { Button } from '@/ui/button'
import { Badge } from '@/ui/badge'
import { SectionLayout } from '@/app/components/primitives/section-layout'
import { useSectionReveal } from '@/app/components/primitives/use-section-reveal'
import { PublicPageHero } from '@/app/components/primitives/public-page-hero'
import {
    SECTION_BODY,
    SECTION_HEADING,
} from '@/app/components/primitives/typography'
import { AnimatedSignalPulse } from '@/app/components/gsap/svg-suite'
import {
    MapPinIcon,
    ClockIcon,
    ArrowRightIcon,
    BriefcaseIcon,
} from 'lucide-react'

const POSITIONS = [
    {
        title: 'Senior Backend Engineer',
        department: 'Engineering',
        location: 'San Francisco / Remote',
        type: 'Full-time',
        description:
            'Build scalable infrastructure for our multi-agent platform.',
    },
    {
        title: 'ML/AI Engineer',
        department: 'AI Research',
        location: 'San Francisco / Remote',
        type: 'Full-time',
        description: 'Develop and optimize AI agent algorithms and models.',
    },
    {
        title: 'Developer Advocate',
        department: 'DevRel',
        location: 'Remote',
        type: 'Full-time',
        description: 'Create content and build community around AgentStack.',
    },
    {
        title: 'Product Designer',
        department: 'Design',
        location: 'San Francisco / Remote',
        type: 'Full-time',
        description: 'Design intuitive experiences for AI development tools.',
    },
]

const BENEFITS = [
    'Competitive salary & equity',
    'Remote-first culture',
    'Unlimited PTO',
    'Health & wellness benefits',
    'Learning & development budget',
    'Latest equipment',
]

export function CareersContent(): ReactElement {
    const sectionRef = useSectionReveal<HTMLDivElement>({
        selector: '[data-reveal]',
    })

    return (
        <SectionLayout spacing="base" container="default" background="grid">
            <div ref={sectionRef}>
                <div data-reveal>
                    <PublicPageHero
                        title="Join Our Team"
                        description="Help us build the future of AI agent development. We're looking for passionate people to join our mission."
                        badge="Careers"
                        accent={AnimatedSignalPulse}
                    />
                </div>

                <div className="mx-auto max-w-4xl">
                    <div data-reveal className="mb-16">
                        <h2 className={`mb-8 ${SECTION_HEADING.h2Compact}`}>
                        Why AgentStack?
                        </h2>
                        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                            {BENEFITS.map((benefit) => (
                                <article
                                    key={benefit}
                                    className="flex items-center gap-3 rounded-lg border border-border bg-card p-4"
                                >
                                    <div className="size-2 rounded-full bg-primary" />
                                    <span className="text-muted-foreground">
                                        {benefit}
                                    </span>
                                </article>
                            ))}
                        </div>
                    </div>

                    <div data-reveal>
                        <h2 className={`mb-8 ${SECTION_HEADING.h2Compact}`}>
                        Open Positions
                        </h2>
                        <p className={`mb-6 ${SECTION_BODY.body}`}>
                            Explore our current roles across engineering,
                            research, design, and developer relations.
                        </p>
                        <div className="space-y-4">
                            {POSITIONS.map((position) => {
                            const slug = position.title
                                .toLowerCase()
                                .replace(/\s+/g, '-')
                            const href = `/careers/${slug}`

                            return (
                                <article key={position.title}>
                                    <Link
                                        href={href as Route}
                                        className="group flex flex-col gap-4 rounded-2xl border border-border bg-card p-6 transition-all hover:border-primary/50 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 sm:flex-row sm:items-center sm:justify-between"
                                    >
                                        <div>
                                            <div className="mb-2 flex flex-wrap items-center gap-2">
                                                <span className="flex items-center gap-2">
                                                    <BriefcaseIcon className="size-4 text-muted-foreground" />
                                                    <Badge variant="secondary">
                                                        {position.department}
                                                    </Badge>
                                                </span>
                                                <span className="flex items-center gap-2">
                                                    <ClockIcon className="size-4 text-muted-foreground" />
                                                    <Badge variant="outline">
                                                        {position.type}
                                                    </Badge>
                                                </span>
                                            </div>
                                            <h3 className="mb-1 text-xl font-bold text-foreground group-hover:text-primary transition-colors">
                                                {position.title}
                                            </h3>
                                            <p className="text-muted-foreground">
                                                {position.description}
                                            </p>
                                            <div className="mt-3 flex items-center gap-4 text-sm text-muted-foreground">
                                                <span className="flex items-center gap-1">
                                                    <MapPinIcon className="size-4" />{' '}
                                                    {position.location}
                                                </span>
                                            </div>
                                        </div>
                                        <Button
                                            variant="outline"
                                            className="shrink-0 gap-2"
                                        >
                                            Apply{' '}
                                            <ArrowRightIcon className="size-4" />
                                        </Button>
                                    </Link>
                                </article>
                            )
                        })}
                    </div>
                </div>
            </div>
            </div>
        </SectionLayout>
    )
}
