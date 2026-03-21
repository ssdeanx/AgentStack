'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTools } from '@/lib/hooks/use-mastra-query'
import { Button } from '@/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/card'
import { Input } from '@/ui/input'
import { Badge } from '@/ui/badge'
import { ArrowLeftIcon, Loader2Icon, SearchIcon, WrenchIcon } from 'lucide-react'

interface ToolRecord {
    id: string
    description?: string
    inputSchema?: unknown
    outputSchema?: unknown
}

export default function ChatToolsPage() {
    const router = useRouter()
    const { data, isLoading, error } = useTools()
    const [query, setQuery] = useState('')

    const tools = useMemo(() => {
        if (!Array.isArray(data)) {
            return [] as ToolRecord[]
        }
        return data as ToolRecord[]
    }, [data])

    const filteredTools = useMemo(() => {
        const trimmed = query.trim().toLowerCase()
        if (!trimmed) {
            return tools
        }

        return tools.filter((tool) => {
            const id = tool.id.toLowerCase()
            const description = (tool.description ?? '').toLowerCase()
            return id.includes(trimmed) || description.includes(trimmed)
        })
    }, [query, tools])

    return (
        <div className="flex min-h-screen flex-col bg-background">
            <header className="border-b bg-card/60 backdrop-blur">
                <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-4 sm:px-6 lg:px-8">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                            router.push('/chat')
                        }}
                    >
                        <ArrowLeftIcon className="size-4" />
                    </Button>
                    <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-primary/10 p-2 text-primary">
                            <WrenchIcon className="size-5" />
                        </div>
                        <div>
                            <h1 className="text-lg font-semibold">Chat Tools</h1>
                            <p className="text-sm text-muted-foreground">
                                Directly inspect the tools available to chat agents.
                            </p>
                        </div>
                    </div>
                    <div className="ml-auto flex items-center gap-2">
                        <Badge variant="secondary">{tools.length} tools</Badge>
                    </div>
                </div>
            </header>

            <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
                <div className="relative max-w-xl">
                    <SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        value={query}
                        onChange={(event) => {
                            setQuery(event.target.value)
                        }}
                        placeholder="Search tools by name or description"
                        className="pl-9"
                    />
                </div>

                {isLoading ? (
                    <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
                        <Loader2Icon className="size-4 animate-spin" />
                        Loading tools...
                    </div>
                ) : error ? (
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base text-destructive">
                                Failed to load tools
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="text-sm text-muted-foreground">
                            {error instanceof Error ? error.message : 'Failed to load tools'}
                        </CardContent>
                    </Card>
                ) : filteredTools.length === 0 ? (
                    <Card>
                        <CardContent className="py-10 text-center text-sm text-muted-foreground">
                            No tools matched your search.
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                        {filteredTools.map((tool) => (
                            <Card key={tool.id} className="h-full">
                                <CardHeader className="space-y-2">
                                    <div className="flex items-center justify-between gap-3">
                                        <CardTitle className="text-base">{tool.id}</CardTitle>
                                        <Badge variant="outline">Tool</Badge>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-3 text-sm text-muted-foreground">
                                    <p>{tool.description ?? 'No description available.'}</p>
                                    <div className="rounded-lg border bg-muted/30 p-3 text-xs">
                                        <div className="mb-1 font-medium text-foreground">Schemas</div>
                                        <div className="space-y-1">
                                            <div>
                                                Input:{' '}
                                                {tool.inputSchema !== null &&
                                                tool.inputSchema !== undefined
                                                    ? 'available'
                                                    : 'n/a'}
                                            </div>
                                            <div>
                                                Output:{' '}
                                                {tool.outputSchema !== null &&
                                                tool.outputSchema !== undefined
                                                    ? 'available'
                                                    : 'n/a'}
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </main>
        </div>
    )
}
