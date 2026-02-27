'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Badge } from '@/ui/badge'
import { Input } from '@/ui/input'
import { PublicPageHero } from '@/app/components/primitives/public-page-hero'
import { AnimatedRadarScan } from '@/app/components/gsap/svg-suite'
import { useAgents } from '@/lib/hooks/use-mastra-query'
import type { Agent } from '@/lib/hooks/use-mastra-query'
import {
    SearchIcon,
    NetworkIcon,
    UsersIcon,
    ZapIcon,
    ArrowRightIcon,
    AlertCircleIcon,
} from 'lucide-react'

interface NetworkCard {
    id: string
    name: string
    description: string
    category: string
    icon: typeof NetworkIcon
}

function classifyNetworkCategory(id: string): string {
    const normalized = id.toLowerCase()
    if (normalized.includes('data')) {
        return 'Data'
    }
    if (normalized.includes('report') || normalized.includes('content')) {
        return 'Content'
    }
    if (normalized.includes('research')) {
        return 'Research'
    }
    return 'Core'
}

function selectNetworkIcon(id: string): typeof NetworkIcon {
    const normalized = id.toLowerCase()
    if (normalized.includes('data')) {
        return ZapIcon
    }
    if (normalized.includes('report') || normalized.includes('content')) {
        return UsersIcon
    }
    return NetworkIcon
}

export function NetworksList() {
    const { data, loading, error } = useAgents()
    const [search, setSearch] = useState('')

    const networks: NetworkCard[] = (data ?? [])
        .filter((agent: Agent) => agent.id.toLowerCase().includes('network'))
        .map((network: Agent) => ({
            id: network.id,
            name: network.name ?? network.id,
            description:
                network.description ??
                'Network orchestrator available from backend.',
            category: classifyNetworkCategory(network.id),
            icon: selectNetworkIcon(network.id),
        }))

    const filteredNetworks = networks.filter(
        (network) =>
            network.name.toLowerCase().includes(search.toLowerCase()) ||
            network.description.toLowerCase().includes(search.toLowerCase()) ||
            network.category.toLowerCase().includes(search.toLowerCase())
    )

    return (
        <section className="container mx-auto px-4 py-24">
            <div className="mb-16">
                <PublicPageHero
                    badge={`${networks.length} Network Configurations`}
                    title="Agent Networks"
                    description="Pre-configured networks for orchestrating multiple agents in complex workflows."
                    accent={AnimatedRadarScan}
                    accentCaption="Discovery sweeps across agent topology"
                />
            </div>

            <div className="mx-auto mb-12 max-w-xl">
                <div className="relative">
                    <SearchIcon className="absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        placeholder="Search networks..."
                        className="h-12 pl-12 text-base"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                {filteredNetworks.map((network, index) => (
                    <motion.div
                        key={network.id}
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: index * 0.1 }}
                        viewport={{ once: true }}
                    >
                        <Link
                            href={`/networks/${network.id}`}
                            className="card-3d group flex h-full flex-col rounded-2xl border border-border bg-card p-8 transition-all duration-300 ease-spring hover:border-primary/50 hover:shadow-lg hover:-translate-y-1"
                        >
                            <div className="mb-6 flex items-start justify-between">
                                <div className="flex size-14 items-center justify-center rounded-xl bg-primary/10 text-primary transition-all duration-200 ease-spring group-hover:bg-primary group-hover:text-primary-foreground group-hover:scale-105">
                                    <network.icon className="size-7" />
                                </div>
                                <Badge variant="secondary">
                                    {network.category}
                                </Badge>
                            </div>

                            <h2 className="mb-2 text-2xl font-bold text-foreground group-hover:text-primary transition-colors">
                                {network.name}
                            </h2>
                            <p className="mb-6 flex-1 text-muted-foreground leading-relaxed">
                                {network.description}
                            </p>

                            <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">
                                    backend managed
                                </span>
                                <span className="inline-flex items-center text-sm font-medium text-primary">
                                    Explore{' '}
                                    <ArrowRightIcon className="ml-1 size-4 transition-transform duration-200 ease-spring group-hover:translate-x-1" />
                                </span>
                            </div>
                        </Link>
                    </motion.div>
                ))}
            </div>

            {Boolean(!loading && !error && filteredNetworks.length === 0) && (
                <div className="mt-8 text-center text-sm text-muted-foreground">
                    No networks found.
                </div>
            )}

            {Boolean(error) && (
                <div className="mx-auto mt-8 max-w-3xl rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
                    <div className="flex items-center gap-2">
                        <AlertCircleIcon className="size-4" />
                        Failed to load networks from backend: {error?.message}
                    </div>
                </div>
            )}
        </section>
    )
}
