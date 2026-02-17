'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Input } from '@/ui/input'
import { Badge } from '@/ui/badge'
import { Button } from '@/ui/button'
import { PublicPageHero } from '@/app/components/primitives/public-page-hero'
import { AnimatedHelixDna } from '@/app/components/gsap/svg-suite'
import { useWorkflows } from '@/lib/hooks/use-mastra'
import type { Workflow as WorkflowType } from '@/lib/types/mastra-api'
import {
    SearchIcon,
    PlayIcon,
    ArrowRightIcon,
    GitBranchIcon,
    ClockIcon,
    TrendingUpIcon,
    UsersIcon,
    AlertCircleIcon,
} from 'lucide-react'

type WorkflowCard = {
    id: string
    name: string
    description: string
    category: string
    steps: number
}

function classifyWorkflowCategory(id: string): string {
    const normalized = id.toLowerCase()
    if (/(content|copy|blog|email)/.test(normalized)) {
        return 'Content'
    }
    if (/(data|etl|pipeline|document)/.test(normalized)) {
        return 'Data'
    }
    if (/(research|analysis|report)/.test(normalized)) {
        return 'Research'
    }
    if (/(finance|stock|market)/.test(normalized)) {
        return 'Financial'
    }
    if (/(api|integration|sync)/.test(normalized)) {
        return 'Integration'
    }
    return 'General'
}

function workflowStepsCount(workflow: WorkflowType): number {
    if (Array.isArray(workflow.steps)) {
        return workflow.steps.length
    }
    if (workflow.steps) {
        return Object.keys(workflow.steps).length
    }
    return 0
}

