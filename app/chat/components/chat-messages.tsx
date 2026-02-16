/* eslint-disable no-console */
'use client'

import {
    Conversation,
    ConversationContent,
    ConversationEmptyState,
    ConversationScrollButton,
} from '@/src/components/ai-elements/conversation'
import {
    Message,
    MessageContent,
    MessageResponse,
    MessageToolbar,
    MessageActions,
    MessageAction,
} from '@/src/components/ai-elements/message'
import { Loader } from '@/src/components/ai-elements/loader'
import {
    CodeBlock,
    CodeBlockCopyButton,
} from '@/src/components/ai-elements/code-block'
import { Image as AIImage } from '@/src/components/ai-elements/image'
import {
    Attachments,
    Attachment,
    AttachmentPreview,
    AttachmentInfo,
} from '@/src/components/ai-elements/attachments'
import {
    AudioPlayer,
    AudioPlayerElement,
    AudioPlayerControlBar,
    AudioPlayerPlayButton,
    AudioPlayerTimeDisplay,
    AudioPlayerTimeRange,
    AudioPlayerDurationDisplay,
    AudioPlayerMuteButton,
    AudioPlayerVolumeRange,
} from '@/src/components/ai-elements/audio-player'
import {
    Transcription,
    TranscriptionSegment,
} from '@/src/components/ai-elements/transcription'
import { AgentWebPreview, AgentCodeSandbox } from './agent-web-preview'
import type { WebPreviewData } from './chat.types'
import { useChatContext } from '@/app/chat/providers/chat-context-hooks'
import type { ToolInvocationState } from '@/app/chat/providers/chat-context-types'
import { AgentReasoning } from './agent-reasoning'
import { AgentChainOfThought } from './agent-chain-of-thought'
import { AgentTools } from './agent-tools'
import { AgentSources } from './agent-sources'
import { AgentArtifact } from './agent-artifact'
import { AgentPlan } from './agent-plan'
import { AgentCheckpoint } from './agent-checkpoint'
import { AgentTask } from './agent-task'
import type { AgentTaskData, ArtifactData, TaskStep } from './chat.types'
import { AgentQueue } from './agent-queue'
import { AgentConfirmation } from './agent-confirmation'
import { AgentInlineCitation } from './agent-inline-citation'
import {
    extractPlanFromText,
    parseReasoningToSteps,
    tokenizeInlineCitations,
} from './chat.utils'
import {
    CopyIcon,
    CheckIcon,
    MessageSquareIcon,
    BookmarkPlusIcon,
    ChevronDownIcon,
    ActivityIcon,
    NetworkIcon,
} from 'lucide-react'
import { useState, useCallback, useMemo, Fragment, memo } from 'react'
import type {
    UIMessage,
    UIDataTypes,
    UIMessageStreamOnStepFinishCallback,
    UIMessageStreamError,
    UIMessageStreamOnFinishCallback,
    UIMessageStreamWriter,
    UIMessageStreamOptions,
    DynamicToolUIPart,
    TextUIPart,
    ReasoningUIPart,
    ToolUIPart,
    TextStreamPart,
    TextPart,
    ToolResultPart,
    ReasoningOutput,
    UIDataPartSchemas,
    UIMessageChunk,
    UIMessagePart,
    DataContent,
    FinishReason,
    FileUIPart,
    Tool,
    DataUIPart,
    SourceDocumentUIPart,
    SourceUrlUIPart,
    StepResult,
    PrepareStepResult,
    StepStartUIPart,
    InferSchema,
    InferUIDataParts,
    InferAgentUIMessage,
    InferToolInput,
    InferUIMessageChunk,
    InferToolOutput,
    InferUITool,
    InferUITools,
    InferGenerateOutput,
    InferStreamOutput,
} from 'ai'
import {
    safeValidateUIMessages,
    getToolName,
    getStaticToolName,
    getTextFromDataUrl,
    isDataUIPart,
    isFileUIPart,
    isReasoningUIPart,
    isTextUIPart,
    isToolUIPart,
    isStaticToolUIPart,
    isDeepEqualData,
    InvalidResponseDataError,
    InvalidMessageRoleError,
    InvalidArgumentError,
    generateId,
} from 'ai'
import type { BundledLanguage } from 'shiki'
import { Button } from '@/ui/button'
import { Badge } from '@/ui/badge'
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/ui/collapsible'
import type {
    AgentDataPart,
    WorkflowDataPart,
    NetworkDataPart,
} from '@mastra/ai-sdk'
import { AgentTool } from '@/ui/agent-tool'
import { cn } from '@/lib/utils'

type MastraDataPart =
    | AgentDataPart
    | WorkflowDataPart
    | NetworkDataPart
    | { type: `data-${string}`; id?: string; data: unknown }

interface ChatMessagesProps {
    messages: UIMessage[]
    status: string
    error: Error | undefined
    onSuggestionClick: (suggestion: string) => void
    onCopyMessage?: (messageId: string, content: string) => void
    onRegenerate?: (messageId: string) => void
}

interface SourceDocument {
    title?: string
    url?: string
    description?: string
    sourceDocument?: string
}

function isSourceUrlPart(
    part: UIMessage['parts'][number]
): part is SourceUrlUIPart {
    return part.type === 'source-url'
}

function isSourceDocumentPart(
    part: UIMessage['parts'][number]
): part is SourceDocumentUIPart {
    return part.type === 'source-document'
}

// Extract sources from message parts
const getSourcesFromParts = (parts: UIMessage['parts']): SourceDocument[] => {
    const sources: SourceDocument[] = []
    for (const part of parts) {
        if (isSourceUrlPart(part)) {
            sources.push({
                title: part.title,
                url: part.url,
                description: part.url,
            })
            continue
        }

        if (isSourceDocumentPart(part)) {
            sources.push({
                title: part.title,
                description: part.filename ?? part.mediaType,
            })
        }
    }
    return sources
}

/**
 * Type guard to check for type property
 */
function hasStringType(part: unknown): part is { type: string } {
    return (
        typeof part === 'object' &&
        part !== null &&
        'type' in part &&
        typeof (part as { type: unknown }).type === 'string'
    )
}

/**
 * Type guard to check if a part is an AgentDataPart
 */
