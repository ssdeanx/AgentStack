'use client'

import type { LanguageModelUsage } from 'ai'
import type { PromptInputMessage } from '@/src/components/ai-elements/prompt-input'
import {
    PromptInput,
    PromptInputTextarea,
    PromptInputFooter,
    PromptInputTools,
    PromptInputButton,
    PromptInputSubmit,
    PromptInputHeader,
    PromptInputBody,
    PromptInputActionMenu,
    PromptInputActionMenuTrigger,
    PromptInputActionMenuContent,
    PromptInputActionAddAttachments,
    usePromptInputAttachments,
} from '@/src/components/ai-elements/prompt-input'
import {
    ModelSelector,
    ModelSelectorTrigger,
    ModelSelectorContent,
    ModelSelectorInput,
    ModelSelectorList,
    ModelSelectorEmpty,
    ModelSelectorGroup,
    ModelSelectorItem,
    ModelSelectorLogo,
    ModelSelectorName,
} from '@/src/components/ai-elements/model-selector'
import {
    Context,
    ContextTrigger,
    ContextContent,
    ContextContentHeader,
    ContextContentBody,
    ContextInputUsage,
    ContextOutputUsage,
} from '@/src/components/ai-elements/context'
import { SpeechInput } from '@/src/components/ai-elements/speech-input'
import { useChatContext } from '@/app/chat/providers/chat-context-hooks'
import { AgentSuggestions } from './agent-suggestions'
import { getSuggestionsForAgent } from './chat.utils'
import { Badge } from '@/ui/badge'
import {
    PaperclipIcon,
    SquareIcon,
    CpuIcon,
    SparklesIcon,
    ListTodoIcon,
    XIcon,
} from 'lucide-react'
import type { JSX } from 'react'
import { useMemo, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

function getTotalTokens(
    usage: LanguageModelUsage | null | undefined
): number {
    return usage?.totalTokens ?? 0
}

function SelectedAttachments(): JSX.Element | null {
    type AttachmentLike =
        | File
        | { file?: File }
        | { blob?: Blob; name?: string }
        | null
        | undefined

    const { attachments, removeAttachment } =
        usePromptInputAttachments() as unknown as {
            attachments: AttachmentLike[]
            removeAttachment: (index: number) => void
        }

    if (!attachments || attachments.length === 0) {
        return null
    }

    const getName = (a: AttachmentLike) => {
        if (!a) {return 'attachment'}
        if (a instanceof File) {return a.name}
        if (typeof a === 'object' && 'file' in a && a.file instanceof File)
            {return a.file.name}
        if (typeof a === 'object' && 'name' in a && typeof a.name === 'string')
            {return a.name}
        return 'attachment'
    }

    return (
        <div className="flex flex-wrap gap-2 rounded-2xl border border-border/60 bg-background/70 p-2 shadow-sm">
            {attachments.map((att, index) => {
                const name = getName(att)
                return (
                    <Badge
                        key={`${name}-${index}`}
                        variant="secondary"
                        className="h-6 gap-1 pr-1"
                    >
                        <span className="max-w-30 truncate text-[10px]">
                            {name}
                        </span>
                        <button
                            type="button"
                            onClick={() => removeAttachment(index)}
                            className="rounded-full hover:bg-foreground/10 transition-colors"
                            aria-label={`Remove ${name}`}
                            title={`Remove ${name}`}
                        >
                            <XIcon className="size-3" />
                        </button>
                    </Badge>
                )
            })}
        </div>
    )
}

export function ChatInput() {
    const {
        sendMessage,
        stopGeneration,
        isLoading,
        status,
        agentConfig,
        selectedAgent,
        selectedModel,
        modelProviders,
        selectedProvider,
        selectedProviderModels,
        selectedProviderLabel,
        selectedProviderConnected,
        selectedProviderEnvVar,
        selectProvider,
        selectModel,
        messages,
        usage,
        createCheckpoint,
    } = useChatContext()

    const [input, setInput] = useState('')
    const [isSpeaking, _setIsSpeaking] = useState(false)
    const textareaRef = useRef<HTMLTextAreaElement>(null)

    const supportsFiles = agentConfig?.features.fileUpload ?? false
    const showSuggestions = messages.length === 0 && !isLoading
    const totalTokens = getTotalTokens(usage as LanguageModelUsage | null | undefined)
    const providerStatusLabel = selectedProviderConnected
        ? 'API key active'
        : selectedProviderEnvVar
          ? `Missing ${selectedProviderEnvVar}`
          : 'Provider unavailable'

    const suggestions = useMemo(
        () => getSuggestionsForAgent(selectedAgent),
        [selectedAgent]
    )

    const handleSubmit = (message: PromptInputMessage) => {
        const text = message.text?.trim()
        if (!text) {return}

        // Normalize possible file wrapper types to native File[]
        const rawParts = message.files ?? []
        const fileParts: unknown[] = Array.isArray(rawParts)
            ? rawParts
            : Array.from(rawParts as Iterable<unknown>)

        const normalize = (p: unknown): File | null => {
            if (!p) {return null}
            if (p instanceof File) {return p}
            if (typeof p === 'object' && p !== null) {
                const obj = p as { file?: unknown; blob?: unknown; name?: unknown }
                if (obj.file instanceof File) {return obj.file}
                if (obj.blob instanceof Blob) {
                    const name = typeof obj.name === 'string' ? obj.name : 'attachment'
                    return new File([obj.blob], name, { type: obj.blob.type })
                }
            }
            return null
        }

        const files = fileParts.map(normalize).filter((f): f is File => f !== null)

        sendMessage(text, files.length ? files : undefined)
        setInput('')
    }

    const handleSuggestionClick = (suggestion: string) => {
        sendMessage(suggestion)
    }

    // ... rest of component unchanged

    return (
        <footer className="border-t border-border/60 bg-background/90 px-4 py-4 shadow-[0_-12px_30px_-20px_rgba(0,0,0,0.45)] backdrop-blur-xl sm:px-6">
            <div className="mx-auto max-w-4xl space-y-3">
                {showSuggestions && (
                    <AgentSuggestions
                        suggestions={suggestions}
                        onSelect={handleSuggestionClick}
                        disabled={isLoading}
                    />
                )}

                {/* Compact status bar */}
                <div className="flex items-center justify-between gap-3 px-1 text-xs text-muted-foreground">
                    <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1.5">
                            <CpuIcon className="size-3" />
                            {agentConfig?.name ?? selectedAgent}
                        </span>
                        <span className="flex items-center gap-1.5">
                            <CpuIcon className="size-3" />
                            <span
                                className={cn(
                                    'inline-flex size-2 rounded-full',
                                    selectedProviderConnected
                                        ? 'bg-emerald-500 shadow-[0_0_10px_rgba(34,197,94,0.55)]'
                                        : 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.45)]'
                                )}
                                aria-hidden="true"
                            />
                            {selectedProviderLabel}
                        </span>
                        <span className="flex items-center gap-1.5">
                            <SparklesIcon className="size-3" />
                            {selectedModel.name}
                        </span>
                    </div>
                    {totalTokens > 0 && (
                        <div className="flex items-center gap-2">
                            <Badge
                                variant={
                                    selectedProviderConnected
                                        ? 'secondary'
                                        : 'outline'
                                }
                                className={cn(
                                    'text-xs font-normal',
                                    selectedProviderConnected
                                        ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                        : 'border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300'
                                )}
                            >
                                {providerStatusLabel}
                            </Badge>
                            <Badge
                                variant="secondary"
                                className="text-xs font-normal"
                            >
                                {totalTokens.toLocaleString()} tokens
                            </Badge>
                        </div>
                    )}
                </div>

                <PromptInput
                    onSubmit={handleSubmit}
                    className="rounded-3xl border border-border/60 bg-card/80 shadow-lg shadow-black/5 transition-all duration-300 focus-within:ring-2 focus-within:ring-primary/20 focus-within:shadow-xl"
                    accept={
                        supportsFiles
                            ? 'image/*,.pdf,.txt,.csv,.json,.md'
                            : undefined
                    }
                    multiple={supportsFiles}
                    globalDrop
                >
                    <PromptInputHeader>
                        {supportsFiles && <SelectedAttachments />}
                    </PromptInputHeader>

                    <PromptInputBody>
                        <PromptInputTextarea
                            placeholder={`Message ${agentConfig?.name ?? 'Agent'}...`}
                            disabled={isLoading}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            ref={textareaRef}
                        />
                    </PromptInputBody>

                    <PromptInputFooter>
                        <PromptInputTools>
                            <PromptInputActionMenu>
                                <PromptInputActionMenuTrigger>
                                    <PaperclipIcon className="size-4" />
                                </PromptInputActionMenuTrigger>
                                <PromptInputActionMenuContent>
                                    <PromptInputActionAddAttachments />
                                </PromptInputActionMenuContent>
                            </PromptInputActionMenu>

                            <SpeechInput
                                className={cn(
                                    'magnetic transition-all duration-300',
                                    isSpeaking &&
                                        'text-primary animate-ambient-pulse scale-105'
                                )}
                                onTranscriptionChange={(text) => {
                                    setInput(
                                        (prev) =>
                                            prev + (prev ? ' ' : '') + text
                                    )
                                }}
                                lang="en-US"
                                title="Speech to text"
                            />

                            <PromptInputButton
                                onClick={() => {
                                    if (messages.length > 0) {
                                        createCheckpoint(messages.length - 1)
                                    }
                                }}
                                disabled={messages.length === 0}
                                title="Create checkpoint"
                            >
                                <ListTodoIcon className="size-4" />
                            </PromptInputButton>

                            {/* Provider Selector */}
                            <ModelSelector>
                                <ModelSelectorTrigger asChild>
                                    <PromptInputButton title="Select provider">
                                        <CpuIcon className="size-4" />
                                        <span
                                            className={cn(
                                                'ml-1 inline-flex size-2 rounded-full',
                                                selectedProviderConnected
                                                    ? 'bg-emerald-500'
                                                    : 'bg-amber-500'
                                            )}
                                            aria-hidden="true"
                                        />
                                        <span className="hidden sm:inline ml-1 text-xs">
                                            {selectedProviderLabel}
                                        </span>
                                    </PromptInputButton>
                                </ModelSelectorTrigger>
                                <ModelSelectorContent className="w-80">
                                    <ModelSelectorInput placeholder="Search providers..." />
                                    <ModelSelectorList>
                                        <ModelSelectorEmpty>
                                            No providers found.
                                        </ModelSelectorEmpty>
                                        <ModelSelectorGroup heading="Available Providers">
                                            {modelProviders.map((provider) => (
                                                <ModelSelectorItem
                                                    key={provider.id}
                                                    onSelect={() => {
                                                        selectProvider(provider.id)
                                                    }}
                                                    className={cn(
                                                        selectedModel.provider ===
                                                            provider.id &&
                                                            'bg-accent'
                                                    )}
                                                >
                                                    <div className="flex min-w-0 items-center gap-2">
                                                        <ModelSelectorLogo
                                                            provider={provider.id}
                                                            className="size-3"
                                                        />
                                                        <span
                                                            className={cn(
                                                                'inline-flex size-2 rounded-full',
                                                                provider.connected
                                                                    ? 'bg-emerald-500'
                                                                    : 'bg-amber-500'
                                                            )}
                                                            aria-hidden="true"
                                                        />
                                                        <ModelSelectorName>
                                                            {provider.name}
                                                        </ModelSelectorName>
                                                    </div>
                                                    <div className="text-right text-xs text-muted-foreground">
                                                        <div>
                                                            {provider.connected
                                                                ? `${provider.models.length} model${provider.models.length === 1 ? '' : 's'}`
                                                                : 'API key missing'}
                                                        </div>
                                                        {provider.envVar ? (
                                                            <div className="text-[10px] uppercase tracking-wider text-muted-foreground/70">
                                                                {provider.envVar}
                                                            </div>
                                                        ) : null}
                                                    </div>
                                                </ModelSelectorItem>
                                            ))}
                                        </ModelSelectorGroup>
                                    </ModelSelectorList>
                                </ModelSelectorContent>
                            </ModelSelector>

                            {/* Model Selector */}
                            <ModelSelector>
                                <ModelSelectorTrigger asChild>
                                    <PromptInputButton title="Select model">
                                        <SparklesIcon className="size-4" />
                                        <span className="hidden sm:inline ml-1 text-xs">
                                            {selectedModel.name}
                                        </span>
                                    </PromptInputButton>
                                </ModelSelectorTrigger>
                                <ModelSelectorContent className="w-85">
                                    <ModelSelectorInput placeholder="Search models..." />
                                    <ModelSelectorList>
                                        <ModelSelectorEmpty>
                                            No models found.
                                        </ModelSelectorEmpty>
                                        <ModelSelectorGroup heading={selectedProviderLabel}>
                                            {selectedProviderModels.map((modelId) => (
                                                <ModelSelectorItem
                                                    key={modelId}
                                                    onSelect={() => selectModel(modelId)}
                                                    className={cn(
                                                        selectedModel.id ===
                                                            modelId &&
                                                            'bg-accent'
                                                    )}
                                                >
                                                    {modelId}
                                                </ModelSelectorItem>
                                            ))}
                                            {selectedProviderModels.length === 0 && (
                                                <div className="px-2 py-3 text-xs text-muted-foreground">
                                                    {selectedProvider?.connected
                                                        ? 'This agent does not expose runtime-selectable models for the selected provider.'
                                                        : providerStatusLabel}
                                                </div>
                                            )}
                                        </ModelSelectorGroup>
                                    </ModelSelectorList>
                                </ModelSelectorContent>
                            </ModelSelector>

                            {/* Context/Token Usage */}
                            {selectedModel.contextWindow !== undefined && (
                                <Context
                                    usedTokens={totalTokens}
                                    maxTokens={selectedModel.contextWindow}
                                >
                                    <ContextTrigger className="liquid-progress" />
                                    <ContextContent>
                                        <ContextContentHeader />
                                        <ContextContentBody>
                                            <ContextInputUsage />
                                            <ContextOutputUsage />
                                        </ContextContentBody>
                                    </ContextContent>
                                </Context>
                            )}

                            {isLoading && (
                                <PromptInputButton
                                    onClick={stopGeneration}
                                    variant="ghost"
                                    title="Stop generation"
                                    className="magnetic"
                                >
                                    <SquareIcon className="size-4" />
                                </PromptInputButton>
                            )}
                        </PromptInputTools>
                        <PromptInputSubmit
                            status={status}
                            disabled={isLoading && status !== 'streaming'}
                            className="magnetic"
                        />
                    </PromptInputFooter>
                </PromptInput>
            </div>
        </footer>
    )
}
