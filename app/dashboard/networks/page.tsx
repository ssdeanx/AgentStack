'use client'

import { useMemo, useState } from 'react'
import { useAgentQuery, useAgentsQuery } from '@/lib/hooks/use-dashboard-queries'
import { Input } from '@/ui/input'
import { ScrollArea } from '@/ui/scroll-area'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/ui/card'
import { Button } from '@/ui/button'
import { Badge } from '@/ui/badge'
import { Skeleton } from '@/ui/skeleton'
import { Search, RefreshCw, Network } from 'lucide-react'
import Link from 'next/link'
import type { Route } from 'next'

export default function NetworksPage() {
    const { data: agents, isLoading, error, refetch } = useAgentsQuery()
    const [search, setSearch] = useState('')
    const [selectedId, setSelectedId] = useState<string | null>(null)
    const selectedIdValue = selectedId?.trim() ?? ''
    const hasSelectedId = selectedIdValue.length > 0

    const filtered = useMemo(() => {
        if (!agents) {
            return []
        }

        const networks = agents.filter((agent) =>
            agent.id.toLowerCase().includes('network')
        )

        const q = search.trim().toLowerCase()
        if (!q) {
            return networks
        }

        return networks.filter((network) => {
            return (
                network.id.toLowerCase().includes(q) ||
                (network.name?.toLowerCase().includes(q) ?? false) ||
                (network.description?.toLowerCase().includes(q) ?? false)
            )
        })
    }, [agents, search])

    return (
        <div className="flex h-full">
            <div className="flex w-96 flex-col border-r">
                <div className="border-b p-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold">Networks</h2>
                        <Button variant="ghost" size="icon" onClick={() => void refetch()}>
                            <RefreshCw className="h-4 w-4" />
                        </Button>
                    </div>
                    <div className="mt-3 relative">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            placeholder="Search networks..."
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            className="pl-9"
                        />
                    </div>
                </div>

                <ScrollArea className="flex-1">
                    {isLoading ? (
                        <div className="space-y-2 p-4">
                            {Array.from({ length: 8 }).map((_, index) => (
                                <Skeleton key={index} className="h-16 w-full" />
                            ))}
                        </div>
                    ) : error ? (
                        <div className="p-4 text-sm text-destructive">{error.message}</div>
                    ) : filtered.length === 0 ? (
                        <div className="p-4 text-sm text-muted-foreground">No networks found.</div>
                    ) : (
                        <div className="space-y-1 p-2">
                            {filtered.map((network) => (
                                <button
                                    key={network.id}
                                    onClick={() => setSelectedId(network.id)}
                                    className={`w-full rounded-md p-3 text-left transition-colors hover:bg-accent ${
                                        selectedId === network.id ? 'bg-accent' : ''
                                    }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <Network className="h-5 w-5 text-muted-foreground" />
                                        <div className="min-w-0 flex-1">
                                            <div className="truncate font-medium">
                                                {network.name ?? network.id}
                                            </div>
                                            <div className="truncate text-xs text-muted-foreground">
                                                {network.description ?? 'No description'}
                                            </div>
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </ScrollArea>

                <div className="border-t p-4 text-sm text-muted-foreground">
                    {filtered.length} networks
                </div>
            </div>

            <div className="flex-1 overflow-auto p-6">
                {hasSelectedId ? (
                    <NetworkDetails networkId={selectedIdValue} />
                ) : (
                    <div className="flex h-full items-center justify-center text-muted-foreground">
                        <div className="text-center">
                            <Network className="mx-auto mb-4 h-12 w-12 opacity-50" />
                            <p>Select a network to view details</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

function NetworkDetails({ networkId }: { networkId: string }) {
    const { data: network, isLoading, error } = useAgentQuery(networkId)

    const modelLabel = (() => {
        const model = network?.model
        if (typeof model === 'string') {
            return model
        }

        if (
            model &&
            typeof model === 'object' &&
            'name' in model &&
            typeof model.name === 'string'
        ) {
            return model.name
        }

        return 'Unknown'
    })()

    if (isLoading) {
        return (
            <div className="space-y-4">
                <Skeleton className="h-8 w-64" />
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-80 w-full" />
            </div>
        )
    }

    if (error) {
        return <div className="text-destructive">{error.message}</div>
    }

    return (
        <div className="space-y-4">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold">{network?.name ?? networkId}</h1>
                    <p className="mt-1 text-muted-foreground">
                        {network?.description ?? 'No description available'}
                    </p>
                </div>
                <Button variant="outline" size="sm" asChild>
                    <Link href={`/chat?agent=${networkId}` as Route}>
                        <Network className="h-4 w-4 mr-2" />
                        Chat with network
                    </Link>
                </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Type</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Badge variant="outline">Network</Badge>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Model</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm">
                        {modelLabel}
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Identifier</CardTitle>
                    </CardHeader>
                    <CardContent className="truncate text-sm font-mono">
                        {networkId}
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Instructions</CardTitle>
                    <CardDescription>Coordinator prompt and routing behavior.</CardDescription>
                </CardHeader>
                <CardContent>
                    <pre className="max-h-96 overflow-auto whitespace-pre-wrap rounded-md bg-muted p-4 text-sm">
                        {network?.instructions ?? 'No instructions available'}
                    </pre>
                </CardContent>
            </Card>
        </div>
    )
}
