'use client'

import { SectionLayout } from '@/app/components/primitives/section-layout'
import { useSectionReveal } from '@/app/components/primitives/use-section-reveal'
import { PublicPageHero } from '@/app/components/primitives/public-page-hero'
import {
    SECTION_BODY,
    SECTION_HEADING,
} from '@/app/components/primitives/typography'
import { AnimatedPrismOrbit } from '@/app/components/gsap/svg-suite'

const VALUES = [
    {
        title: 'Innovation',
        description:
            "We push the boundaries of what's possible with AI agents.",
    },
    {
        title: 'Reliability',
        description:
            'We build systems that you can trust in production environments.',
    },
    {
        title: 'Transparency',
        description: 'We believe in open source and clear communication.',
    },
    {
        title: 'Community',
        description: 'We grow together with our users and contributors.',
    },
]

export function AboutContent() {
    const sectionRef = useSectionReveal<HTMLDivElement>({
        selector: '[data-reveal]',
    })

    return (
        <SectionLayout spacing="base" container="default" background="grid">
            <div ref={sectionRef} className="mx-auto max-w-4xl">
                <div data-reveal>
                    <PublicPageHero
                        title="About AgentStack"
                        description="AgentStack is a production-grade multi-agent framework designed to help developers build, deploy, and manage AI applications at scale."
                        badge="Our Story"
                        accent={AnimatedPrismOrbit}
                    />
                </div>

                <div data-reveal className="mb-24 grid gap-12 md:grid-cols-2">
                    <div className="rounded-xl border border-border/50 bg-card/50 p-6">
                        <h2 className={`mb-4 ${SECTION_HEADING.h2Compact}`}>
                            Our Mission
                        </h2>
                        <p className={SECTION_BODY.subtitle}>
                            To democratize access to advanced AI agent
                            technologies and empower developers to create
                            intelligent systems that solve real-world problems.
                            We believe that the future of software is agentic,
                            and we're building the infrastructure to make that
                            future a reality.
                        </p>
                    </div>
                    <div className="rounded-xl border border-border/50 bg-card/50 p-6">
                        <h2 className={`mb-4 ${SECTION_HEADING.h2Compact}`}>
                            The Team
                        </h2>
                        <p className={SECTION_BODY.subtitle}>
                            We are a team of passionate engineers, researchers,
                            and designers dedicated to pushing the boundaries of
                            what's possible with AI. With backgrounds in
                            distributed systems, machine learning, and developer
                            tools, we understand the challenges of building
                            production AI apps.
                        </p>
                    </div>
                </div>

                <div data-reveal>
                    <h2 className={`mb-12 text-center ${SECTION_HEADING.h2}`}>
                        Our Values
                    </h2>
                    <div className="grid gap-8 sm:grid-cols-2">
                        {VALUES.map((value) => (
                            <article
                                key={value.title}
                                className="rounded-xl border border-border bg-card p-6"
                            >
                                <h3 className="mb-2 text-xl font-semibold text-foreground">
                                    {value.title}
                                </h3>
                                <p className="text-muted-foreground">
                                    {value.description}
                                </p>
                            </article>
                        ))}
                    </div>
                </div>
            </div>
        </SectionLayout>
    )
}
