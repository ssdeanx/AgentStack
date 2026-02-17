'use client'

import Link from 'next/link'
import type { Route } from 'next'
import { Badge } from '@/ui/badge'
import { CalendarIcon, ClockIcon, ArrowRightIcon } from 'lucide-react'
import { SectionLayout } from '@/app/components/primitives/section-layout'
import { useSectionReveal } from '@/app/components/primitives/use-section-reveal'
import { PublicPageHero } from '@/app/components/primitives/public-page-hero'
import { AnimatedMorphWaves } from '@/app/components/gsap/svg-suite'

import { useMounted } from '@/hooks/use-mounted'
import { BLOG_POSTS } from '@/app/components/blog-data'

export function BlogList() {
    const mounted = useMounted()
    const sectionRef = useSectionReveal<HTMLDivElement>({
        selector: '[data-reveal]',
    })

    return (
        <SectionLayout spacing="base" container="default" background="grid">
            <div ref={sectionRef}>
                <div data-reveal>
                    <PublicPageHero
                        title="Blog"
                        description="Latest updates, tutorials, and insights from the AgentStack team."
                        badge="Insights"
                        accent={AnimatedMorphWaves}
                        accentCaption="State transitions and trend drift"
                    />
                </div>

                <div data-reveal className="mx-auto max-w-4xl space-y-8">
                    {BLOG_POSTS.length > 0 ? (
                        BLOG_POSTS.map((post) => (
                        <article key={post.slug}>
                        <Link
                            href={`/blog/${post.slug}` as Route}
                            className="card-3d group block rounded-2xl border border-border bg-card p-8 transition-all duration-300 ease-spring hover:border-primary/50 hover:shadow-lg hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
                        >
                            <div className="mb-4 flex flex-wrap items-center gap-4">
                                <Badge variant="secondary">
                                    {post.category}
                                </Badge>
                                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                    <span className="flex items-center gap-1">
                                        <CalendarIcon className="size-4" />
                                        {mounted ? new Date(post.date).toLocaleDateString(
                                            'en-US',
                                            {
                                                month: 'short',
                                                day: 'numeric',
                                                year: 'numeric',
                                            }
                                        ) : null}
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <ClockIcon className="size-4" />
                                        {post.readTime}
                                    </span>
                                </div>
                            </div>
                            <h2 className="mb-3 text-2xl font-bold text-foreground group-hover:text-primary transition-colors">
                                {post.title}
                            </h2>
                            <p className="mb-4 text-muted-foreground leading-relaxed">
                                {post.excerpt}
                            </p>
                            <span className="inline-flex items-center text-sm font-medium text-primary">
                                Read more{' '}
                                <ArrowRightIcon className="ml-1 size-4 transition-transform duration-200 ease-spring group-hover:translate-x-1" />
                            </span>
                        </Link>
                        </article>
                        ))
                    ) : (
                        <div className="rounded-2xl border border-dashed border-border bg-card/60 p-8 text-center">
                            <p className="text-sm text-muted-foreground">
                                No blog posts are available right now. Check back soon.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </SectionLayout>
    )
}
