'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

import {
    useTool,
    useToolProviderToolSchema,
    useToolProviderToolkits,
    useToolProviderTools,
    useToolProviders,
    useTools,
} from '@/lib/hooks/use-mastra-query'
import { Badge } from '@/ui/badge'
import { Button } from '@/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/card'
import { Input } from '@/ui/input'
import { ScrollArea } from '@/ui/scroll-area'
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/ui/tooltip'
import {
    CodeBlock,
    CodeBlockActions,
    CodeBlockCopyButton,
    CodeBlockHeader,
    CodeBlockTitle,
} from '@/src/components/ai-elements/code-block'
import {
    ArrowLeftIcon,
    ChevronRightIcon,
    Loader2Icon,
    SearchIcon,
    SparklesIcon,
    WrenchIcon,
} from 'lucide-react'

type ToolRecord = {
    id: string
    description?: string
    inputSchema?: string | Record<string, unknown>
    outputSchema?: string | Record<string, unknown>
    requestContextSchema?: string | Record<string, unknown>
}

type ProviderRecord = {
    id: string
    name: string
    description?: string
}

type ToolkitRecord = {
    slug: string
    name: string
    description?: string
}

type ProviderToolRecord = {
    slug: string
    name: string
    description?: string
    toolkit?: string
}

function safeString(value: unknown): string {
    return typeof value === 'string' ? value : ''
}

function safeJson(value: unknown): string {
    if (value === null || value === undefined) {
        return 'null'
    }

    if (typeof value === 'string') {
        return value
    }

    try {
        return JSON.stringify(value, null, 2)
    } catch {
        return String(value)
    }
}

/**
 * Live inspector for tools, providers, toolkits, and schemas.
 */
