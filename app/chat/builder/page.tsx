'use client'

import type {
    CreateStoredAgentParams,
    Provider,
    StoredAgentToolConfig,
} from '@mastra/client-js'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
    useAgentModelProviders,
    useCreateStoredAgentMutation,
    useTools,
} from '@/lib/hooks/use-mastra-query'
import { useAuthQuery } from '@/lib/hooks/use-auth-query'
import { Button } from '@/ui/button'
import { Input } from '@/ui/input'
import { Label } from '@/ui/label'
import { Textarea } from '@/ui/textarea'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/ui/select'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/ui/card'
import { Badge } from '@/ui/badge'
import { ScrollArea } from '@/ui/scroll-area'
import { Separator } from '@/ui/separator'
import { Switch } from '@/ui/switch'
import { Skeleton } from '@/ui/skeleton'
import { ChatPageShell } from '../components/chat-page-shell'
import { MainSidebar } from '../components/main-sidebar'
import { ChatProvider } from '../providers/chat-context'
import { 
    SaveIcon, 
    ArrowLeftIcon, 
    BotIcon, 
    WrenchIcon, 
    BrainIcon,
    Loader2Icon,
    AlertCircleIcon,
    SparklesIcon
} from 'lucide-react'
import { cn } from '@/lib/utils'

