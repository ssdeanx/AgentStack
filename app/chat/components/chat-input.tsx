'use client'

import type {
    PromptInputMessage} from '@/src/components/ai-elements/prompt-input';
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
    BotIcon,
    CpuIcon,
    SparklesIcon,
    ListTodoIcon,
    XIcon,
} from 'lucide-react'
import type { JSX } from 'react';
import { useMemo, useState, useRef } from 'react'
import { MODEL_CONFIGS } from '../config/models'
import {
    getAgentsByCategory,
    CATEGORY_ORDER,
    CATEGORY_LABELS,
} from '../config/agents'
import { cn } from '@/lib/utils'

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
        <div className="flex flex-wrap gap-2 p-2 border-b border-border/50">
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
        selectModel,
        selectAgent,
        messages,
        usage,
        createCheckpoint,
    } = useChatContext()

    const [input, setInput] = useState('')
    const [isSpeaking, setIsSpeaking] = useState(false)
    const textareaRef = useRef<HTMLTextAreaElement>(null)

    const supportsFiles = agentConfig?.features.fileUpload ?? false
    const showSuggestions = messages.length === 0 && !isLoading
    const totalTokens = usage ? usage.inputTokens + usage.outputTokens : 0

    const suggestions = useMemo(
        () => getSuggestionsForAgent(selectedAgent),
        [selectedAgent]
    )

    const agentsByCategory = useMemo(() => getAgentsByCategory(), [])

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
        <footer className="border-t border-border p-4 bg-background">
            <div className="mx-auto max-w-4xl space-y-3">
                {showSuggestions && (
                    <AgentSuggestions
                        suggestions={suggestions}
                        onSelect={handleSuggestionClick}
                        disabled={isLoading}
                    />
                )}

                {/* Compact status bar */}
                <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
                    <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1.5">
                            <BotIcon className="size-3" />
                            {agentConfig?.name ?? selectedAgent}
                        </span>
                        <span className="flex items-center gap-1.5">
                            <CpuIcon className="size-3" />
                            {selectedModel.name}
                        </span>
                    </div>
                    {totalTokens > 0 && (
                        <Badge
                            variant="secondary"
                            className="text-xs font-normal"
                        >
                            {totalTokens.toLocaleString()} tokens
                        </Badge>
                    )}
                </div>

                <PromptInput
                    onSubmit={handleSubmit}
                    className="rounded-lg border shadow-sm transition-all duration-300 focus-within:glow-primary focus-within:ring-2 focus-within:ring-primary/20 bg-background"
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
                                        'text-primary glow-primary animate-ambient-pulse scale-110'
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

                            {/* Agent Selector */}
                            <ModelSelector>
                                <ModelSelectorTrigger asChild>
                                    <PromptInputButton title="Select agent">
                                        <BotIcon className="size-4" />
                                        <span className="hidden sm:inline ml-1 text-xs">
                                            {agentConfig?.name ?? selectedAgent}
                                        </span>
                                    </PromptInputButton>
                                </ModelSelectorTrigger>
                                <ModelSelectorContent>
                                    <ModelSelectorInput placeholder="Search agents..." />
                                    <ModelSelectorList>
                                        <ModelSelectorEmpty>
                                            No agents found.
                                        </ModelSelectorEmpty>
                                        {CATEGORY_ORDER.map((category) => {
                                            const agents =
                                                agentsByCategory[category]
                                            if (agents.length === 0) {
                                                return null
                                            }

                                            return (
                                                <ModelSelectorGroup
                                                    key={category}
                                                    heading={
                                                        CATEGORY_LABELS[
                                                            category
                                                        ]
                                                    }
                                                >
                                                    {agents.map((agent) => (
                                                        <ModelSelectorItem
                                                            key={agent.id}
                                                            onSelect={() =>
                                                                selectAgent(
                                                                    agent.id
                                                                )
                                                            }
                                                            className={cn(
                                                                selectedAgent ===
                                                                    agent.id &&
                                                                    'bg-accent'
                                                            )}
                                                        >
                                                            {agent.name}
                                                        </ModelSelectorItem>
                                                    ))}
                                                </ModelSelectorGroup>
                                            )
                                        })}
                                    </ModelSelectorList>
                                </ModelSelectorContent>
                            </ModelSelector>

                            {/* Model Selector */}
                            <ModelSelector>
                                <ModelSelectorTrigger asChild>
                                    <PromptInputButton title="Select model">
                                        <SparklesIcon className="size-4" />
                                        <span className="hidden sm:inline ml-1 text-xs">
                                            {selectedModel.name.split(' ')[0]}
                                        </span>
                                    </PromptInputButton>
                                </ModelSelectorTrigger>
                                <ModelSelectorContent>
                                    <ModelSelectorInput placeholder="Search models..." />
                                    <ModelSelectorList>
                                        <ModelSelectorEmpty>
                                            No models found.
                                        </ModelSelectorEmpty>
                                        <ModelSelectorGroup heading="Available Models">
                                            {MODEL_CONFIGS.map((model) => (
                                                <ModelSelectorItem
                                                    key={model.id}
                                                    onSelect={() =>
                                                        selectModel(model.id)
                                                    }
                                                    className={cn(
                                                        selectedModel.id ===
                                                            model.id &&
                                                            'bg-accent'
                                                    )}
                                                >
                                                    {model.name} (
                                                    {model.provider})
                                                </ModelSelectorItem>
                                            ))}
                                        </ModelSelectorGroup>
                                    </ModelSelectorList>
                                </ModelSelectorContent>
                            </ModelSelector>

                            {/* Context/Token Usage */}
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
