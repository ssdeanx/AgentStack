'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Input } from '@/ui/input'
import {
    SearchIcon,
    CopyIcon,
    CheckIcon,
} from 'lucide-react'
import { Button } from '@/ui/button'
import { SectionLayout } from '@/app/components/primitives/section-layout'
import { useSectionReveal } from '@/app/components/primitives/use-section-reveal'
import { PublicPageHero } from '@/app/components/primitives/public-page-hero'
import { AnimatedNeuralMesh } from '@/app/components/gsap/svg-suite'

const API_SECTIONS = [
    {
        category: 'Agents',
        endpoints: [
            {
                method: 'POST',
                path: '/api/agents/create',
                description: 'Create a new agent',
            },
            {
                method: 'GET',
                path: '/api/agents/:id',
                description: 'Get agent by ID',
            },
            {
                method: 'POST',
                path: '/api/agents/:id/run',
                description: 'Run an agent task',
            },
            {
                method: 'DELETE',
                path: '/api/agents/:id',
                description: 'Delete an agent',
            },
        ],
    },
    {
        category: 'Tools',
        endpoints: [
            {
                method: 'GET',
                path: '/api/tools',
                description: 'List all available tools',
            },
            {
                method: 'POST',
                path: '/api/tools/:id/execute',
                description: 'Execute a tool',
            },
        ],
    },
    {
        category: 'Workflows',
        endpoints: [
            {
                method: 'POST',
                path: '/api/workflows/create',
                description: 'Create a workflow',
            },
            {
                method: 'POST',
                path: '/api/workflows/:id/run',
                description: 'Run a workflow',
            },
            {
                method: 'GET',
                path: '/api/workflows/:id/status',
                description: 'Get workflow status',
            },
        ],
    },
]

const METHOD_COLORS = {
    GET: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    POST: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    PUT: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    DELETE: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
}

export function ApiReferenceContent() {
    const [search, setSearch] = useState('')
    const [copied, setCopied] = useState<string | null>(null)
    const sectionRef = useSectionReveal<HTMLDivElement>({
        selector: '[data-reveal]',
    })

    const copyToClipboard = (text: string) => {
        void navigator.clipboard.writeText(text)
        setCopied(text)
        setTimeout(() => setCopied(null), 2000)
    }

    const filteredSections = useMemo(() => {
        const query = search.trim().toLowerCase()

        if (!query) {
            return API_SECTIONS
        }

        return API_SECTIONS.map((section) => {
            const categoryMatch = section.category.toLowerCase().includes(query)
            const endpoints = section.endpoints.filter((endpoint) => {
                return (
                    endpoint.method.toLowerCase().includes(query) ||
                    endpoint.path.toLowerCase().includes(query) ||
                    endpoint.description.toLowerCase().includes(query)
                )
            })

            if (categoryMatch && endpoints.length === 0) {
                return section
            }

            return { ...section, endpoints }
        }).filter((section) => section.endpoints.length > 0)
    }, [search])

    return (
        <SectionLayout spacing="base" container="default" background="grid">
            <div ref={sectionRef}>
                <div data-reveal>
                    <PublicPageHero
                        title="API Reference"
                        description="Complete API documentation for integrating AgentStack into your applications."
                        badge="Developer Docs"
                        accent={AnimatedNeuralMesh}
                        accentCaption="Graph-aware endpoint topology"
                    />
                </div>

                <div data-reveal className="mx-auto mb-12 max-w-xl">
                    <div className="relative">
                        <SearchIcon className="absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            aria-label="Search API endpoints"
                            placeholder="Search API endpoints..."
                            className="h-12 pl-12 text-base"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>

                    {/* Quick Links — Agents / Tools / Workflows */}
                    <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
                        <Link
                            href={{ pathname: '/api-reference/agents' }}
                            className="group block rounded-2xl border border-border bg-card p-4 transition-all hover:border-primary/50 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
                        >
                            <h3 className="mb-1 text-sm font-semibold text-foreground">
                                Agents
                            </h3>
                            <p className="text-sm text-muted-foreground">
                                See agent endpoints, streaming, and agent tool call
                                docs
                            </p>
                        </Link>

                        <Link
                            href={{ pathname: '/api-reference/tools' }}
                            className="group block rounded-2xl border border-border bg-card p-4 transition-all hover:border-primary/50 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
                        >
                            <h3 className="mb-1 text-sm font-semibold text-foreground">
                                Tools
                            </h3>
                            <p className="text-sm text-muted-foreground">
                                Tool execution endpoints and sample integrations
                            </p>
                        </Link>

                        <Link
                            href={{ pathname: '/api-reference/workflows' }}
                            className="group block rounded-2xl border border-border bg-card p-4 transition-all hover:border-primary/50 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
                        >
                            <h3 className="mb-1 text-sm font-semibold text-foreground">
                                Workflows
                            </h3>
                            <p className="text-sm text-muted-foreground">
                                Workflow run creation, streaming, and management
                            </p>
                        </Link>
                    </div>
                </div>

                <div data-reveal className="mx-auto max-w-4xl space-y-8">
                    {filteredSections.length > 0 ? (
                        filteredSections.map((section) => (
                            <article
                                key={section.category}
                                className="overflow-hidden rounded-2xl border border-border bg-card"
                            >
                                <div className="border-b border-border bg-muted/30 px-6 py-4">
                                    <h2 className="text-xl font-bold text-foreground">
                                        {section.category}
                                    </h2>
                                </div>
                                <div className="divide-y divide-border">
                                    {section.endpoints.map((endpoint) => (
                                        <div
                                            key={endpoint.path}
                                            className="flex items-center justify-between gap-4 px-6 py-4 transition-colors hover:bg-muted/30"
                                        >
                                            <div className="flex items-center gap-4">
                                                <span
                                                    className={`rounded px-2 py-1 text-xs font-bold ${METHOD_COLORS[endpoint.method as keyof typeof METHOD_COLORS]}`}
                                                >
                                                    {endpoint.method}
                                                </span>
                                                <code className="text-sm text-foreground">
                                                    {endpoint.path}
                                                </code>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <span className="hidden text-sm text-muted-foreground sm:block">
                                                    {endpoint.description}
                                                </span>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    aria-label={`Copy endpoint path ${endpoint.path}`}
                                                    onClick={() =>
                                                        copyToClipboard(
                                                            endpoint.path
                                                        )
                                                    }
                                                >
                                                    {copied === endpoint.path ? (
                                                        <CheckIcon className="size-4 text-green-500" />
                                                    ) : (
                                                        <CopyIcon className="size-4" />
                                                    )}
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </article>
                        ))
                    ) : (
                        <div className="rounded-2xl border border-dashed border-border bg-card/60 p-8 text-center">
                            <p className="text-sm text-muted-foreground">
                                No API endpoints match <strong>{search}</strong>.
                                Try searching for method, path, or category.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </SectionLayout>
    )
}