export default function AgentBuilderPage() {
    const router = useRouter()
    const authQuery = useAuthQuery()
    const userId = authQuery.data?.user.id
    
    // Mutations
    const createAgent = useCreateStoredAgentMutation()
    
    // Queries
    const { data: toolsData, isLoading: isLoadingTools } = useTools()
    const modelProvidersQuery = useAgentModelProviders()

    // Form State
    const [name, setName] = useState('')
    const [description, setDescription] = useState('')
    const [instructions, setInstructions] = useState('')
    const [selectedProviderId, setSelectedProviderId] = useState('')
    const [selectedModelId, setSelectedModelId] = useState('')
    const [selectedTools, setSelectedTools] = useState<string[]>([])
    
    // UI State
    const [isSaving, setIsSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const tools = useMemo(() => toolsData ?? [], [toolsData])
    const modelProviders = useMemo<Provider[]>(
        () => modelProvidersQuery.data?.providers ?? [],
        [modelProvidersQuery.data]
    )
    const selectedProvider = useMemo(
        () =>
            modelProviders.find((provider) => provider.id === selectedProviderId) ??
            null,
        [modelProviders, selectedProviderId]
    )
    const availableModels = useMemo(
        () => selectedProvider?.models ?? [],
        [selectedProvider]
    )
    const canSave =
        name.trim().length > 0 &&
        instructions.trim().length > 0 &&
        selectedProviderId.length > 0 &&
        selectedModelId.length > 0 &&
        (selectedProvider?.connected ?? false)

    useEffect(() => {
        if (modelProviders.length === 0) {
            return
        }

        const fallbackProvider =
            modelProviders.find((provider) => provider.connected) ??
            modelProviders[0]

        if (
            selectedProviderId.length === 0 ||
            !modelProviders.some((provider) => provider.id === selectedProviderId)
        ) {
            setSelectedProviderId(fallbackProvider.id)
        }
    }, [modelProviders, selectedProviderId])

    useEffect(() => {
        if (availableModels.length === 0) {
            if (selectedModelId.length > 0) {
                setSelectedModelId('')
            }
            return
        }

        if (!availableModels.includes(selectedModelId)) {
            setSelectedModelId(availableModels[0])
        }
    }, [availableModels, selectedModelId])

    const handleToggleTool = (toolId: string) => {
        setSelectedTools(prev => 
            prev.includes(toolId) 
                ? prev.filter(id => id !== toolId) 
                : [...prev, toolId]
        )
    }

    const handleSave = async () => {
        if (!canSave) {
            setError(
                selectedProvider?.connected === false
                    ? `Configure ${selectedProvider.envVar} before creating an agent with ${selectedProvider.name}.`
                    : 'Name, instructions, provider, and model are required.'
            )
            return
        }

        setIsSaving(true)
        setError(null)

        try {
            const toolConfigMap: Record<string, StoredAgentToolConfig> =
                Object.fromEntries(selectedTools.map((toolId) => [toolId, {}]))

            const agentData: CreateStoredAgentParams = {
                name: name.trim(),
                description:
                    description.trim().length > 0 ? description.trim() : undefined,
                instructions: instructions.trim(),
                model: {
                    provider: selectedProviderId,
                    name: selectedModelId,
                },
                tools: selectedTools.length > 0 ? toolConfigMap : undefined,
                authorId: userId,
                metadata: {
                    createdFrom: 'chat-builder',
                },
            }

            await createAgent.mutateAsync(agentData)
            router.push('/chat')
        } catch (err: unknown) {
            setError(
                err instanceof Error ? err.message : 'Failed to save agent'
            )
        } finally {
            setIsSaving(false)
        }
    }

    return (
        <ChatProvider>
            <ChatPageShell
                title="Agent builder"
                description="Create production-ready agents from live provider, model, and tool metadata without leaving the chat workspace."
                eyebrow="Custom agents"
                sidebar={<MainSidebar />}
                actions={
                    <>
                        <Button
                            variant="outline"
                            onClick={() => {
                                router.back()
                            }}
                            className="gap-2"
                        >
                            <ArrowLeftIcon className="size-4" />
                            Back
                        </Button>
                        <Button
                            onClick={() => {
                                void handleSave()
                            }}
                            disabled={isSaving || !canSave}
                            className="gap-2 px-5"
                        >
                            {isSaving ? (
                                <Loader2Icon className="size-4 animate-spin" />
                            ) : (
                                <SaveIcon className="size-4" />
                            )}
                            {isSaving ? 'Creating…' : 'Create agent'}
                        </Button>
                    </>
                }
            >
                <div className="space-y-6">
                    <div className="chat-panel-muted rounded-3xl p-5 sm:p-6">
                        <div className="flex flex-wrap items-start justify-between gap-4">
                            <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <SparklesIcon className="size-4 text-primary" />
                                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                                        Runtime-backed creation
                                    </p>
                                </div>
                                <h2 className="text-xl font-semibold tracking-tight text-foreground">
                                    Build agents with live runtime contracts
                                </h2>
                                <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
                                    Provider readiness, model availability, and tool selection all come from the
                                    current Mastra runtime so the builder stays aligned with production.
                                </p>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                                <Badge variant="outline" className="border-border/70 bg-background/60">
                                    {modelProviders.length} providers
                                </Badge>
                                <Badge variant="outline" className="border-border/70 bg-background/60">
                                    {availableModels.length} models
                                </Badge>
                                <Badge variant="outline" className="border-border/70 bg-background/60">
                                    {tools.length} tools
                                </Badge>
                            </div>
                        </div>
                    </div>

                    {error ? (
                        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                            <div className="flex items-start gap-3">
                                <AlertCircleIcon className="mt-0.5 size-4 shrink-0" />
                                <p>{error}</p>
                            </div>
                        </div>
                    ) : null}

                    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(320px,0.9fr)]">
                        <div className="space-y-6">
                            <Card className="chat-panel">
                                <CardHeader className="pb-4">
                                    <div className="flex items-center gap-2">
                                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                            <BotIcon className="size-4" />
                                        </div>
                                        <div>
                                            <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground/50">Basic Configuration</CardTitle>
                                             <CardDescription className="text-xs">Define your agent&apos;s identity and directives</CardDescription>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                     <div className="space-y-2">
                                         <Label htmlFor="name" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70 px-1">Agent Name</Label>
                                          <Input 
                                             id="name"
                                             value={name}
                                             onChange={(e) => { setName(e.target.value) }}
                                             placeholder="e.g. Analysis Engine v1"
                                              className="h-11 border-border/70 bg-background/75 font-medium placeholder:text-muted-foreground/40"
                                          />
                                      </div>

                                     <div className="space-y-2">
                                         <Label htmlFor="description" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70 px-1">Description</Label>
                                         <Input
                                             id="description"
                                              value={description}
                                              onChange={(e) => { setDescription(e.target.value) }}
                                              placeholder="What this agent helps users do"
                                              className="h-11 border-border/70 bg-background/75 font-medium placeholder:text-muted-foreground/40"
                                          />
                                      </div>
                                     
                                     <div className="space-y-2">
                                        <Label htmlFor="instructions" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70 px-1">System Instructions</Label>
                                        <Textarea 
                                            id="instructions"
                                             value={instructions}
                                             onChange={(e) => { setInstructions(e.target.value) }}
                                             placeholder="You are a specialized agent designed to..."
                                             className="min-h-62.5 resize-none border-border/70 bg-background/75 text-sm leading-relaxed"
                                         />
                                         <p className="text-[10px] text-muted-foreground/50 px-1 italic">Note: Clear, concise instructions lead to better results.</p>
                                     </div>
                                 </CardContent>
                             </Card>

                            <Card className="chat-panel">
                                <CardHeader className="pb-4">
                                    <div className="flex items-center gap-2">
                                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                            <BrainIcon className="size-4" />
                                        </div>
                                        <div>
                                            <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground/50">Model & Intelligence</CardTitle>
                                            <CardDescription className="text-xs">Select the underlying language model</CardDescription>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    <div className="space-y-2">
                                        <Label htmlFor="provider" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70 px-1">Provider</Label>
                                        <Select
                                            value={selectedProviderId}
                                            onValueChange={setSelectedProviderId}
                                        >
                                            <SelectTrigger id="provider" className="h-11 border-border/70 bg-background/75 font-medium">
                                                <SelectValue placeholder="Select a provider" />
                                            </SelectTrigger>
                                            <SelectContent className="border-border/70 bg-popover text-popover-foreground">
                                                {modelProviders.map((provider) => (
                                                    <SelectItem key={provider.id} value={provider.id}>
                                                        {provider.name} {provider.connected ? '• ready' : `• missing ${provider.envVar}`}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        {selectedProvider ? (
                                            <div className="mt-2 flex flex-wrap items-center gap-2 px-1">
                                                <Badge
                                                    variant="outline"
                                                    className={cn(
                                                        'text-[9px] uppercase tracking-tighter',
                                                        selectedProvider.connected
                                                            ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400'
                                                            : 'border-amber-500/20 bg-amber-500/10 text-amber-300'
                                                    )}
                                                >
                                                    {selectedProvider.connected
                                                        ? 'API key active'
                                                        : selectedProvider.envVar}
                                                </Badge>
                                                <Badge variant="outline" className="text-[9px] uppercase tracking-tighter bg-primary/5 text-primary border-primary/20">
                                                    {selectedProvider.models.length} runtime models
                                                </Badge>
                                            </div>
                                        ) : null}
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="model" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70 px-1">Model Selection</Label>
                                        <Select
                                            value={selectedModelId}
                                            onValueChange={setSelectedModelId}
                                        >
                                            <SelectTrigger id="model" className="h-11 border-border/70 bg-background/75 font-medium">
                                                <SelectValue placeholder="Select a model" />
                                            </SelectTrigger>
                                            <SelectContent className="border-border/70 bg-popover text-popover-foreground">
                                                {availableModels.map((modelId) => (
                                                    <SelectItem key={modelId} value={modelId}>
                                                        {modelId}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <div className="flex items-center gap-2 mt-2 px-1">
                                            <Badge variant="outline" className="text-[9px] uppercase tracking-tighter bg-primary/5 text-primary border-primary/20">
                                                {selectedProvider?.name ?? 'Provider required'}
                                            </Badge>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        <div className="space-y-6">
                            <Card className="chat-panel flex max-h-[calc(100vh-12rem)] flex-col xl:sticky xl:top-8">
                                <CardHeader className="pb-4 shrink-0">
                                    <div className="flex items-center gap-2">
                                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                            <WrenchIcon className="size-4" />
                                        </div>
                                        <div>
                                            <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground/50">Available Tools</CardTitle>
                                            <CardDescription className="text-xs">Extend functionalities</CardDescription>
                                        </div>
                                    </div>
                                </CardHeader>
                                <Separator className="bg-border/60" />
                                <CardContent className="flex-1 min-h-0 flex flex-col p-0 overflow-hidden">
                                    <ScrollArea className="flex-1">
                                        <div className="p-4 space-y-2.5">
                                            {isLoadingTools ? (
                                                Array.from({ length: 6 }).map((_, i) => (
                                                    <Skeleton key={i} className="h-16 w-full rounded-xl bg-muted/50" />
                                                ))
                                            ) : tools.length === 0 ? (
                                                <div className="flex flex-col items-center justify-center py-12 text-center">
                                                    <WrenchIcon className="size-8 text-muted-foreground/10 mb-2" />
                                                    <p className="text-xs text-muted-foreground">No tools available</p>
                                                </div>
                                             ) : (
                                                 tools.map((tool) => (
                                                     <div 
                                                         key={tool.id}
                                                         className={cn(
                                                             "group relative flex items-start gap-3 rounded-2xl border p-3 transition-all duration-200",
                                                             selectedTools.includes(tool.id) 
                                                                 ? "border-primary/30 bg-primary/8 shadow-[0_18px_36px_-28px_rgba(99,102,241,0.65)]" 
                                                                 : "border-border/60 bg-background/55 hover:border-border/80 hover:bg-background/75"
                                                         )}
                                                     >
                                                         <div className="flex-1 min-w-0">
                                                             <div className="flex items-start justify-between gap-2">
                                                                <h5 className="text-xs font-bold truncate leading-none mb-1 text-foreground/90">{tool.id}</h5>
                                                                 <Switch 
                                                                     checked={selectedTools.includes(tool.id)}
                                                                     onCheckedChange={() => { handleToggleTool(tool.id) }}
                                                                    className="scale-75 data-[state=checked]:bg-primary"
                                                                />
                                                             </div>
                                                             <p className="text-[10px] text-muted-foreground leading-relaxed line-clamp-2">
                                                                {tool.description || 'No description provided'}
                                                             </p>
                                                         </div>
                                                     </div>
                                                ))
                                            )}
                                        </div>
                                    </ScrollArea>
                                    <div className="border-t border-border/60 bg-background/70 p-4 shrink-0">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] font-bold uppercase tracking-widest text-primary/70">Selected</span>
                                            <div className="flex h-5 items-center justify-center rounded-full bg-primary px-2 text-[10px] font-bold text-primary-foreground">
                                                {selectedTools.length}
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </div>
            </ChatPageShell>
        </ChatProvider>
    )
}
