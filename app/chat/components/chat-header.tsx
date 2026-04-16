'use client'

import { Button } from '@/ui/button'
import { Input } from '@/ui/input'
import { Badge } from '@/ui/badge'
import {
    ModelSelector,
    ModelSelectorTrigger,
    ModelSelectorContent,
    ModelSelectorInput,
    ModelSelectorList,
    ModelSelectorGroup,
    ModelSelectorItem,
    ModelSelectorEmpty,
    ModelSelectorName,
    ModelSelectorLogo,
} from '@/src/components/ai-elements/model-selector'
import {
    Context,
    ContextTrigger,
    ContextContent,
    ContextContentHeader,
    ContextContentBody,
    ContextContentFooter,
    ContextInputUsage,
    ContextOutputUsage,
} from '@/src/components/ai-elements/context'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/ui/dialog'
import { Popover, PopoverContent, PopoverTrigger } from '@/ui/popover'
import { useChatContext } from '@/app/chat/providers/chat-context-hooks'
import { useAgents } from '@/lib/hooks/use-mastra-query'
import {
    createRuntimeAgentConfig,
    formatRuntimeContextWindow,
    groupRuntimeAgentsByCategory,
    RUNTIME_AGENT_CATEGORY_LABELS,
    RUNTIME_AGENT_CATEGORY_ORDER,
    type RuntimeAgentConfig,
    type RuntimeChatModel,
} from '@/app/chat/lib/runtime-chat-catalog'
import {
    CheckIcon,
    MessageSquareIcon,
    Trash2Icon,
    BookmarkIcon,
    SettingsIcon,
    DatabaseIcon,
    HistoryIcon,
    UserIcon,
    HashIcon,
    CpuIcon,
    BotIcon,
    Maximize2Icon,
    Minimize2Icon,
} from 'lucide-react'
import { useMemo, useState, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

export function ChatHeader() {
    const {
        selectedAgent,
        selectAgent,
        clearMessages,
        agentConfig,
        messages,
        usage,
        checkpoints,
        threadId,
        resourceId,
        setThreadId,
        setResourceId,
        restoreCheckpoint,
        availableModels,
        modelProviders,
        selectedModel,
        selectModel,
    } = useChatContext()

    const [agentSelectorOpen, setAgentSelectorOpen] = useState(false)
    const [modelSelectorOpen, setModelSelectorOpen] = useState(false)
    const [settingsOpen, setSettingsOpen] = useState(false)
    const [tempThreadId, setTempThreadId] = useState(threadId)
    const [tempResourceId, setTempResourceId] = useState(resourceId)

    const agentsQuery = useAgents()
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()

    const runtimeAgents = useMemo(
        () => {
            const data = agentsQuery.data ?? []
            const source = Array.isArray(data)
                ? data
                : Object.values(data as Record<string, unknown>)

            return source
                .map((agent) =>
                    createRuntimeAgentConfig(
                        agent as Parameters<typeof createRuntimeAgentConfig>[0]
                    )
                )
                .filter((agent): agent is RuntimeAgentConfig => agent !== undefined)
        },
        [agentsQuery.data]
    )

    const agentsByCategory = useMemo(
        () => groupRuntimeAgentsByCategory(runtimeAgents),
        [runtimeAgents]
    )

    const modelsByProvider = useMemo(() => {
        return modelProviders
            .map((provider) => {
                const models = provider.models.map<RuntimeChatModel>((modelId) => {
                    const knownModel =
                        availableModels.find(
                            (model) =>
                                model.id === modelId && model.provider === provider.id
                        ) ??
                        availableModels.find((model) => model.id === modelId)

                    return (
                        knownModel ?? {
                            id: modelId,
                            name: modelId,
                            provider: provider.id,
                        }
                    )
                })

                return {
                    provider,
                    models,
                }
            })
            .filter((entry) => entry.models.length > 0)
    }, [availableModels, modelProviders])

    const handleSelectAgent = (agent: RuntimeAgentConfig) => {
        selectAgent(agent.id)

        const nextParams = new URLSearchParams(searchParams.toString())
        nextParams.set('agent', agent.id)
        router.replace(`${pathname}?${nextParams.toString()}`)

        setAgentSelectorOpen(false)
    }

    const handleSelectModel = (model: RuntimeChatModel) => {
        selectModel(model.id)
        setModelSelectorOpen(false)
    }

    const handleSaveSettings = useCallback(() => {
        setThreadId(tempThreadId)
        setResourceId(tempResourceId)
        setSettingsOpen(false)
    }, [tempThreadId, tempResourceId, setThreadId, setResourceId])

    const { isFocusMode, setFocusMode } = useChatContext()

    const inputTokens = usage?.inputTokens ?? 0
    const outputTokens = usage?.outputTokens ?? 0
    const usedTokens = inputTokens + outputTokens

    return (
        <header className="sticky top-0 z-20 border-b border-border/60 bg-background/85 px-4 py-3 shadow-[0_1px_0_rgba(255,255,255,0.03),0_12px_32px_-24px_rgba(0,0,0,0.5)] backdrop-blur-xl sm:px-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-center gap-3">
                    <div className="rounded-2xl bg-primary/10 p-2 text-primary shadow-sm shadow-primary/10">
                        <MessageSquareIcon className="size-5" />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-sm font-semibold tracking-tight">
                            AgentStack Chat
                        </span>
                        <span className="text-xs text-muted-foreground">
                            {agentConfig?.description ?? 'AI-powered assistant'}
                        </span>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                {/* Checkpoint History */}
                {checkpoints.length > 0 && (
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                variant="outline"
                                size="sm"
                                className="gap-1.5"
                            >
                                <BookmarkIcon className="size-3.5" />
                                <span className="hidden sm:inline">
                                    Checkpoints
                                </span>
                                <Badge
                                    variant="secondary"
                                    className="ml-1 h-5 px-1.5 text-xs"
                                >
                                    {checkpoints.length}
                                </Badge>
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-72" align="end">
                            <div className="space-y-2">
                                <div className="flex items-center gap-2 text-sm font-medium">
                                    <HistoryIcon className="size-4" />
                                    Conversation Checkpoints
                                </div>
                                <div className="max-h-48 space-y-1 overflow-y-auto">
                                    {checkpoints.map((checkpoint) => (
                                        <button
                                            key={checkpoint.id}
                                            onClick={() =>
                                                { restoreCheckpoint(checkpoint.id); }
                                            }
                                            className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted"
                                        >
                                            <div className="flex flex-col">
                                                <span className="font-medium">
                                                    {checkpoint.label ??
                                                        `Checkpoint ${checkpoint.messageCount}`}
                                                </span>
                                                <span className="text-xs text-muted-foreground">
                                                    {checkpoint.timestamp.toLocaleTimeString()}{' '}
                                                    • {checkpoint.messageCount}{' '}
                                                    messages
                                                </span>
                                            </div>
                                            <BookmarkIcon className="size-3.5 text-primary" />
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </PopoverContent>
                    </Popover>
                )}

                {/* Live token usage */}
                {usage && usedTokens > 0 && selectedModel.contextWindow !== undefined && (
                    <Context
                        usedTokens={usedTokens}
                        maxTokens={selectedModel.contextWindow}
                        modelId={selectedModel.id}
                        usage={{
                            inputTokens: usage.inputTokens,
                            outputTokens: usage.outputTokens,
                            totalTokens: usage.totalTokens,
                            outputTokenDetails: usage.outputTokenDetails,
                            inputTokenDetails: usage.inputTokenDetails,
                        }}
                    >
                        <ContextTrigger />
                        <ContextContent align="end">
                            <ContextContentHeader />
                            <ContextContentBody className="space-y-1">
                                <ContextInputUsage />
                                <ContextOutputUsage />
                            </ContextContentBody>
                            <ContextContentFooter />
                        </ContextContent>
                    </Context>
                )}
                {/* Model Selector */}
                <ModelSelector
                    open={modelSelectorOpen}
                    onOpenChange={setModelSelectorOpen}
                >
                    <ModelSelectorTrigger asChild>
                        <Button variant="outline" size="sm" className="min-w-35 justify-between gap-2 rounded-2xl border-border/60 bg-background/70 shadow-sm">
                            <CpuIcon className="size-3.5 text-muted-foreground" />
                            <span className="truncate text-xs">
                                {selectedModel.name}
                            </span>
                        </Button>
                    </ModelSelectorTrigger>
                    <ModelSelectorContent className="w-85">
                        <ModelSelectorInput placeholder="Search models..." />
                        <ModelSelectorList className="max-h-100">
                            <ModelSelectorEmpty>
                                No models found.
                            </ModelSelectorEmpty>
                            {modelsByProvider.map(({ provider, models }) => {
                                if (models.length === 0) {
                                    return null
                                }

                                return (
                                    <ModelSelectorGroup
                                        key={provider.id}
                                        heading={
                                            <div className="flex items-center gap-2">
                                                <ModelSelectorLogo
                                                    provider={provider.id}
                                                    className="size-3"
                                                />
                                                {provider.name}
                                            </div>
                                        }
                                    >
                                        {models.map((model) => (
                                            <ModelSelectorItem
                                                key={model.id}
                                                value={model.id}
                                                onSelect={() =>
                                                    { handleSelectModel(model); }
                                                }
                                                className="flex items-center justify-between"
                                            >
                                                <div className="flex flex-col gap-0.5">
                                                    <ModelSelectorName>
                                                        {model.name}
                                                    </ModelSelectorName>
                                                    <span className="text-xs text-muted-foreground">
                                                        {formatRuntimeContextWindow(
                                                            model.contextWindow
                                                        )}
                                                        {model.description
                                                            ? ` • ${model.description}`
                                                            : ' • Live model'}
                                                    </span>
                                                </div>
                                                {selectedModel.id ===
                                                    model.id && (
                                                    <CheckIcon className="size-4 text-primary" />
                                                )}
                                            </ModelSelectorItem>
                                        ))}
                                    </ModelSelectorGroup>
                                )
                            })}
                        </ModelSelectorList>
                    </ModelSelectorContent>
                </ModelSelector>

                {/* Agent Selector */}
                <ModelSelector
                    open={agentSelectorOpen}
                    onOpenChange={setAgentSelectorOpen}
                >
                    <ModelSelectorTrigger asChild>
                        <Button
                            variant="outline"
                            size="sm"
                            className="min-w-40 justify-between gap-2"
                        >
                            <BotIcon className="size-3.5 text-muted-foreground" />
                            <span className="truncate">
                                {agentConfig?.name ?? selectedAgent}
                            </span>
                        </Button>
                    </ModelSelectorTrigger>
                    <ModelSelectorContent className="w-80">
                        <ModelSelectorInput placeholder="Search agents..." />
                        <ModelSelectorList className="max-h-100">
                            <ModelSelectorEmpty>
                                No agents found.
                            </ModelSelectorEmpty>
                            {RUNTIME_AGENT_CATEGORY_ORDER.map((category) => {
                                const agents = agentsByCategory[category]
                                if (agents.length === 0) {
                                    return null
                                }

                                return (
                                    <ModelSelectorGroup
                                        key={category}
                                        heading={RUNTIME_AGENT_CATEGORY_LABELS[category]}
                                    >
                                        {agents.map((agent) => (
                                            <ModelSelectorItem
                                                key={agent.id}
                                                value={agent.name}
                                                onSelect={() =>
                                                    { handleSelectAgent(agent); }
                                                }
                                                className="flex items-center justify-between"
                                            >
                                                <div className="flex flex-col gap-0.5">
                                                    <ModelSelectorName>
                                                        {agent.name}
                                                    </ModelSelectorName>
                                                    <span className="line-clamp-1 text-xs text-muted-foreground">
                                                        {agent.description}
                                                    </span>
                                                </div>
                                                {selectedAgent === agent.id && (
                                                    <CheckIcon className="size-4 text-primary" />
                                                )}
                                            </ModelSelectorItem>
                                        ))}
                                    </ModelSelectorGroup>
                                )
                            })}
                        </ModelSelectorList>
                    </ModelSelectorContent>
                </ModelSelector>

                {/* Focus Mode Toggle */}
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => { setFocusMode(!isFocusMode); }}
                    title={isFocusMode ? 'Exit Focus Mode' : 'Enter Focus Mode'}
                    className={cn(isFocusMode && 'text-primary')}
                >
                    {isFocusMode ? (
                        <Minimize2Icon className="size-4" />
                    ) : (
                        <Maximize2Icon className="size-4" />
                    )}
                </Button>

                {/* Memory Settings */}
                <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
                    <DialogTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            title="Memory settings"
                        >
                            <SettingsIcon className="size-4" />
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <DatabaseIcon className="size-5" />
                                Memory Settings
                            </DialogTitle>
                            <DialogDescription>
                                Configure the thread and resource identifiers
                                for conversation memory.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <label
                                    htmlFor="threadId"
                                    className="flex items-center gap-2 text-sm font-medium"
                                >
                                    <HashIcon className="size-4 text-muted-foreground" />
                                    Thread ID
                                </label>
                                <Input
                                    id="threadId"
                                    value={tempThreadId}
                                    onChange={(e) =>
                                        { setTempThreadId(e.target.value); }
                                    }
                                    placeholder="Enter thread ID..."
                                />
                                <p className="text-xs text-muted-foreground">
                                    Conversations with the same thread ID share
                                    memory context.
                                </p>
                            </div>
                            <div className="space-y-2">
                                <label
                                    htmlFor="resourceId"
                                    className="flex items-center gap-2 text-sm font-medium"
                                >
                                    <UserIcon className="size-4 text-muted-foreground" />
                                    Resource ID
                                </label>
                                <Input
                                    id="resourceId"
                                    value={tempResourceId}
                                    onChange={(e) =>
                                        { setTempResourceId(e.target.value); }
                                    }
                                    placeholder="Enter resource ID..."
                                />
                                <p className="text-xs text-muted-foreground">
                                    Typically represents the user or resource
                                    associated with this conversation.
                                </p>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button
                                variant="outline"
                                onClick={() => { setSettingsOpen(false); }}
                            >
                                Cancel
                            </Button>
                            <Button onClick={handleSaveSettings}>
                                Save Changes
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Clear Messages */}
                {messages.length > 0 && (
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={clearMessages}
                        title="Clear conversation"
                    >
                        <Trash2Icon className="size-4" />
                    </Button>
                )}
            </div>
            </div>
        </header>
    )
}