function isAgentDataPart(part: unknown): part is AgentDataPart {
    return hasStringType(part) && part.type === 'data-tool-agent'
}

/**
 * Type guard to check if a part is a WorkflowDataPart
 */
function isWorkflowDataPart(part: unknown): part is WorkflowDataPart {
    return (
        hasStringType(part) &&
        (part.type === 'data-workflow' || part.type === 'data-tool-workflow')
    )
}

/**
 * Type guard to check if a part is a NetworkDataPart
 */
function isNetworkDataPart(part: unknown): part is NetworkDataPart {
    return (
        hasStringType(part) &&
        (part.type === 'data-network' || part.type === 'data-tool-network')
    )
}

/**
 * Renders a nested agent execution result
 */
function AgentDataSection({ part }: { part: AgentDataPart }) {
    const agentData = part.data
    const hasText = Boolean(
        typeof agentData.text === 'string' && agentData.text.trim().length > 0
    )

    return (
        <Collapsible defaultOpen={false} className="border rounded-lg">
            <CollapsibleTrigger className="group flex h-10 w-full items-center justify-between px-4 py-2 text-xs font-semibold uppercase text-muted-foreground hover:text-foreground">
                <span className="flex items-center gap-2">
                    <ActivityIcon className="size-4" />
                    Agent Execution
                </span>
                <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                        Nested Agent
                    </Badge>
                    <ChevronDownIcon className="size-4 transition-transform group-data-[state=open]:rotate-180" />
                </div>
            </CollapsibleTrigger>
            <CollapsibleContent className="closed:animate-out open:animate-in closed:fade-out-0 open:fade-in-0 px-4 pb-4 pt-2">
                <div className="space-y-3">
                    {hasText && (
                        <div className="prose prose-sm dark:prose-invert max-w-none">
                            <p className="text-sm text-foreground whitespace-pre-wrap">
                                {agentData.text}
                            </p>
                        </div>
                    )}
                    <div className="bg-muted/50 rounded-md p-3">
                        <div className="text-xs font-semibold text-muted-foreground mb-2">
                            Agent Metadata
                        </div>
                        <CodeBlock
                            code={JSON.stringify(
                                {
                                    id: part.id,
                                    usage: agentData.usage,
                                    ...(Array.isArray(agentData.toolResults) &&
                                        agentData.toolResults.length > 0 && {
                                            toolsUsed:
                                                agentData.toolResults.map(
                                                    (tr: unknown) =>
                                                        typeof tr ===
                                                            'object' &&
                                                        tr !== null &&
                                                        typeof (
                                                            tr as Record<
                                                                string,
                                                                unknown
                                                            >
                                                        ).toolName === 'string'
                                                            ? (
                                                                  tr as Record<
                                                                      string,
                                                                      unknown
                                                                  >
                                                              ).toolName
                                                            : 'unknown'
                                                ),
                                        }),
                                },
                                null,
                                2
                            )}
                            language="json"
                        >
                            <CodeBlockCopyButton />
                        </CodeBlock>
                    </div>
                </div>
            </CollapsibleContent>
        </Collapsible>
    )
}

/**
 * Renders a nested workflow execution result
 */