export function WorkflowsList() {
    const { data, loading, error } = useWorkflows()
    const [search, setSearch] = useState('')
    const [selectedCategory, setSelectedCategory] = useState('All')

    const workflows: WorkflowCard[] = (data ?? []).map(
        (workflow: WorkflowType) => ({
            id: workflow.id,
            name: workflow.name ?? workflow.id,
            description:
                workflow.description ?? 'Workflow available from backend.',
            category: classifyWorkflowCategory(workflow.id),
            steps: workflowStepsCount(workflow),
        })
    )

    const categories = [
        'All',
        ...Array.from(new Set(workflows.map((workflow) => workflow.category))).sort(),
    ]

    const filteredWorkflows = workflows.filter((workflow) => {
        const matchesSearch =
            workflow.name.toLowerCase().includes(search.toLowerCase()) ||
            workflow.description.toLowerCase().includes(search.toLowerCase())
        const matchesCategory =
            selectedCategory === 'All' || workflow.category === selectedCategory
        return matchesSearch && matchesCategory
    })

    return (
        <section className="container mx-auto px-4 py-24">
            <div className="mb-16">
                <PublicPageHero
                    badge={`${workflows.length} Workflow Templates`}
                    title="Workflows"
                    description="Pre-built workflow templates for common AI automation tasks. Customize and deploy in minutes."
                    accent={AnimatedHelixDna}
                    accentCaption="Composable execution and evolution chains"
                />
            </div>

            <div className="mx-auto mb-12 max-w-4xl space-y-6">
                <div className="relative">
                    <SearchIcon className="absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        placeholder="Search workflows..."
                        className="h-14 pl-12 text-lg"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>

                <div className="flex flex-wrap justify-center gap-2">
                    {categories.map((category) => (
                        <Badge
                            key={category}
                            variant={
                                selectedCategory === category
                                    ? 'default'
                                    : 'outline'
                            }
                            className="cursor-pointer px-4 py-2 text-sm transition-all hover:scale-105"
                            onClick={() => setSelectedCategory(category)}
                        >
                            {category}
                        </Badge>
                    ))}
                </div>
            </div>

            <div className="@container grid gap-6 @md:grid-cols-2 @lg:grid-cols-3">
                {filteredWorkflows.map((workflow, index) => (
                    <motion.div
                        key={workflow.id}
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: index * 0.05 }}
                        viewport={{ once: true }}
                    >
                        <div className="card-3d group flex h-full flex-col rounded-2xl border border-border bg-card p-6 transition-all duration-300 ease-spring hover:border-primary/50 hover:shadow-lg hover:-translate-y-1">
                            <div className="mb-4 flex items-start justify-between">
                                <div className="flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-all duration-200 ease-spring group-hover:bg-primary group-hover:text-primary-foreground group-hover:scale-105">
                                    <TrendingUpIcon className="size-6" />
                                </div>
                                <div className="flex items-center gap-2">
                                    <Badge
                                        variant="secondary"
                                        className="text-xs"
                                    >
                                        {workflow.category}
                                    </Badge>
                                    <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                                        active
                                    </span>
                                </div>
                            </div>

                            <h3 className="mb-2 text-xl font-bold text-foreground group-hover:text-primary transition-colors">
                                {workflow.name}
                            </h3>
                            <p className="mb-4 flex-1 text-sm text-muted-foreground leading-relaxed">
                                {workflow.description}
                            </p>

                            <div className="mb-4 flex flex-wrap gap-2">
                                <Badge variant="outline" className="text-xs">
                                    backend
                                </Badge>
                                <Badge variant="outline" className="text-xs">
                                    typed
                                </Badge>
                            </div>

                            <div className="mb-6 grid grid-cols-3 gap-4 border-t border-border pt-4">
                                <div className="text-center">
                                    <div className="flex items-center justify-center gap-1 text-muted-foreground">
                                        <GitBranchIcon className="size-4" />
                                    </div>
                                    <div className="mt-1 text-sm font-semibold text-foreground">
                                        {workflow.steps}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                        Steps
                                    </div>
                                </div>
                                <div className="text-center">
                                    <div className="flex items-center justify-center gap-1 text-muted-foreground">
                                        <ClockIcon className="size-4" />
                                    </div>
                                    <div className="mt-1 text-sm font-semibold text-foreground">
                                        {'n/a'}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                        Duration
                                    </div>
                                </div>
                                <div className="text-center">
                                    <div className="flex items-center justify-center gap-1 text-muted-foreground">
                                        <UsersIcon className="size-4" />
                                    </div>
                                    <div className="mt-1 text-sm font-semibold text-foreground">
                                        {'n/a'}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                        Agents
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    asChild
                                    className="flex-1"
                                >
                                    <Link
                                        href={{
                                            pathname: '/workflows',
                                            query: { workflow: workflow.id },
                                        }}
                                    >
                                        <PlayIcon className="mr-2 size-4" /> Try
                                        It
                                    </Link>
                                </Button>
                                <Button size="sm" asChild className="flex-1">
                                    <Link
                                        href={{
                                            pathname: `/docs/workflows/${workflow.id}`,
                                        }}
                                    >
                                        Learn More{' '}
                                        <ArrowRightIcon className="ml-2 size-4" />
                                    </Link>
                                </Button>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>

            {Boolean(!loading && !error && filteredWorkflows.length === 0) && (
                <div className="py-24 text-center">
                    <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-muted">
                        <SearchIcon className="size-8 text-muted-foreground" />
                    </div>
                    <h3 className="mb-2 text-xl font-semibold text-foreground">
                        No workflows found
                    </h3>
                    <p className="text-muted-foreground">
                        Try adjusting your search or filter criteria.
                    </p>
                </div>
            )}

            {Boolean(error) && (
                <div className="mx-auto mt-8 max-w-3xl rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
                    <div className="flex items-center gap-2">
                        <AlertCircleIcon className="size-4" />
                        Failed to load workflows from backend: {error?.message}
                    </div>
                </div>
            )}

            <div className="mt-16 rounded-2xl border border-border bg-muted/30 p-8 text-center">
                <h3 className="mb-2 text-2xl font-bold text-foreground">
                    Need a Custom Workflow?
                </h3>
                <p className="mx-auto mb-6 max-w-xl text-muted-foreground">
                    Our team can help you design and implement custom workflows
                    tailored to your specific business needs.
                </p>
                <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
                    <Button size="lg" asChild>
                        <Link href={{ pathname: '/contact' }}>Contact Us</Link>
                    </Button>
                    <Button variant="outline" size="lg" asChild>
                        <Link href={{ pathname: '/docs/workflows/custom' }}>
                            Build Your Own
                        </Link>
                    </Button>
                </div>
            </div>
        </section>
    )
}
