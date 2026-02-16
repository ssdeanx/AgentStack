'use client'

import { Badge } from '@/ui/badge'
import { SparklesIcon, BugIcon, WrenchIcon, ZapIcon } from 'lucide-react'
import { SectionLayout } from '@/app/components/primitives/section-layout'
import { useSectionReveal } from '@/app/components/primitives/use-section-reveal'
import { PublicPageHero } from '@/app/components/primitives/public-page-hero'
import { AnimatedDataStream } from '@/app/components/gsap/svg-suite'

const CHANGELOG_ENTRIES = [
    {
        version: '1.0.6',
        date: '2025-11-28',
        type: 'release',
        changes: [
            {
                type: 'feature',
                text: 'Added AI SDK v5 support with React 19 compatibility',
            },
            {
                type: 'feature',
                text: 'New agent orchestration patterns for complex workflows',
            },
            {
                type: 'improvement',
                text: 'Enhanced RAG pipeline performance by 40%',
            },
            {
                type: 'fix',
                text: 'Fixed memory leak in long-running agent sessions',
            },
        ],
    },
    {
        version: '1.0.5',
        date: '2025-11-20',
        type: 'release',
        changes: [
            {
                type: 'feature',
                text: 'Introduced 5 new financial analysis tools',
            },
            {
                type: 'improvement',
                text: 'Improved observability with Arize integration',
            },
            {
                type: 'fix',
                text: 'Resolved agent timeout issues in production',
            },
        ],
    },
    {
        version: '1.0.4',
        date: '2025-11-15',
        type: 'release',
        changes: [
            {
                type: 'feature',
                text: 'Added PgVector support for embeddings storage',
            },
            { type: 'feature', text: 'New document processing capabilities' },
            {
                type: 'improvement',
                text: 'Better error handling across all agents',
            },
        ],
    },
]

const CHANGE_ICONS = {
    feature: SparklesIcon,
    fix: BugIcon,
    improvement: WrenchIcon,
    breaking: ZapIcon,
}

const CHANGE_COLORS = {
    feature: 'text-green-500',
    fix: 'text-red-500',
    improvement: 'text-blue-500',
    breaking: 'text-yellow-500',
}

export function ChangelogList() {
    const sectionRef = useSectionReveal<HTMLDivElement>({
        selector: '[data-reveal]',
    })

    return (
        <SectionLayout spacing="base" container="default" background="grid">
            <div ref={sectionRef}>
                <div data-reveal>
                    <PublicPageHero
                        title="Changelog"
                        description="Track the latest changes and improvements to AgentStack."
                        badge="Releases"
                        accent={AnimatedDataStream}
                    />
                </div>

                <div data-reveal className="mx-auto max-w-3xl">
                    <div className="relative border-l-2 border-border pl-8">
                        {CHANGELOG_ENTRIES.length > 0 ? (
                            CHANGELOG_ENTRIES.map((entry) => (
                            <article
                            key={entry.version}
                            className="relative mb-12 last:mb-0"
                            >
                                <div className="absolute -left-10.25 flex size-5 items-center justify-center rounded-full border-2 border-primary bg-background">
                                    <div className="size-2 rounded-full bg-primary" />
                                </div>

                                <div className="mb-4 flex flex-wrap items-center gap-3">
                                    <Badge
                                        variant="default"
                                        className="text-sm font-semibold"
                                    >
                                        v{entry.version}
                                    </Badge>
                                    <span className="text-sm text-muted-foreground">
                                        {new Date(entry.date).toLocaleDateString(
                                            'en-US',
                                            {
                                                month: 'long',
                                                day: 'numeric',
                                                year: 'numeric',
                                            }
                                        )}
                                    </span>
                                </div>

                                <div className="rounded-xl border border-border bg-card p-6 transition-all duration-300 ease-spring hover:border-primary/30 hover:shadow-md">
                                    <ul className="space-y-4">
                                        {entry.changes.map(
                                            (change, changeIndex) => {
                                                const Icon =
                                                    CHANGE_ICONS[
                                                        change.type as keyof typeof CHANGE_ICONS
                                                    ] ?? SparklesIcon
                                                const colorClass =
                                                    CHANGE_COLORS[
                                                        change.type as keyof typeof CHANGE_COLORS
                                                    ] ?? 'text-primary'
                                                return (
                                                    <li
                                                        key={changeIndex}
                                                        className="group flex items-start gap-3 transition-colors duration-200 hover:text-foreground"
                                                    >
                                                        <Icon
                                                            className={`mt-0.5 size-5 shrink-0 ${colorClass} transition-transform duration-200 group-hover:scale-110`}
                                                        />
                                                        <span className="text-muted-foreground">
                                                            {change.text}
                                                        </span>
                                                    </li>
                                                )
                                            }
                                        )}
                                    </ul>
                                </div>
                            </article>
                            ))
                        ) : (
                            <div className="rounded-2xl border border-dashed border-border bg-card/60 p-8 text-center">
                                <p className="text-sm text-muted-foreground">
                                    No releases found yet.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </SectionLayout>
    )
}