function WorkflowDataSection({ part }: { part: WorkflowDataPart }) {
    const workflowData = part.data
    const stepEntries = Object.entries(workflowData.steps ?? {})

    return (
        <Collapsible defaultOpen={false} className="border rounded-lg">
            <CollapsibleTrigger className="group flex h-10 w-full items-center justify-between px-4 py-2 text-xs font-semibold uppercase text-muted-foreground hover:text-foreground">
                <span className="flex items-center gap-2">
                    <NetworkIcon className="size-4" />
                    {workflowData.name}
                </span>
                <div className="flex items-center gap-2">
                    <Badge
                        variant={
                            workflowData.status === 'success' ||
                            (workflowData.status as string) === 'completed'
                                ? 'default'
                                : workflowData.status === 'failed'
                                  ? 'destructive'
                                  : 'secondary'
                        }
                        className="text-xs"
                    >
                        {workflowData.status}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                        {stepEntries.length} steps
                    </Badge>
                    <ChevronDownIcon className="size-4 transition-transform group-data-[state=open]:rotate-180" />
                </div>
            </CollapsibleTrigger>
            <CollapsibleContent className="closed:animate-out open:animate-in closed:fade-out-0 open:fade-in-0 px-4 pb-4 pt-2">
                <div className="space-y-3">
                    {/* Workflow Steps */}
                    {stepEntries.length > 0 && (
                        <div className="space-y-2">
                            <div className="text-xs font-semibold text-muted-foreground">
                                Workflow Steps
                            </div>
                            {stepEntries.map(([stepName, stepData]) => (
                                <div
                                    key={stepName}
                                    className="bg-muted/30 rounded-md p-3 border"
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-xs font-medium">
                                            {stepName}
                                        </span>
                                        <Badge
                                            variant={
                                                stepData.status === 'success' ||
                                                (stepData.status as string) ===
                                                    'completed'
                                                    ? 'default'
                                                    : stepData.status ===
                                                        'failed'
                                                      ? 'destructive'
                                                      : 'secondary'
                                            }
                                            className="text-xs"
                                        >
                                            {stepData.status}
                                        </Badge>
                                    </div>
                                    <CodeBlock
                                        code={JSON.stringify(
                                            {
                                                input: stepData.input,
                                                output: stepData.output,
                                                ...(stepData.suspendPayload && {
                                                    suspended: true,
                                                }),
                                            },
                                            null,
                                            2
                                        )}
                                        language="json"
                                    >
                                        <CodeBlockCopyButton />
                                    </CodeBlock>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Usage Statistics */}
                    {workflowData.output?.usage && (
                        <div className="bg-muted/50 rounded-md p-3">
                            <div className="text-xs font-semibold text-muted-foreground mb-2">
                                Token Usage
                            </div>
                            <div className="grid grid-cols-3 gap-2 text-xs">
                                <div>
                                    <div className="text-muted-foreground">
                                        Input
                                    </div>
                                    <div className="font-mono">
                                        {workflowData.output.usage.inputTokens.toLocaleString()}
                                    </div>
                                </div>
                                <div>
                                    <div className="text-muted-foreground">
                                        Output
                                    </div>
                                    <div className="font-mono">
                                        {workflowData.output.usage.outputTokens.toLocaleString()}
                                    </div>
                                </div>
                                <div>
                                    <div className="text-muted-foreground">
                                        Total
                                    </div>
                                    <div className="font-mono">
                                        {workflowData.output.usage.totalTokens.toLocaleString()}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </CollapsibleContent>
        </Collapsible>
    )
}

/**
 * Renders a nested network execution result
 */
function NetworkDataSection({ part }: { part: NetworkDataPart }) {
    const networkData = part.data

    return (
        <Collapsible defaultOpen={false} className="border rounded-lg">
            <CollapsibleTrigger className="group flex h-10 w-full items-center justify-between px-4 py-2 text-xs font-semibold uppercase text-muted-foreground hover:text-foreground">
                <span className="flex items-center gap-2">
                    <NetworkIcon className="size-4" />
                    {networkData.name} Network
                </span>
                <div className="flex items-center gap-2">
                    <Badge
                        variant={
                            networkData.status === 'finished' ||
                            (networkData.status as string) === 'success'
                                ? 'default'
                                : 'secondary'
                        }
                        className="text-xs"
                    >
                        {networkData.status}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                        {networkData.steps.length} steps
                    </Badge>
                    <ChevronDownIcon className="size-4 transition-transform group-data-[state=open]:rotate-180" />
                </div>
            </CollapsibleTrigger>
            <CollapsibleContent className="closed:animate-out open:animate-in closed:fade-out-0 open:fade-in-0 px-4 pb-4 pt-2">
                <div className="space-y-3">
                    {/* Network Steps */}
                    {networkData.steps.length > 0 && (
                        <div className="space-y-2">
                            <div className="text-xs font-semibold text-muted-foreground">
                                Execution Steps
                            </div>
                            {networkData.steps.map((step, idx) => (
                                <div
                                    key={`${step.name}-${idx}`}
                                    className="bg-muted/30 rounded-md p-3 border"
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-xs font-medium">
                                            {step.name}
                                        </span>
                                        <Badge
                                            variant={
                                                step.status === 'success' ||
                                                (step.status as string) ===
                                                    'completed'
                                                    ? 'default'
                                                    : step.status === 'failed'
                                                      ? 'destructive'
                                                      : 'secondary'
                                            }
                                            className="text-xs"
                                        >
                                            {step.status}
                                        </Badge>
                                    </div>
                                    <CodeBlock
                                        code={JSON.stringify(
                                            {
                                                input: step.input,
                                                output: step.output,
                                            },
                                            null,
                                            2
                                        )}
                                        language="json"
                                    >
                                        <CodeBlockCopyButton />
                                    </CodeBlock>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Usage Statistics */}
                    {networkData.usage && (
                        <div className="bg-muted/50 rounded-md p-3">
                            <div className="text-xs font-semibold text-muted-foreground mb-2">
                                Token Usage
                            </div>
                            <div className="grid grid-cols-3 gap-2 text-xs">
                                {networkData.usage.inputTokens !==
                                    undefined && (
                                    <div>
                                        <div className="text-muted-foreground">
                                            Input
                                        </div>
                                        <div className="font-mono">
                                            {networkData.usage.inputTokens.toLocaleString()}
                                        </div>
                                    </div>
                                )}
                                {networkData.usage.outputTokens !==
                                    undefined && (
                                    <div>
                                        <div className="text-muted-foreground">
                                            Output
                                        </div>
                                        <div className="font-mono">
                                            {networkData.usage.outputTokens.toLocaleString()}
                                        </div>
                                    </div>
                                )}
                                {networkData.usage.totalTokens !==
                                    undefined && (
                                    <div>
                                        <div className="text-muted-foreground">
                                            Total
                                        </div>
                                        <div className="font-mono">
                                            {networkData.usage.totalTokens.toLocaleString()}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Output */}
                    {networkData.output !== null &&
                        networkData.output !== undefined && (
                            <div className="bg-muted/50 rounded-md p-3">
                                <div className="text-xs font-semibold text-muted-foreground mb-2">
                                    Network Output
                                </div>
                                <CodeBlock
                                    code={JSON.stringify(
                                        networkData.output,
                                        null,
                                        2
                                    )}
                                    language="json"
                                >
                                    <CodeBlockCopyButton />
                                </CodeBlock>
                            </div>
                        )}
                </div>
            </CollapsibleContent>
        </Collapsible>
    )
}

function extractThoughtSummaryFromParts(
    parts: UIMessage['parts'] | undefined
): string {
    if (!parts || parts.length === 0) {
        return ''
    }

    for (const part of parts) {
        const pm = (part as { providerMetadata?: unknown }).providerMetadata
        if (pm === null || typeof pm !== 'object') {
            continue
        }

        const googleMeta = (pm as Record<string, unknown>).google
        if (googleMeta === null || typeof googleMeta !== 'object') {
            continue
        }

        const candidates = [
            (googleMeta as Record<string, unknown>).thoughtSummary,
            (googleMeta as Record<string, unknown>).thoughts,
            (googleMeta as Record<string, unknown>).thinkingSummary,
        ]

        for (const c of candidates) {
            if (typeof c === 'string' && c.trim().length > 0) {
                return c
            }
        }
    }

    return ''
}

function resolveToolDisplayName(tool: ToolInvocationState): string {
    const dynamicName = (tool as { toolName?: unknown }).toolName
    if (typeof dynamicName === 'string' && dynamicName.trim().length > 0) {
        return dynamicName
    }

    const typeVal = (tool as { type?: unknown }).type
    if (typeof typeVal === 'string' && typeVal.startsWith('tool-')) {
        const sliced = typeVal.slice('tool-'.length)
        return sliced.length > 0 ? sliced : 'unknown'
    }

    return 'unknown'
}

/**
 * Safely resolve a tool call id for use in React keys without using `any`.
 * Falls back to the provided index if no string id is available.
 */
function getToolCallId(tool: unknown, fallbackIndex: number): string {
    // Explicitly check for null and non-object values to satisfy strict boolean checks
    if (tool === null || typeof tool !== 'object') {
        return `idx-${fallbackIndex}`
    }

    const maybeTool = tool as { toolCallId?: unknown; id?: unknown }

    if (
        typeof maybeTool.toolCallId === 'string' &&
        maybeTool.toolCallId.trim().length > 0
    ) {
        return maybeTool.toolCallId
    }

    if (typeof maybeTool.id === 'string' && maybeTool.id.trim().length > 0) {
        return maybeTool.id
    }

    return `idx-${fallbackIndex}`
}

// Extract extractTasksFromText to module level to fix scope issues
function extractTasksFromText(content: string): AgentTaskData[] {
    const taskSections: AgentTaskData[] = []
    const sectionRegex =
        /(?:tasks?|checklist|todo)[:\s]*\n((?:[-•\d[\]xX\s].+\n?)+)/gi
    let match: RegExpExecArray | null
    let sectionIndex = 0

    while ((match = sectionRegex.exec(content)) !== null) {
        const sectionBody = match[1]
        const lines = sectionBody
            .split('\n')
            .map((line) => line.trim())
            .filter((line) => line.length > 0)

        if (lines.length === 0) {
            continue
        }

        const steps: TaskStep[] = lines.map((line, idx) => {
            const statusMatch = /\[([ xX-])\]/.exec(line)
            let status: TaskStep['status'] = 'pending'
            if (statusMatch) {
                const symbol = statusMatch[1].toLowerCase()
                if (symbol === 'x') {
                    status = 'completed'
                } else if (symbol === '-') {
                    status = 'running'
                } else {
                    status = 'pending'
                }
            }

            const sanitized = line
                .replace(/\[[ xX-]\]\s*/, '')
                .replace(/^[-•\d.]+\s*/, '')

            return {
                id: `task-${sectionIndex}-${idx}`,
                text: sanitized,
                status,
            }
        })

        taskSections.push({
            title: `Task Group ${taskSections.length + 1}`,
            steps,
        })

        sectionIndex += 1
    }

    return taskSections
}

function CopyButton({ text }: { text: string }) {
    const [copied, setCopied] = useState(false)

    const handleCopy = useCallback(() => {
        navigator.clipboard
            .writeText(text)
            .then(() => {
                setCopied(true)
                setTimeout(() => setCopied(false), 2000)
            })
            .catch((err) => {
                console.error('Failed to copy:', err)
            })
    }, [text])

    return (
        <MessageAction
            tooltip={copied ? 'Copied!' : 'Copy'}
            onClick={handleCopy}
        >
            {copied ? (
                <CheckIcon className="size-4" />
            ) : (
                <CopyIcon className="size-4" />
            )}
        </MessageAction>
    )
}

function extractArtifacts(text: string): {
    content: string
    artifacts: ArtifactData[]
    codeBlocks: Array<{ language: string; code: string }>
} {
    const artifacts: ArtifactData[] = []
    const codeBlocks: Array<{ language: string; code: string }> = []
    let cleanContent = text

    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g
    let match: RegExpExecArray | null
    let artifactIndex = 0

    while ((match = codeBlockRegex.exec(text)) !== null) {
        const language = match[1] || 'text'
        const code = match[2].trim()

        if (code.length > 100) {
            const artifactId = `artifact-${Date.now()}-${artifactIndex++}`
            artifacts.push({
                id: artifactId,
                title: `Code: ${language}`,
                type: language === 'json' ? 'json' : 'code',
                language,
                content: code,
            })
            cleanContent = cleanContent.replace(
                match[0],
                `\n*[Code artifact: ${language}]*\n`
            )
        } else {
            codeBlocks.push({ language, code })
            cleanContent = cleanContent.replace(
                match[0],
                `\n__CODE_BLOCK_${codeBlocks.length - 1}__\n`
            )
        }
    }

    return { content: cleanContent, artifacts, codeBlocks }
}

interface MessageItemProps {
    message: UIMessage
    messageIndex: number
    showReasoning: boolean
    showChainOfThought: boolean
    showTools: boolean
    showSources: boolean
    showArtifacts: boolean
    showConfirmation: boolean
    sources: Array<{ url: string; title: string }>
    checkpointIds: string[]
    checkpointMessageIndices: number[]
    onCreateCheckpoint?: (index: number) => void
    onRestoreCheckpoint?: (checkpointId: string) => void
    onApproveConfirmation?: (id: string) => void
    onRejectConfirmation?: (id: string) => void
}

function MessageItem({
    message,
    messageIndex,
    showReasoning,
    showChainOfThought,
    showTools,
    showSources,
    showArtifacts,
    showConfirmation,
    sources,
    checkpointIds,
    checkpointMessageIndices,
    onCreateCheckpoint,
    onRestoreCheckpoint,
    onApproveConfirmation,
    onRejectConfirmation,
}: MessageItemProps) {
    const isAssistant = message.role === 'assistant'
    const isUser = message.role === 'user'
    const textPart = message.parts?.find(isTextUIPart)
    const rawContent = textPart?.text ?? ''
    const [inlinePreview, setInlinePreview] = useState<WebPreviewData | null>(
        null
    )
    const [sandboxPreview, setSandboxPreview] = useState<{
        code: string
        language: string
        title: string
    } | null>(null)

    const { content, artifacts, codeBlocks } = useMemo(() => {
        if (isAssistant && showArtifacts) {
            return extractArtifacts(rawContent)
        }
        return { content: rawContent, artifacts: [], codeBlocks: [] }
    }, [rawContent, isAssistant, showArtifacts])

    const messageReasoning = message.parts?.find(isReasoningUIPart)

    const resolvedReasoningText = useMemo(() => {
        const direct = messageReasoning?.text
        if (typeof direct === 'string' && direct.trim().length > 0) {
            return direct
        }
        return extractThoughtSummaryFromParts(message.parts)
    }, [messageReasoning, message.parts])
    const messageTools = useMemo(() => {
        const parts = message.parts ?? []
        const tools: ToolInvocationState[] = []

        for (const p of parts) {
            if (isToolUIPart(p)) {
                tools.push(p as ToolInvocationState)
            }
        }

        return tools.length > 0 ? tools : undefined
    }, [message.parts])

    const dataParts = useMemo((): MastraDataPart[] => {
        const parts = message.parts ?? []
        return parts.filter(
            (p): p is MastraDataPart =>
                typeof (p as { type?: unknown }).type === 'string' &&
                (p as { type: string }).type.startsWith('data-')
        )
    }, [message.parts])

    const toolProgressEvents = useMemo(() => {
        const parts = message.parts ?? []
        return parts
            .filter(
                (p) => (p as { type?: unknown }).type === 'data-tool-progress'
            )
            .map((p) => {
                const { data } = p as { data?: unknown }
                const partId = (p as { id?: unknown }).id
                const messageText =
                    data !== null &&
                    typeof data === 'object' &&
                    Object.prototype.hasOwnProperty.call(data, 'message') &&
                    typeof (data as { message?: unknown }).message === 'string'
                        ? (data as { message: string }).message
                        : ''
                const statusText =
                    data !== null &&
                    typeof data === 'object' &&
                    Object.prototype.hasOwnProperty.call(data, 'status') &&
                    typeof (data as { status?: unknown }).status === 'string'
                        ? (data as { status: string }).status
                        : ''
                const stageText =
                    data !== null &&
                    typeof data === 'object' &&
                    Object.prototype.hasOwnProperty.call(data, 'stage') &&
                    typeof (data as { stage?: unknown }).stage === 'string'
                        ? (data as { stage: string }).stage
                        : ''

                const normalizedStatus: 'in-progress' | 'done' | '' =
                    statusText === 'in-progress'
                        ? 'in-progress'
                        : statusText.trim().length > 0
                          ? 'done'
                          : ''
                return {
                    message: messageText,
                    status: normalizedStatus,
                    stage: stageText,
                    id: typeof partId === 'string' ? partId : '',
                }
            })
            .filter(
                (e) => e.message.trim().length > 0 || e.status.trim().length > 0
            )
    }, [message.parts])

    const fileParts = message.parts?.filter(isFileUIPart) as
        | FileUIPart[]
        | undefined
    const imageParts = fileParts?.filter((f) =>
        f.mediaType?.startsWith('image/')
    )
    const otherFileParts = fileParts?.filter(
        (f) => !f.mediaType?.startsWith('image/')
    )
    const audioParts = fileParts?.filter((f) =>
        f.mediaType?.startsWith('audio/')
    )

    const reasoningSteps = useMemo(() => {
        if (resolvedReasoningText.length > 0) {
            return parseReasoningToSteps(resolvedReasoningText)
        }
        return []
    }, [resolvedReasoningText])

    const hasChainOfThoughtSteps =
        showChainOfThought && reasoningSteps.length > 0
    const hasReasoningText = showReasoning && resolvedReasoningText.length > 0

    const plan = useMemo(() => {
        if (isAssistant) {
            return extractPlanFromText(rawContent)
        }
        return null
    }, [isAssistant, rawContent])

    const hasCitations = isAssistant && showSources && sources.length > 0
    const citationNodes = useMemo(() => {
        if (hasCitations) {
            const tokens = tokenizeInlineCitations(content, sources)
            return tokens.map((t, i) => {
                if (t.type === 'text') {
                    return t.text
                }

                return (
                    <AgentInlineCitation
                        key={`citation-${i}-${t.number}`}
                        text={t.text}
                        citations={[
                            {
                                id: `cite-${t.number}`,
                                number: t.number,
                                title: t.title,
                                url: t.url,
                            },
                        ]}
                    />
                )
            })
        }
        return null
    }, [hasCitations, content, sources])

    const extractedTasks = useMemo(
        () => extractTasksFromText(rawContent),
        [rawContent]
    )

    // Find checkpoint for this message
    const checkpointIndex = checkpointMessageIndices.indexOf(messageIndex)
    const isCheckpoint = checkpointIndex !== -1
    const checkpointId = isCheckpoint ? checkpointIds[checkpointIndex] : null

    const renderContentWithCodeBlocks = useCallback(
        (text: string) => {
            if (codeBlocks.length === 0) {
                return text
            }

            const parts = text.split(/__CODE_BLOCK_(\d+)__/)
            return parts.map((part, i) => {
                if (i % 2 === 1) {
                    const blockIndex = parseInt(part, 10)
                    if (blockIndex >= 0 && blockIndex < codeBlocks.length) {
                        const block = codeBlocks[blockIndex]
                        return (
                            <CodeBlock
                                key={`code-${blockIndex}`}
                                code={block.code}
                                language={block.language as BundledLanguage}
                                className="my-2"
                            >
                                <CodeBlockCopyButton />
                            </CodeBlock>
                        )
                    }
                }
                return part
            })
        },
        [codeBlocks]
    )

    return (
        <Fragment>
            <div className="perspective-distant preserve-3d py-2 reveal-on-scroll">
                <Message
                    from={message.role}
                    className={cn(
                        'transition-all duration-500 ease-spring',
                        isAssistant
                            ? 'rotate-y-2 translate-z-2 liquid-glass shadow-2xl'
                            : '-rotate-y-2 translate-z-1 shadow-md',
                        'hover:rotate-y-0 hover:translate-z-4'
                    )}
                >
                    <MessageContent>
                        {/* User file attachments */}
                        {isUser && fileParts && fileParts.length > 0 && (
                            <div className="my-2 flex flex-wrap gap-2">
                                {fileParts.map((file, idx) => (
                                    <div
                                        key={`file-${idx}`}
                                        className="flex items-center gap-2 rounded-lg border bg-muted/20 px-3 py-1.5 text-xs font-medium"
                                    >
                                        <span className="truncate max-w-50">
                                            {file.filename ??
                                                file.mediaType ??
                                                `File ${idx + 1}`}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Non-image files with inline preview controls */}
                        {otherFileParts && otherFileParts.length > 0 && (
                            <div className="my-2 space-y-2 rounded-lg border bg-muted/30 p-3">
                                <p className="text-xs font-medium text-muted-foreground">
                                    Attachments
                                </p>
                                {otherFileParts.map((file, idx) => (
                                    <div
                                        key={`other-file-${idx}`}
                                        className="flex items-center justify-between text-sm"
                                    >
                                        <span className="truncate">
                                            {file.filename ??
                                                file.mediaType ??
                                                `File ${idx + 1}`}
                                        </span>
                                        <div className="flex items-center gap-2">
                                            {file.url && (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="h-6 px-2 text-xs"
                                                    onClick={() =>
                                                        setInlinePreview({
                                                            id:
                                                                (
                                                                    file as {
                                                                        id?: string
                                                                    }
                                                                ).id ??
                                                                `file-${idx}`,
                                                            url: file.url,
                                                            title:
                                                                file.filename ??
                                                                'Preview',
                                                        })
                                                    }
                                                >
                                                    Preview
                                                </Button>
                                            )}
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-6 px-2 text-xs"
                                                onClick={() => {
                                                    if (file.url) {
                                                        window.open(
                                                            file.url,
                                                            '_blank'
                                                        )
                                                    }
                                                }}
                                            >
                                                Download
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {inlinePreview && (
                            <div className="my-3">
                                <AgentWebPreview
                                    preview={inlinePreview}
                                    onClose={() => setInlinePreview(null)}
                                    defaultTab="preview"
                                    height={360}
                                    editable={false}
                                />
                            </div>
                        )}

                        {/* Chain of Thought / Reasoning - mutually exclusive display */}
                        {isAssistant &&
                            hasReasoningText &&
                            (hasChainOfThoughtSteps ? (
                                <AgentChainOfThought
                                    steps={reasoningSteps}
                                    isStreaming={false}
                                />
                            ) : (
                                <AgentReasoning
                                    reasoning={resolvedReasoningText}
                                    isStreaming={false}
                                />
                            ))}

                        {/* Custom UI: Mastra data parts (data-tool-agent/workflow/network, data-workflow, data-network, data-{custom}) */}
                        {isAssistant && dataParts.length > 0 && (
                            <div className="my-3 space-y-2">
                                {dataParts.map((part, index) => {
                                    const partId = (part as { id?: string }).id
                                    const partType = (part as { type: string })
                                        .type

                                    if (partType === 'data-tool-progress') {
                                        // Rendered separately below in the dedicated Tool progress panel.
                                        return null
                                    }

                                    const key = `${message.id}-${partType}-${partId ?? index}`

                                    if (isAgentDataPart(part)) {
                                        return (
                                            <AgentDataSection
                                                key={key}
                                                part={part}
                                            />
                                        )
                                    }

                                    if (isWorkflowDataPart(part)) {
                                        return (
                                            <WorkflowDataSection
                                                key={key}
                                                part={part}
                                            />
                                        )
                                    }

                                    if (isNetworkDataPart(part)) {
                                        return (
                                            <NetworkDataSection
                                                key={key}
                                                part={part}
                                            />
                                        )
                                    }

                                    // Render tool-specific data parts using the AgentTool UI when available so custom tool events are displayed nicely.
                                    if (
                                        typeof partType === 'string' &&
                                        partType.startsWith('data-tool-')
                                    ) {
                                        return (
                                            <AgentTool
                                                key={key}
                                                {...(part as AgentDataPart)}
                                            />
                                        )
                                    }

                                    // Generic fallback: show any other data-* part as JSON so ALL tools/custom events are visible.
                                    const { data } = part as { data?: unknown }
                                    return (
                                        <Collapsible
                                            key={key}
                                            className="rounded-lg border bg-muted/20"
                                            defaultOpen={false}
                                        >
                                            <CollapsibleTrigger className="group flex w-full items-center justify-between px-4 py-2 text-xs font-semibold uppercase text-muted-foreground hover:text-foreground">
                                                <span>{partType}</span>
                                                <div className="flex items-center gap-2">
                                                    <Badge variant="secondary">
                                                        Custom Event
                                                    </Badge>
                                                    <ChevronDownIcon className="size-4 transition-transform group-data-[state=open]:rotate-180" />
                                                </div>
                                            </CollapsibleTrigger>
                                            <CollapsibleContent className="px-4 pb-4 pt-2">
                                                <CodeBlock
                                                    code={JSON.stringify(
                                                        data ?? {},
                                                        null,
                                                        2
                                                    )}
                                                    language={
                                                        'json' as BundledLanguage
                                                    }
                                                    className="my-2"
                                                >
                                                    <CodeBlockCopyButton />
                                                </CodeBlock>
                                            </CollapsibleContent>
                                        </Collapsible>
                                    )
                                })}
                            </div>
                        )}

                        {/* Custom tool progress events (writer.custom -> data-tool-progress) */}
                        {isAssistant && toolProgressEvents.length > 0 && (
                            <div className="my-3 rounded-lg border bg-muted/20 p-3">
                                <div className="text-xs font-medium text-muted-foreground">
                                    Tool progress
                                </div>
                                <ul className="mt-2 space-y-1 text-sm">
                                    {toolProgressEvents
                                        .slice(-10)
                                        .map((e, idx) => (
                                            <li
                                                key={`tool-progress-${idx}`}
                                                className="flex gap-2"
                                            >
                                                {e.status.trim().length > 0 && (
                                                    <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase text-muted-foreground">
                                                        {e.status}
                                                    </span>
                                                )}
                                                {((e.stage ?? '').trim()
                                                    .length > 0 ||
                                                    (e.id ?? '').trim().length >
                                                        0) && (
                                                    <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase text-muted-foreground">
                                                        {(
                                                            e.stage ?? e.id
                                                        ).trim()}
                                                    </span>
                                                )}
                                                <span className="min-w-0 flex-1 wrap-break-word">
                                                    {e.message}
                                                </span>
                                            </li>
                                        ))}
                                </ul>
                            </div>
                        )}

                        {/* Plan */}
                        {plan && <AgentPlan plan={plan} defaultOpen={false} />}

                        {/* Generated images */}
                        {isAssistant && imageParts && imageParts.length > 0 && (
                            <div className="my-2 flex flex-wrap gap-2">
                                {imageParts.map((img, idx) => {
                                    const base64Data = img.url?.startsWith(
                                        'data:'
                                    )
                                        ? img.url.split(',')[1] || ''
                                        : ''
                                    return (
                                        <AIImage
                                            key={`img-${idx}`}
                                            base64={base64Data}
                                            uint8Array={new Uint8Array()}
                                            mediaType={
                                                img.mediaType || 'image/png'
                                            }
                                            className="max-w-md rounded-lg"
                                            alt={
                                                img.filename ??
                                                `Generated image ${idx + 1}`
                                            }
                                        />
                                    )
                                })}
                            </div>
                        )}

                        {/* Audio files with AudioPlayer */}
                        {audioParts && audioParts.length > 0 && (
                            <div className="my-3 space-y-3">
                                {audioParts.map((audio, idx) => (
                                    <AudioPlayer
                                        key={`audio-${idx}`}
                                        className="w-full"
                                    >
                                        <AudioPlayerElement
                                            src={audio.url || ''}
                                            preload="metadata"
                                        />
                                        <AudioPlayerControlBar className="rounded-lg bg-muted/50 p-2">
                                            <AudioPlayerPlayButton className="h-8 w-8" />
                                            <AudioPlayerTimeDisplay className="text-sm tabular-nums" />
                                            <AudioPlayerTimeRange className="flex-1" />
                                            <AudioPlayerDurationDisplay className="text-sm tabular-nums text-muted-foreground" />
                                            <AudioPlayerMuteButton className="h-8 w-8" />
                                            <AudioPlayerVolumeRange className="w-20" />
                                        </AudioPlayerControlBar>
                                    </AudioPlayer>
                                ))}
                            </div>
                        )}

                        {/* Message content with inline code blocks */}
                        {hasCitations && citationNodes ? (
                            <div className="prose prose-sm max-w-none dark:prose-invert">
                                {citationNodes}
                            </div>
                        ) : codeBlocks.length > 0 ? (
                            <div className="prose prose-sm max-w-none dark:prose-invert">
                                {renderContentWithCodeBlocks(content)}
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="mt-2 gap-1 text-sm"
                                    onClick={() =>
                                        setSandboxPreview({
                                            code: codeBlocks[0].code,
                                            language: codeBlocks[0].language,
                                            title:
                                                (messageReasoning?.text ?? '')
                                                    .length > 0
                                                    ? 'Reasoning Snippet'
                                                    : 'Code Snippet',
                                        })
                                    }
                                >
                                    Open first snippet in sandbox
                                </Button>
                            </div>
                        ) : (
                            <MessageResponse>{content}</MessageResponse>
                        )}

                        {sandboxPreview && (
                            <div className="my-3">
                                <AgentCodeSandbox
                                    code={sandboxPreview.code}
                                    language={sandboxPreview.language}
                                    title={sandboxPreview.title}
                                    onClose={() => setSandboxPreview(null)}
                                    onCodeChange={(code) =>
                                        setSandboxPreview((prev) =>
                                            prev ? { ...prev, code } : prev
                                        )
                                    }
                                />
                            </div>
                        )}

                        {/* Artifacts */}
                        {isAssistant &&
                            showArtifacts &&
                            artifacts.length > 0 && (
                                <div className="mt-3 space-y-3">
                                    {artifacts.map((artifact) => (
                                        <AgentArtifact
                                            key={artifact.id}
                                            artifact={artifact}
                                        />
                                    ))}
                                </div>
                            )}

                        {/* Parsed Tasks */}
                        {isAssistant && extractedTasks.length > 0 && (
                            <div className="mt-4 space-y-3">
                                {extractedTasks.map((task, idx: number) => (
                                    <AgentTask
                                        key={`task-${idx}`}
                                        task={task}
                                        defaultOpen={false}
                                    />
                                ))}
                            </div>
                        )}

                        {/* Tool Confirmations */}
                        {isAssistant &&
                            showConfirmation &&
                            messageTools &&
                            messageTools.length > 0 && (
                                <>
                                    {messageTools
                                        .filter(
                                            (tool) =>
                                                tool.state ===
                                                ('approval-requested' as unknown)
                                        )
                                        .map((tool, idx) => {
                                            const resolvedName =
                                                resolveToolDisplayName(tool)
                                            const callId = getToolCallId(
                                                tool,
                                                idx
                                            )
                                            return (
                                                <AgentConfirmation
                                                    key={`${callId}-${idx}`}
                                                    toolName={resolvedName}
                                                    description={`Execute ${resolvedName} with provided parameters`}
                                                    approval={{
                                                        id: callId,
                                                    }}
                                                    state={tool.state}
                                                    onApprove={(id) =>
                                                        onApproveConfirmation?.(
                                                            id
                                                        )
                                                    }
                                                    onReject={(id) =>
                                                        onRejectConfirmation?.(
                                                            id
                                                        )
                                                    }
                                                />
                                            )
                                        })}
                                </>
                            )}

                        {/* Tools */}
                        {isAssistant &&
                            showTools &&
                            messageTools &&
                            messageTools.length > 0 && (
                                <div className="my-3">
                                    <AgentTools tools={messageTools} />
                                </div>
                            )}

                        {/* Sources */}
                        {isAssistant && showSources && sources.length > 0 && (
                            <AgentSources sources={sources} />
                        )}
                    </MessageContent>

                    {isAssistant && (
                        <MessageToolbar>
                            <MessageActions>
                                <CopyButton text={rawContent} />
                                {onCreateCheckpoint && (
                                    <MessageAction
                                        tooltip="Create checkpoint"
                                        onClick={() =>
                                            onCreateCheckpoint(messageIndex)
                                        }
                                    >
                                        <BookmarkPlusIcon className="size-4" />
                                    </MessageAction>
                                )}
                            </MessageActions>
                        </MessageToolbar>
                    )}
                </Message>
            </div>

            {isCheckpoint && checkpointId !== null && onRestoreCheckpoint && (
                <AgentCheckpoint
                    messageIndex={messageIndex}
                    onRestore={() => onRestoreCheckpoint(checkpointId)}
                />
            )}
        </Fragment>
    )
}

function WebPreviewPanel({ preview }: { preview: WebPreviewData | null }) {
    const { setWebPreview, agentConfig } = useChatContext()

    const handleCodeChange = useCallback(
        (newCode: string) => {
            if (!preview) {
                return
            }
            setWebPreview({
                ...preview,
                code: newCode,
            })
        },
        [preview, setWebPreview]
    )

    const handleClose = useCallback(() => {
        setWebPreview(null)
    }, [setWebPreview])

    if (!preview || agentConfig?.features.webPreview !== true) {
        return null
    }

    // If we have code, use the enhanced preview with live editing
    if ((preview.code ?? '').length > 0) {
        return (
            <div className="mx-auto mb-4 max-w-4xl">
                <AgentWebPreview
                    preview={{
                        id: preview.id,
                        url: preview.url,
                        title: preview.title,
                        code: preview.code,
                        language: preview.language,
                        //            html: preview.html
                    }}
                    onClose={handleClose}
                    onCodeChange={handleCodeChange}
                    defaultTab="preview"
                    height={450}
                    editable={true}
                    showConsole={true}
                />
            </div>
        )
    }

    // Simple iframe preview for URLs without code
    return (
        <div className="mx-auto mb-4 max-w-4xl">
            <AgentWebPreview
                preview={{
                    id: preview.id,
                    url: preview.url,
                    title: preview.title,
                }}
                onClose={handleClose}
                //        onCodeChange={handleCodeChange}
                defaultTab="preview"
                showConsole={false}
                height={450}
                editable={false}
            />
        </div>
    )
}

export function ChatMessages() {
    const {
        messages,
        isLoading,
        streamingContent,
        streamingReasoning,
        toolInvocations,
        sources,
        selectedAgent,
        agentConfig,
        queuedTasks,
        checkpoints,
        webPreview,
        approveConfirmation,
        rejectConfirmation,
        removeTask,
        createCheckpoint,
        restoreCheckpoint,
    } = useChatContext()

    const showReasoning = agentConfig?.features.reasoning ?? false
    const showChainOfThought = agentConfig?.features.chainOfThought ?? false
    const showTools = agentConfig?.features.tools ?? false
    const showSources = agentConfig?.features.sources ?? false
    const showArtifacts = agentConfig?.features.artifacts ?? false
    const showConfirmation = agentConfig?.features.confirmation ?? false
    const showQueue = agentConfig?.features.queue ?? false

    const handleCreateCheckpoint = useCallback(
        (index: number) => {
            createCheckpoint(index)
        },
        [createCheckpoint]
    )

    const handleRestoreCheckpoint = useCallback(
        (checkpointId: string) => {
            restoreCheckpoint(checkpointId)
        },
        [restoreCheckpoint]
    )

    const streamingReasoningSteps = useMemo(() => {
        if ((streamingReasoning ?? '').length > 0) {
            return parseReasoningToSteps(streamingReasoning)
        }
        return []
    }, [streamingReasoning])

    const hasStreamingChainOfThought =
        showChainOfThought && streamingReasoningSteps.length > 0
    const shouldShowStreamingReasoningFallback =
        showReasoning &&
        (!showChainOfThought || !hasStreamingChainOfThought) &&
        (streamingReasoning ?? '').length > 0

    const shouldRenderLoadingMessage = useMemo(() => {
        if (!isLoading) {
            return false
        }
        return messages.at(-1)?.role !== 'assistant'
    }, [isLoading, messages])

    // Get checkpoint data for message items
    const checkpointIds = useMemo(
        () => checkpoints.map((cp) => cp.id),
        [checkpoints]
    )
    const checkpointMessageIndices = useMemo(
        () => checkpoints.map((cp) => cp.messageIndex),
        [checkpoints]
    )

    return (
        <Conversation className="flex-1">
            <ConversationContent className="mx-auto max-w-3xl">
                {messages.length === 0 && !isLoading ? (
                    <ConversationEmptyState
                        icon={<MessageSquareIcon className="size-8" />}
                        title="Start a conversation"
                        description={`Chat with ${agentConfig?.name ?? selectedAgent} to get started`}
                    />
                ) : (
                    <>
                        {/* Task Queue */}
                        {showQueue && queuedTasks.length > 0 && (
                            <AgentQueue
                                tasks={queuedTasks}
                                onView={(id) => console.log('View task:', id)}
                                onRetry={(id) => console.log('Retry task:', id)}
                                onDelete={removeTask}
                            />
                        )}

                        {/* Web Preview Panel */}
                        <WebPreviewPanel preview={webPreview} />

                        {messages.map((message, index) => (
                            <MessageItem
                                key={`${message.id}-${index}`}
                                message={message}
                                messageIndex={index}
                                showReasoning={showReasoning}
                                showChainOfThought={showChainOfThought}
                                showTools={showTools}
                                showSources={showSources}
                                showArtifacts={showArtifacts}
                                showConfirmation={showConfirmation}
                                sources={sources}
                                checkpointIds={checkpointIds}
                                checkpointMessageIndices={
                                    checkpointMessageIndices
                                }
                                onCreateCheckpoint={handleCreateCheckpoint}
                                onRestoreCheckpoint={handleRestoreCheckpoint}
                                onApproveConfirmation={approveConfirmation}
                                onRejectConfirmation={rejectConfirmation}
                            />
                        ))}

                        {shouldRenderLoadingMessage && (
                            <Message from="assistant">
                                <MessageContent>
                                    {hasStreamingChainOfThought && (
                                        <AgentChainOfThought
                                            steps={streamingReasoningSteps}
                                            isStreaming={true}
                                        />
                                    )}

                                    {shouldShowStreamingReasoningFallback && (
                                        <AgentReasoning
                                            reasoning={streamingReasoning}
                                            isStreaming={true}
                                        />
                                    )}

                                    {streamingContent ? (
                                        <MessageResponse>
                                            {streamingContent}
                                        </MessageResponse>
                                    ) : (
                                        <div className="flex items-center gap-2 text-muted-foreground">
                                            <Loader size={16} />
                                            <span className="text-sm">
                                                Thinking...
                                            </span>
                                        </div>
                                    )}

                                    {showTools &&
                                        toolInvocations.length > 0 && (
                                            <AgentTools
                                                tools={toolInvocations}
                                            />
                                        )}
                                </MessageContent>
                            </Message>
                        )}
                    </>
                )}
            </ConversationContent>
            <ConversationScrollButton />
        </Conversation>
    )
}