export default function ChatToolsPage() {
    const router = useRouter()
    const toolsQuery = useTools()
    const providersQuery = useToolProviders()
    const [query, setQuery] = useState('')
    const [selectedProviderId, setSelectedProviderId] = useState('')
    const [selectedToolId, setSelectedToolId] = useState('')
    const [selectedToolkit, setSelectedToolkit] = useState('')

    const tools = useMemo<ToolRecord[]>(() => {
        if (!Array.isArray(toolsQuery.data)) {
            return []
        }

        return toolsQuery.data as ToolRecord[]
    }, [toolsQuery.data])

    const providers = providersQuery.data?.providers ?? []
    const activeProviderId = selectedProviderId || providers[0]?.id || ''

    const providerToolkitsQuery = useToolProviderToolkits(activeProviderId)
    const providerToolsQuery = useToolProviderTools(activeProviderId, {
        toolkit: selectedToolkit || undefined,
        search: query.trim() || undefined,
    })

    const providerToolkits = (providerToolkitsQuery.data ?? []) as ToolkitRecord[]
    const providerTools = (providerToolsQuery.data ?? []) as ProviderToolRecord[]
    const providersList = providers as ProviderRecord[]
    const activeProvider =
        providersList.find((provider) => provider.id === activeProviderId) ??
        providersList[0] ??
        null

    const filteredTools = useMemo(() => {
        const trimmed = query.trim().toLowerCase()

        if (!trimmed) {
            return tools
        }

        return tools.filter((tool) => {
            return [tool.id, tool.description, safeJson(tool.inputSchema), safeJson(tool.outputSchema)]
                .filter((value): value is string => Boolean(value))
                .some((value) => value.toLowerCase().includes(trimmed))
        })
    }, [query, tools])

    const selectedTool = useMemo(() => {
        return filteredTools.find((tool) => tool.id === selectedToolId) ?? filteredTools[0] ?? tools[0]
    }, [filteredTools, selectedToolId, tools])

    const toolDetailsQuery = useTool(selectedTool?.id ?? '')
    const providerSchemaQuery = useToolProviderToolSchema(activeProviderId, selectedTool?.id ?? '')
    const selectedToolDetails = toolDetailsQuery.data ?? selectedTool

    return (
        <TooltipProvider delayDuration={150}>
            <div className="flex min-h-screen flex-col bg-background">
            <header className="border-b bg-card/60 backdrop-blur">
                <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-4 sm:px-6 lg:px-8">
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
                                Inspect tools, providers, toolkits, and schemas from the live Mastra client hooks.
                            </p>
                        </div>
                    </div>
                    <div className="ml-auto flex items-center gap-2">
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Badge variant="secondary">{tools.length} tools</Badge>
                            </TooltipTrigger>
                            <TooltipContent>
                                Total tools exposed by the currently selected provider or all providers.
                            </TooltipContent>
                        </Tooltip>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Badge variant="secondary">{providers.length} providers</Badge>
                            </TooltipTrigger>
                            <TooltipContent>
                                Live tool providers discovered from the Mastra client.
                            </TooltipContent>
                        </Tooltip>
                    </div>
                </div>
            </header>

            <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
                <div className="grid gap-4 xl:grid-cols-[280px_1fr_1fr]">
                    <Card className="border-border/60 bg-card/80 shadow-sm">
                        <CardHeader className="space-y-3 border-b border-border/40 bg-linear-to-b from-background to-muted/10">
                            <div className="flex items-center justify-between gap-3">
                                <CardTitle className="text-base">Providers</CardTitle>
                                <Badge variant="secondary">{providers.length}</Badge>
                            </div>
                            {activeProvider ? (
                                <div className="rounded-2xl border border-border/60 bg-background/70 p-3 text-xs text-muted-foreground">
                                    <div className="font-medium text-foreground">{activeProvider.name}</div>
                                    <div>{activeProvider.description ?? activeProvider.id}</div>
                                </div>
                            ) : null}
                        </CardHeader>
                        <CardContent className="p-0">
                            {providersQuery.isLoading ? (
                                <div className="flex items-center gap-2 px-4 py-6 text-sm text-muted-foreground">
                                    <Loader2Icon className="size-4 animate-spin" />
                                    Loading providers...
                                </div>
                            ) : providers.length === 0 ? (
                                <div className="px-4 py-8 text-sm text-muted-foreground">No providers available.</div>
                            ) : (
                                <ScrollArea className="h-136">
                                    <div className="space-y-2 p-3">
                                        {providersList.map((provider) => {
                                            const isActive = provider.id === activeProviderId

                                            return (
                                                <button
                                                    key={provider.id}
                                                    type="button"
                                                    onClick={() => {
                                                        setSelectedProviderId(provider.id)
                                                        setSelectedToolkit('')
                                                    }}
                                                    className={`w-full rounded-2xl border px-4 py-3 text-left transition-colors ${isActive ? 'border-primary/30 bg-primary/10 text-foreground' : 'border-border/60 bg-background/70 text-muted-foreground hover:bg-muted/50 hover:text-foreground'}`}
                                                >
                                                    <div className="flex items-start justify-between gap-3">
                                                        <div className="min-w-0 space-y-1">
                                                            <div className="truncate text-sm font-medium text-foreground">{provider.name}</div>
                                                            <div className="truncate text-xs text-muted-foreground">{provider.description ?? provider.id}</div>
                                                        </div>
                                                        <Badge variant={isActive ? 'default' : 'secondary'}>{provider.id}</Badge>
                                                    </div>
                                                </button>
                                            )
                                        })}
                                    </div>
                                </ScrollArea>
                            )}
                        </CardContent>
                    </Card>

                    <Card className="border-border/60 bg-card/80 shadow-sm">
                        <CardHeader className="space-y-3 border-b border-border/40 bg-linear-to-b from-background to-muted/10">
                            <div className="flex items-center justify-between gap-3">
                                <CardTitle className="text-base">Tools</CardTitle>
                                <Badge variant="secondary">{filteredTools.length} shown</Badge>
                            </div>
                            <div className="relative">
                                <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    value={query}
                                    onChange={(event) => {
                                        setQuery(event.target.value)
                                    }}
                                    placeholder="Search tools by name, description, or schema"
                                    className="pl-9"
                                />
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            {toolsQuery.isLoading ? (
                                <div className="flex items-center gap-2 px-4 py-6 text-sm text-muted-foreground">
                                    <Loader2Icon className="size-4 animate-spin" />
                                    Loading tools...
                                </div>
                            ) : filteredTools.length === 0 ? (
                                <div className="px-4 py-8 text-sm text-muted-foreground">No tools matched your search.</div>
                            ) : (
                                <ScrollArea className="h-136">
                                    <div className="space-y-2 p-3">
                                        {filteredTools.map((tool) => {
                                            const isActive = tool.id === selectedTool?.id

                                            return (
                                                <button
                                                    key={tool.id}
                                                    type="button"
                                                    onClick={() => {
                                                        setSelectedToolId(tool.id)
                                                    }}
                                                    className={`w-full rounded-2xl border px-4 py-3 text-left transition-colors ${isActive ? 'border-primary/30 bg-primary/10 text-foreground' : 'border-border/60 bg-background/70 text-muted-foreground hover:bg-muted/50 hover:text-foreground'}`}
                                                >
                                                    <div className="flex items-start justify-between gap-3">
                                                        <div className="min-w-0 space-y-1">
                                                            <div className="truncate text-sm font-medium text-foreground">{tool.id}</div>
                                                            <div className="line-clamp-2 text-xs text-muted-foreground">{tool.description ?? 'No description available.'}</div>
                                                        </div>
                                                        <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" />
                                                    </div>
                                                </button>
                                            )
                                        })}
                                    </div>
                                </ScrollArea>
                            )}
                        </CardContent>
                    </Card>

                    <div className="space-y-4">
                        <Card className="border-border/60 bg-card/80 shadow-sm">
                            <CardHeader className="space-y-3 border-b border-border/40 bg-linear-to-b from-background to-muted/10">
                                <div className="flex items-center justify-between gap-3">
                                    <CardTitle className="text-base">Selected tool</CardTitle>
                                    <Badge variant="secondary" className="gap-1.5">
                                        <SparklesIcon className="size-3.5" />
                                        {selectedTool?.id ?? 'none'}
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4 p-5">
                                {selectedToolDetails ? (
                                    <>
                                        <div className="rounded-2xl border border-border/60 bg-background/70 p-4 space-y-3">
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="min-w-0">
                                                    <div className="text-sm font-medium text-foreground">{selectedToolDetails.id}</div>
                                                    <div className="text-xs text-muted-foreground">
                                                        {safeString(selectedToolDetails.description) || 'No description available.'}
                                                    </div>
                                                </div>
                                                <Badge variant="outline">Tool</Badge>
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Badge variant="secondary" className="cursor-help">
                                                            {selectedProviderId || 'global'}
                                                        </Badge>
                                                    </TooltipTrigger>
                                                    <TooltipContent>Current provider context.</TooltipContent>
                                                </Tooltip>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Badge variant="secondary" className="cursor-help">
                                                            {providerToolkits.length} toolkits
                                                        </Badge>
                                                    </TooltipTrigger>
                                                    <TooltipContent>Available toolkits for the selected provider.</TooltipContent>
                                                </Tooltip>
                                            </div>
                                        </div>

                                        <div className="space-y-3">
                                            <CodeBlock code={safeJson(selectedToolDetails.inputSchema)} language="json" showLineNumbers>
                                                <CodeBlockHeader>
                                                    <CodeBlockTitle>input-schema.json</CodeBlockTitle>
                                                    <CodeBlockActions>
                                                        <CodeBlockCopyButton />
                                                    </CodeBlockActions>
                                                </CodeBlockHeader>
                                            </CodeBlock>

                                            <CodeBlock code={safeJson(selectedToolDetails.outputSchema)} language="json" showLineNumbers>
                                                <CodeBlockHeader>
                                                    <CodeBlockTitle>output-schema.json</CodeBlockTitle>
                                                    <CodeBlockActions>
                                                        <CodeBlockCopyButton />
                                                    </CodeBlockActions>
                                                </CodeBlockHeader>
                                            </CodeBlock>

                                            {selectedToolDetails.requestContextSchema ? (
                                                <CodeBlock code={safeJson(selectedToolDetails.requestContextSchema)} language="json" showLineNumbers>
                                                    <CodeBlockHeader>
                                                        <CodeBlockTitle>request-context-schema.json</CodeBlockTitle>
                                                        <CodeBlockActions>
                                                            <CodeBlockCopyButton />
                                                        </CodeBlockActions>
                                                    </CodeBlockHeader>
                                                </CodeBlock>
                                            ) : null}

                                            {providerSchemaQuery.data ? (
                                                <CodeBlock code={safeJson(providerSchemaQuery.data)} language="json" showLineNumbers>
                                                    <CodeBlockHeader>
                                                        <CodeBlockTitle>provider-tool-schema.json</CodeBlockTitle>
                                                        <CodeBlockActions>
                                                            <CodeBlockCopyButton />
                                                        </CodeBlockActions>
                                                    </CodeBlockHeader>
                                                </CodeBlock>
                                            ) : null}
                                        </div>
                                    </>
                                ) : (
                                    <div className="text-sm text-muted-foreground">
                                        Select a tool to inspect its live schema and metadata.
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        <Card className="border-border/60 bg-card/80 shadow-sm">
                            <CardHeader className="space-y-3 border-b border-border/40 bg-linear-to-b from-background to-muted/10">
                                <div className="flex items-center justify-between gap-3">
                                    <CardTitle className="text-base">Provider toolkits</CardTitle>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Badge variant="secondary" className="cursor-help">
                                                {providerToolkits.length}
                                            </Badge>
                                        </TooltipTrigger>
                                        <TooltipContent>Toolkits available for the current provider.</TooltipContent>
                                    </Tooltip>
                                </div>
                            </CardHeader>
                            <CardContent className="p-4">
                                <div className="relative mb-3">
                                    <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                                    <Input
                                        value={selectedToolkit}
                                        onChange={(event) => {
                                            setSelectedToolkit(event.target.value)
                                        }}
                                        placeholder="Filter toolkit slug"
                                        className="pl-9"
                                    />
                                </div>

                                <ScrollArea className="h-72">
                                    <div className="space-y-2">
                                        {providerToolkitsQuery.isLoading ? (
                                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                <Loader2Icon className="size-4 animate-spin" />
                                                Loading toolkits...
                                            </div>
                                        ) : providerToolkits.length === 0 ? (
                                            <div className="text-sm text-muted-foreground">No toolkits available for this provider.</div>
                                        ) : (
                                            providerToolkits
                                                .filter((toolkit) => toolkit.slug.toLowerCase().includes(selectedToolkit.trim().toLowerCase()) || toolkit.name.toLowerCase().includes(selectedToolkit.trim().toLowerCase()))
                                                .map((toolkit: ToolkitRecord) => (
                                                    <button
                                                        key={toolkit.slug}
                                                        type="button"
                                                        onClick={() => {
                                                            setSelectedToolkit(toolkit.slug)
                                                        }}
                                                        className={`w-full rounded-2xl border px-4 py-3 text-left transition-colors ${selectedToolkit === toolkit.slug ? 'border-primary/30 bg-primary/10 text-foreground' : 'border-border/60 bg-background/70 text-muted-foreground hover:bg-muted/50 hover:text-foreground'}`}
                                                    >
                                                        <div className="flex items-start justify-between gap-3">
                                                            <div className="min-w-0 space-y-1">
                                                                <div className="truncate text-sm font-medium text-foreground">{toolkit.name}</div>
                                                                <div className="line-clamp-2 text-xs text-muted-foreground">{toolkit.description ?? toolkit.slug}</div>
                                                            </div>
                                                            <Badge variant="outline">{toolkit.slug}</Badge>
                                                        </div>
                                                    </button>
                                                ))
                                        )}
                                    </div>
                                </ScrollArea>
                            </CardContent>
                        </Card>

                        <Card className="border-border/60 bg-card/80 shadow-sm">
                            <CardHeader className="space-y-3 border-b border-border/40 bg-linear-to-b from-background to-muted/10">
                                <div className="flex items-center justify-between gap-3">
                                    <CardTitle className="text-base">Provider tools</CardTitle>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Badge variant="secondary" className="cursor-help">
                                                {providerTools.length}
                                            </Badge>
                                        </TooltipTrigger>
                                        <TooltipContent>Tools exposed by the selected provider.</TooltipContent>
                                    </Tooltip>
                                </div>
                            </CardHeader>
                            <CardContent className="p-4">
                                <ScrollArea className="h-80 pr-2">
                                    <div className="space-y-2">
                                        {providerToolsQuery.isLoading ? (
                                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                <Loader2Icon className="size-4 animate-spin" />
                                                Loading provider tools...
                                            </div>
                                        ) : providerTools.length === 0 ? (
                                            <div className="text-sm text-muted-foreground">No tools found for the selected provider and filter.</div>
                                        ) : (
                                            providerTools.map((tool: ProviderToolRecord) => (
                                                <div key={tool.slug} className="rounded-2xl border border-border/60 bg-background/70 px-4 py-3">
                                                    <div className="flex items-start justify-between gap-3">
                                                        <div className="min-w-0 space-y-1">
                                                            <div className="truncate text-sm font-medium text-foreground">{tool.name}</div>
                                                            <div className="line-clamp-2 text-xs text-muted-foreground">{tool.description ?? tool.slug}</div>
                                                        </div>
                                                        <Badge variant="secondary">{tool.toolkit ?? 'tool'}</Badge>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </ScrollArea>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </main>
            </div>
        </TooltipProvider>
    )
}