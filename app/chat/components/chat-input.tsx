'use client'

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
import { useChatContext } from '@/app/chat/providers/chat-context-hooks'
import { AgentSuggestions } from './agent-suggestions'
import { getSuggestionsForAgent } from './chat.utils'
import { Badge } from '@/ui/badge'
import {
    PaperclipIcon,
    SquareIcon,
    BotIcon,
    CpuIcon,
    MicIcon,
    SparklesIcon,
    ListTodoIcon,
    XIcon,
} from 'lucide-react'
import { useMemo, useState, useRef } from 'react'
import { MODEL_CONFIGS } from '../config/models'
import {
    getAgentsByCategory,
    CATEGORY_ORDER,
    CATEGORY_LABELS,
} from '../config/agents'
import { cn } from '@/lib/utils'

function SelectedAttachments() {
    const { attachments, removeAttachment } = usePromptInputAttachments()

    if (attachments.length === 0) {return null}

    return (
        <div className="flex flex-wrap gap-2 p-2 border-b border-border/50">
            {attachments.map((file, index) => (
                <Badge
                    key={`${file.name}-${index}`}
                    variant="secondary"
                    className="h-6 gap-1 pr-1"
                >
                    <span className="max-w-30 truncate text-[10px]">
                        {file.name}
                    </span>
                    <button
                        type="button"
                        onClick={() => removeAttachment(index)}
                        className="rounded-full hover:bg-foreground/10 transition-colors"
                    >
                        <XIcon className="size-3" />
                    </button>
                </Badge>
            ))}
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

    const handleSubmit = (message: { text: string; files: File[] }) => {
        if (message.text.trim()) {
            sendMessage(message.text, message.files)
            setInput('')
        }
    }

    const handleSuggestionClick = (suggestion: string) => {
        sendMessage(suggestion)
    }

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

                            <PromptInputButton
                                className={cn(
                                    'magnetic transition-all duration-300',
                                    isSpeaking &&
                                        'text-primary glow-primary animate-ambient-pulse scale-110'
                                )}
                                onClick={() => setIsSpeaking(!isSpeaking)}
                                title="Speech to text"
                            >
                                <MicIcon className="size-4" />
                            </PromptInputButton>

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
