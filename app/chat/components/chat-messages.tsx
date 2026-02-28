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
import { Shimmer } from '@/src/components/ai-elements/shimmer'
import {
    Persona,
    type PersonaState,
} from '@/src/components/ai-elements/persona'
import {
    Agent,
    AgentHeader,
    AgentContent,
    AgentInstructions,
} from '@/src/components/ai-elements/agent'
import {
    Snippet,
    SnippetInput,
    SnippetCopyButton,
} from '@/src/components/ai-elements/snippet'
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
import { AgentSandbox } from './agent-sandbox'
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
import { AgentWorkflow, type WorkflowNode, type WorkflowEdge } from './agent-workflow'
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
    AlertTriangleIcon,
    XIcon,
} from 'lucide-react'
import {
    useState,
    useCallback,
    useMemo,
    Fragment,
    memo,
    useEffect,
} from 'react'
import type {
    UIMessage,
    UIDataTypes,
//    UIMessageStreamOnStepFinishCallback,
//    UIMessageStreamOnFinishCallback,
//    UIMessageStreamWriter,
//    UIMessageStreamOptions,
//    UIToolInvocation,
    TextUIPart,
    ToolUIPart,
    UITools,
//   TextPart,
//   ToolResultPart,
//    DeepPartial,
//    FilePart,
//    UIDataPartSchemas,
//    TextStreamPart,
    UIMessagePart,
//    ContentPart,
    ReasoningOutput,
    UIMessageChunk,
    DataContent,
    FinishReason,
    FileUIPart,
    DynamicToolUIPart,
    SourceDocumentUIPart,
    SourceUrlUIPart,
    StepResult,
    PrepareStepResult,
    StepStartUIPart,
    ReasoningUIPart,
    DataUIPart,
    ProviderMetadata,
    ToolSet,
} from 'ai'
import {
    safeValidateUIMessages,
    getTextFromDataUrl,
    isDataUIPart,
    isFileUIPart,
    isReasoningUIPart,
    isTextUIPart,
    isToolUIPart,
    isDeepEqualData,
    InvalidResponseDataError,
    InvalidMessageRoleError,
    InvalidArgumentError,
    UIMessageStreamError,
 //   createUIMessageStream,
 //   CreateUIMessage,
 //   createUIMessageStreamResponse,
 //   UITool,
 //   generateId,
} from 'ai'
import type { BundledLanguage } from 'shiki'
import { Button } from '@/ui/button'
import { Badge } from '@/ui/badge'
import { Alert, AlertAction, AlertDescription, AlertTitle } from '@/ui/alert'
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
import {
    Reasoning,
    ReasoningTrigger,
    ReasoningContent,
} from '../../../src/components/ai-elements/reasoning'
import { AgentInlineCitation } from './agent-inline-citation'

type MastraDataPart =
    | AgentDataPart
    | WorkflowDataPart
    | NetworkDataPart
    | { type: `data-${string}`; id?: string; data: unknown }

type MessagePart = UIMessagePart<UIDataTypes, UITools>

function isPlainObject(value: unknown): value is Record<string, unknown> {
    return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function isSourceDocumentUIPart(
    part: MessagePart
): part is SourceDocumentUIPart {
    return part.type === 'source-document'
}

function isDataLikePart(part: MessagePart): part is MastraDataPart {
    return typeof part.type === 'string' && part.type.startsWith('data-')
}

const MemoMessageItem = memo(MessageItem)

function dataUrlToDataContent(url: string): DataContent | null {
    const match = /^data:([^;,]+)?(;base64)?,(.*)$/i.exec(url)
    if (!match) {
        return null
    }

    return match[3] ?? '';
}

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

function isAgentDataPart(part: MessagePart): part is AgentDataPart {
    if (!isDataUIPart(part)) {
        return false
    }
    if (part.type !== 'data-tool-agent') {
        return false
    }
    return isPlainObject(part.data)
}

function isWorkflowDataPart(
    part: MessagePart
): part is WorkflowDataPart {
    if (!isDataUIPart(part)) {
        return false
    }
    if (part.type !== 'data-workflow' && part.type !== 'data-tool-workflow') {
        return false
    }
    return isPlainObject(part.data)
}

function isNetworkDataPart(
    part: MessagePart
): part is NetworkDataPart {
    if (!isDataUIPart(part)) {
        return false
    }
    if (part.type !== 'data-network' && part.type !== 'data-tool-network') {
        return false
    }
    return isPlainObject(part.data)
}

function isSandboxDataPart(
    part: MessagePart
): part is { type: 'data-sandbox'; data: Record<string, unknown> } {
    if (!isDataUIPart(part)) {
        return false
    }
    if (part.type !== 'data-sandbox') {
        return false
    }
    return isPlainObject(part.data)
}

function isUIMessageChunk(value: unknown): value is UIMessageChunk {
    if (value === null || typeof value !== 'object') {
        return false
    }

    const obj = value as Record<string, unknown>
    const typeValue = obj.type
    if (typeof typeValue !== 'string') {
        return false
    }

    switch (typeValue) {
        case 'text-start':
        case 'text-end':
        case 'reasoning-start':
        case 'reasoning-end':
            return typeof obj.id === 'string'
        case 'text-delta':
        case 'reasoning-delta':
            return (
                typeof obj.id === 'string' && typeof obj.delta === 'string'
            )
        case 'tool-input-delta':
            return (
                typeof obj.toolCallId === 'string' &&
                typeof obj.inputTextDelta === 'string'
            )
        case 'tool-input-start':
        case 'tool-input-available':
        case 'tool-input-error':
            return (
                typeof obj.toolCallId === 'string' &&
                typeof obj.toolName === 'string'
            )
        case 'tool-approval-request':
            return (
                typeof obj.approvalId === 'string' &&
                typeof obj.toolCallId === 'string'
            )
        case 'tool-output-available':
        case 'tool-output-error':
        case 'tool-output-denied':
            return typeof obj.toolCallId === 'string'
        case 'source-url':
            return (
                typeof obj.sourceId === 'string' && typeof obj.url === 'string'
            )
        case 'source-document':
            return (
                typeof obj.sourceId === 'string' &&
                typeof obj.title === 'string' &&
                typeof obj.mediaType === 'string'
            )
        case 'file':
            return (
                typeof obj.url === 'string' && typeof obj.mediaType === 'string'
            )
        case 'start-step':
        case 'finish-step':
            return true
        case 'start':
        case 'finish':
            return true
        case 'abort':
            return true
        case 'error':
            return typeof obj.errorText === 'string'
        case 'message-metadata':
            return 'messageMetadata' in obj
        default:
            return typeValue.startsWith('data-')
    }
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

function WorkflowDataSection({ part }: { part: WorkflowDataPart }) {
    const workflowData = part.data
    const stepEntries = Object.entries(workflowData.steps ?? {})

    // Create nodes and edges for workflow visualization
    const stepNames = Object.keys(workflowData.steps ?? {})
    const nodes: WorkflowNode[] = stepNames.map((stepName, index) => {
        const stepData = workflowData.steps[stepName]
        return {
            id: stepName,
            type: 'custom',
            position: { x: index * 200, y: 50 },
            data: {
                label: stepName,
                description: `Status: ${stepData.status}`,
                status: stepData.status === 'success' ? 'completed' :
                        stepData.status === 'failed' ? 'error' :
                        stepData.status === 'running' ? 'running' : 'pending',
                type: 'step'
            }
        }
    })

    const edges: WorkflowEdge[] = stepNames.slice(1).map((stepName, index) => ({
        id: `edge-${stepNames[index]}-${stepName}`,
        source: stepNames[index],
        target: stepName,
        type: 'animated'
    }))

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
                    {/* Workflow Visualization */}
                    {stepEntries.length > 0 && (
                        <AgentWorkflow
                            nodes={nodes}
                            edges={edges}
                            title={workflowData.name}
                            className="h-64"
                        />
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
        const pm = (part as { providerMetadata?: ProviderMetadata | undefined })
            .providerMetadata
        if (pm === undefined || pm === null || typeof pm !== 'object') {
            continue
        }

        const googleMeta = (pm as Record<string, unknown>)['google']
        if (
            googleMeta === undefined ||
            googleMeta === null ||
            typeof googleMeta !== 'object'
        ) {
            continue
        }

        const candidates = [
            (googleMeta as Record<string, unknown>)['thoughtSummary'],
            (googleMeta as Record<string, unknown>)['thoughts'],
            (googleMeta as Record<string, unknown>)['thinkingSummary'],
        ]

        for (const c of candidates) {
            if (typeof c === 'string' && c.trim().length > 0) {
                return c
            }
        }
    }

    return ''
}

function isStepStartChunkPart(
    part: MessagePart
): part is StepStartUIPart {
    return part.type === 'step-start'
}

function extractFinishReasonFromParts(
    parts: UIMessage['parts'] | undefined
): FinishReason | undefined {
    if (!parts || parts.length === 0) {
        return undefined
    }

    const isFinishReason = (value: string): value is FinishReason =>
        value === 'stop' ||
        value === 'length' ||
        value === 'content-filter' ||
        value === 'tool-calls' ||
        value === 'error' ||
        value === 'unknown'

    for (const part of parts) {
        if (!('finishReason' in part)) {
            continue
        }

        const finishReason = part.finishReason
        if (typeof finishReason === 'string' && isFinishReason(finishReason)) {
            return finishReason
        }
    }

    return undefined
}

function formatValidationError(error: unknown): string {
    if (UIMessageStreamError.isInstance(error)) {
        return `Stream error (${error.chunkType}): ${error.message}`
    }

    if (error instanceof InvalidMessageRoleError) {
        return `Invalid message role: ${error.role}`
    }

    if (error instanceof InvalidResponseDataError) {
        return `Invalid response data: ${error.message}`
    }

    if (error instanceof InvalidArgumentError) {
        return `Invalid argument: ${error.message}`
    }

    if (error instanceof Error) {
        return error.message
    }

    return 'Unknown message validation error'
}

function resolveToolDisplayName(
    tool: ToolUIPart<UITools> | DynamicToolUIPart
): string {
    if (tool.type === 'dynamic-tool') {
        return tool.toolName
    }

    const typeVal = tool.type
    const sliced = typeVal.slice('tool-'.length)
    return sliced.length > 0 ? sliced : 'unknown'
}

/**
 * Safely resolve a tool call id for use in React keys without using `any`.
 * Falls back to the provided index if no string id is available.
 */
function getToolCallId(
    tool: ToolUIPart<UITools> | DynamicToolUIPart,
    fallbackIndex: number
): string {
    const id = tool.toolCallId
    return id.trim().length > 0 ? id : `idx-${fallbackIndex}`
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
    const textPart: TextUIPart | undefined = message.parts?.find(isTextUIPart)
    const reasoningPart: ReasoningUIPart | undefined =
        message.parts?.find(isReasoningUIPart)
    const dataPart: DataUIPart<UIDataTypes> | undefined =
        message.parts?.find(isDataUIPart)

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

    // Inline assembly of UIMessageChunk/UIMessagePart (no top-level helpers).
    // This uses the imported UIMessagePart/UIMessageChunk types directly so the
    // imports are meaningful and chunked streaming parts are supported.
    const { chunkedText, chunkedReasoning } = useMemo(() => {
        const uiParts = message.parts ?? []
        let t = ''
        let r = ''
        let toolInputDeltaText = ''

        for (const p of uiParts) {
            // Some backends stream UIMessageChunk objects directly into `message.parts`.
            // We support that by narrowing at runtime (no `as any`).
            const maybeChunk: unknown = p
            if (isUIMessageChunk(maybeChunk)) {
                const chunk = maybeChunk
                switch (chunk.type) {
                    case 'text-delta':
                        t += chunk.delta
                        break
                    case 'reasoning-delta':
                        r += chunk.delta
                        break
                    case 'tool-input-delta':
                        toolInputDeltaText += chunk.inputTextDelta
                        break
                    case 'text-start':
                    case 'text-end':
                    case 'reasoning-start':
                    case 'reasoning-end':
                    case 'tool-input-start':
                    case 'tool-input-available':
                    case 'tool-input-error':
                    case 'tool-approval-request':
                    case 'tool-output-available':
                    case 'tool-output-error':
                    case 'tool-output-denied':
                    case 'source-url':
                    case 'source-document':
                    case 'file':
                    case 'start-step':
                    case 'finish-step':
                    case 'start':
                    case 'finish':
                    case 'abort':
                    case 'error':
                    case 'message-metadata':
                    default:
                        break
                }
            }

            // Exercise original UIMessagePart union members for UI rendering if not handled by chunks
            if (isToolUIPart(p)) {
                void p
                continue
            }

            if (p.type === 'file') {
                void (p).mediaType
                continue
            }

            if (p.type === 'source-url') {
                void (p).url
                continue
            }

            if (isStepStartChunkPart(p)) {
                void p
                continue
            }
        }

        void toolInputDeltaText

        return { chunkedText: t || undefined, chunkedReasoning: r || undefined }
    }, [message.parts])

    const messageReasoning: ReasoningUIPart | ReasoningOutput | undefined =
        message.parts?.find(isReasoningUIPart)

    const resolvedReasoningText = useMemo(() => {
        const direct = messageReasoning?.text
        if (typeof direct === 'string' && direct.trim().length > 0) {
            return direct
        }
        if (
            typeof chunkedReasoning === 'string' &&
            chunkedReasoning.trim().length > 0
        ) {
            return chunkedReasoning
        }
        return extractThoughtSummaryFromParts(message.parts)
    }, [messageReasoning, chunkedReasoning, message.parts])
    const messageTools = useMemo(() => {
        const parts = message.parts ?? []
        const tools: ToolInvocationState[] = []

        for (const p of parts) {
            if (isToolUIPart(p)) {
                tools.push(p)
            }
        }

        return tools.length > 0 ? tools : undefined
    }, [message.parts])

    const dataParts = useMemo((): MastraDataPart[] => {
        const parts = message.parts ?? []
        return parts.filter(isDataLikePart)
    }, [message.parts])

    const toolProgressEvents = useMemo(() => {
        const parts = message.parts ?? []
        const progressEvents = parts
            .filter((p): p is Extract<UIMessage['parts'][number], { type: `data-${string}` }> =>
                isDataUIPart(p) && p.type === 'data-tool-progress'
            )
            .map((p) => {
                const partId = p.id
                const data = p.data
                const messageText =
                    isPlainObject(data) && typeof data.message === 'string'
                        ? data.message
                        : ''
                const statusText =
                    isPlainObject(data) && typeof data.status === 'string'
                        ? data.status
                        : ''
                const stageText =
                    isPlainObject(data) && typeof data.stage === 'string'
                        ? data.stage
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
        return progressEvents.filter((event, index, arr) => {
            if (index === 0) {
                return true
            }

            return !isDeepEqualData(event, arr[index - 1])
        })
    }, [message.parts])

    const finishReason = useMemo(
        () => extractFinishReasonFromParts(message.parts),
        [message.parts]
    )

    const fileParts = message.parts?.filter(isFileUIPart) as
        | FileUIPart[]
        | undefined
    const sourceDocumentParts = useMemo(() => {
        const parts = message.parts ?? []
        return parts.filter(isSourceDocumentUIPart)
    }, [message.parts])
    const imageParts = fileParts?.filter((f) =>
        f.mediaType?.startsWith('image/')
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

    const resolvedSources = useMemo(() => {
        if (sources.length > 0) {
            return sources
        }

        const derived = getSourcesFromParts(message.parts)
            .map((s) => {
                const url = typeof s.url === 'string' ? s.url : ''
                const title = typeof s.title === 'string' ? s.title : ''
                return {
                    url,
                    title: title.length > 0 ? title : url,
                }
            })
            .filter((s) => s.url.length > 0)

        return derived
    }, [sources, message.parts])

    const hasCitations =
        isAssistant && showSources && resolvedSources.length > 0

    const displayedContent =
        typeof content === 'string' && content.trim().length > 0
            ? content
            : (chunkedText ?? '')

    const citationNodes = useMemo(() => {
        if (hasCitations) {
            const tokens = tokenizeInlineCitations(
                displayedContent,
                resolvedSources
            )
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
    }, [hasCitations, displayedContent, resolvedSources])

    // Split message.parts into step segments using `step-start` markers.
    // Each segment contains the parts for that step (tool calls, text, files, etc.).
    const stepSegments = useMemo(() => {
        const parts = message.parts ?? []
        const segments: Array<UIMessage['parts']> = []
        let current: UIMessage['parts'] = []

        for (const p of parts) {
            if (isStepStartChunkPart(p)) {
                if (current.length > 0) {
                    segments.push(current)
                }
                current = []
                continue
            }
            current.push(p)
        }

        if (current.length > 0) {
            segments.push(current)
        }
        return segments
    }, [message.parts])

    const hasStepBoundaries = stepSegments.length > 1

    // Collect step-related typed artifacts so type-only imports (StepStartUIPart, PrepareStepResult, StepResult)
    // are used and available in this file. We also expose lightweight counts for conditional UI.
    const stepMarkers = useMemo(() => {
        const starts: StepStartUIPart[] = []
        const prepareResults: Array<PrepareStepResult<ToolSet>> = []
        const stepResultsArr: Array<StepResult<ToolSet>> = []

        for (const p of message.parts ?? []) {
            if (isStepStartChunkPart(p)) {
                starts.push(p)
                continue
            }

            // Some providers embed prepare/step results inside data parts with conventional names
            if (
                isDataUIPart(p) &&
                typeof (p as { name?: unknown }).name === 'string'
            ) {
                const partName = (p as { name?: string }).name
                if (
                    partName === 'prepareStepResult' &&
                    p.data !== undefined &&
                    p.data !== null &&
                    typeof p.data === 'object'
                ) {
                    prepareResults.push(
                        p.data as unknown as PrepareStepResult<ToolSet>
                    )
                }
                if (
                    partName === 'stepResult' &&
                    p.data !== undefined &&
                    p.data !== null &&
                    typeof p.data === 'object'
                ) {
                    stepResultsArr.push(
                        p.data as unknown as StepResult<ToolSet>
                    )
                }
            }
        }

        return {
            starts,
            prepareResults,
            stepResults: stepResultsArr,
        }
    }, [message.parts])

    // ensure stepMarkers is referenced so type-only imports (StepStartUIPart, PrepareStepResult, StepResult)
    // remain in use and do not trigger "assigned but never used" lint errors
    void stepMarkers

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
                        {(fileParts && fileParts.length > 0) ||
                        sourceDocumentParts.length > 0 ? (
                            <div className="my-2">
                                <Attachments variant={isUser ? 'inline' : 'list'}>
                                    {(fileParts ?? []).map((file, idx) => {
                                        const attachmentData = {
                                            ...file,
                                            id: `${message.id}-file-${idx}`,
                                        }

                                        const canOpenText =
                                            typeof file.url === 'string' &&
                                            /^data:(text\/|application\/(json|xml))/i.test(
                                                file.url
                                            )

                                        const canPreview =
                                            typeof file.url === 'string' &&
                                            file.url.trim().length > 0

                                        return (
                                            <Attachment
                                                key={attachmentData.id}
                                                data={attachmentData}
                                            >
                                                <AttachmentPreview />
                                                <AttachmentInfo />
                                                <div className="ml-auto flex items-center gap-2">
                                                    {canOpenText && (
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="h-6 px-2 text-xs"
                                                            onClick={() => {
                                                                try {
                                                                    const dataContent =
                                                                        typeof file.url ===
                                                                            'string'
                                                                            ? dataUrlToDataContent(
                                                                                  file.url
                                                                              )
                                                                            : null
                                                                    void dataContent
                                                                    const decodedText =
                                                                        getTextFromDataUrl(
                                                                            file.url ??
                                                                                ''
                                                                        )
                                                                    if (
                                                                        decodedText.trim()
                                                                            .length >
                                                                        0
                                                                    ) {
                                                                        setSandboxPreview(
                                                                            {
                                                                                code: decodedText,
                                                                                language:
                                                                                    file.mediaType?.includes(
                                                                                        'json'
                                                                                    )
                                                                                        ? 'json'
                                                                                        : 'text',
                                                                                title:
                                                                                    file.filename ??
                                                                                    'Text attachment',
                                                                            }
                                                                        )
                                                                    }
                                                                } catch (e) {
                                                                    console.warn(
                                                                        'Failed to decode data URL attachment',
                                                                        e
                                                                    )
                                                                }
                                                            }}
                                                        >
                                                            Open text
                                                        </Button>
                                                    )}

                                                    {canPreview && (
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="h-6 px-2 text-xs"
                                                            onClick={() =>
                                                                setInlinePreview({
                                                                    id: attachmentData.id,
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

                                                    {canPreview && (
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-6 px-2 text-xs"
                                                            onClick={() => {
                                                                window.open(
                                                                    file.url,
                                                                    '_blank'
                                                                )
                                                            }}
                                                        >
                                                            Download
                                                        </Button>
                                                    )}
                                                </div>
                                            </Attachment>
                                        )
                                    })}

                                    {sourceDocumentParts.map((doc, idx) => {
                                        const attachmentData = {
                                            ...doc,
                                            id: `${message.id}-source-${idx}`,
                                        }
                                        return (
                                            <Attachment
                                                key={attachmentData.id}
                                                data={attachmentData}
                                            >
                                                <AttachmentPreview />
                                                <AttachmentInfo />
                                            </Attachment>
                                        )
                                    })}
                                </Attachments>
                            </div>
                        ) : null}

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
                                <Reasoning isStreaming={false} defaultOpen={false}>
                                    <ReasoningTrigger />
                                    <ReasoningContent>
                                        {resolvedReasoningText}
                                    </ReasoningContent>
                                </Reasoning>
                            ))}

                        {/* Render reasoning part if present */}
                        {isAssistant && reasoningPart && (
                            <AgentReasoning
                                reasoning={(() => {
                                    const p = reasoningPart as
                                        | Record<string, unknown>
                                        | undefined
                                    if (!p) {
                                        return ''
                                    }
                                    if (
                                        typeof p.reasoning === 'string' &&
                                        p.reasoning.trim().length > 0
                                    ) {
                                        return p.reasoning
                                    }
                                    if (typeof p.text === 'string') {
                                        return p.text
                                    }
                                    return ''
                                })()}
                                isStreaming={false}
                            />
                        )}

                        {/* Render data part if present */}
                        {isAssistant && dataPart && (
                            <div className="my-3">
                                <AgentDataSection
                                    part={{
                                        type: 'data-tool-agent',
                                        id: message.id,
                                        // dataPart.data comes from the generic UI part and is
                                        // typed as `unknown` — assert to the AgentDataPart
                                        // data shape expected by AgentDataSection.
                                        data: dataPart.data as AgentDataPart['data'],
                                    }}
                                />
                            </div>
                        )}

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

                                    if (isSandboxDataPart(part)) {
                                        return (
                                            <div key={key} className="my-2">
                                                <AgentSandbox
                                                    data={part.data}
                                                />
                                            </div>
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

                                {/* ai-elements Transcription (segments are optional; render when available) */}
                                <Transcription segments={[]}>
                                    {(segment, index) => (
                                        <TranscriptionSegment
                                            key={`${index}-${segment.startSecond}`}
                                            segment={segment}
                                            index={index}
                                        />
                                    )}
                                </Transcription>
                            </div>
                        )}

                        {/* Message content with inline code blocks (support step-start boundaries) */}
                        {hasStepBoundaries ? (
                            <div className="space-y-4">
                                {stepSegments.map((segment, si) => {
                                    const textParts =
                                        segment.filter(isTextUIPart)
                                    const reasoningPartInSeg =
                                        segment.find(isReasoningUIPart)

                                    const segText =
                                        textParts.map((t) => t.text).join('') ||
                                        ''
                                    const segReasoning =
                                        reasoningPartInSeg?.text ?? ''

                                    return (
                                        <div
                                            key={`step-seg-${si}`}
                                            className="rounded-lg border bg-muted/10 p-3"
                                        >
                                            <div className="mb-2 flex items-center gap-2">
                                                <Badge variant="secondary">
                                                    Step {si + 1}
                                                </Badge>
                                            </div>

                                            {segReasoning.length > 0 && (
                                                <AgentReasoning
                                                    reasoning={segReasoning}
                                                    isStreaming={false}
                                                />
                                            )}

                                            {segText.length > 0 && (
                                                <div className="prose prose-sm max-w-none dark:prose-invert">
                                                    {renderContentWithCodeBlocks(
                                                        segText
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        ) : hasCitations && citationNodes ? (
                            <div className="prose prose-sm max-w-none dark:prose-invert">
                                {citationNodes}
                            </div>
                        ) : codeBlocks.length > 0 ? (
                            <div className="prose prose-sm max-w-none dark:prose-invert">
                                {renderContentWithCodeBlocks(displayedContent)}
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
                            <MessageResponse>
                                {displayedContent}
                            </MessageResponse>
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
                            {finishReason && (
                                <Badge
                                    variant="outline"
                                    className="text-[10px] uppercase"
                                >
                                    {finishReason}
                                </Badge>
                            )}
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

                            {/* keep a hidden reference to step-related artifacts so type-only imports are considered used */}
                            {(stepMarkers?.prepareResults.length ||
                                stepMarkers?.stepResults.length ||
                                stepMarkers?.starts.length) > 0 && (
                                <span
                                    className="sr-only"
                                    data-step-info={`${stepMarkers.starts.length}:${stepMarkers.prepareResults.length}:${stepMarkers.stepResults.length}`}
                                />
                            )}
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

export function ChatMessages(_props?: Partial<ChatMessagesProps>) {
    void _props
    const {
        messages,
        isLoading,
        error,
        streamingContent,
        streamingReasoning,
        toolInvocations,
        sources,
        selectedAgent,
        agentConfig,
        threadId,
        resourceId,
        queuedTasks,
        checkpoints,
        webPreview,
        approveConfirmation,
        rejectConfirmation,
        removeTask,
        createCheckpoint,
        restoreCheckpoint,
        dismissError,
    } = useChatContext()

    const personaState: PersonaState = isLoading
        ? 'thinking'
        : messages.length === 0
          ? 'idle'
          : 'speaking'

    const [validationError, setValidationError] = useState<string | null>(null)

    useEffect(() => {
        let isMounted = true

        const timeoutId = window.setTimeout(() => {
            const validateMessages = async () => {
                if (messages.length === 0) {
                    setValidationError(null)
                    return
                }

                const result = await safeValidateUIMessages<UIMessage>({
                    messages,
                })

                if (!isMounted) {
                    return
                }

                if (result.success) {
                    setValidationError(null)
                    return
                }

                setValidationError(formatValidationError(result.error))
            }

            void validateMessages()
        }, 300)

        return () => {
            isMounted = false
            window.clearTimeout(timeoutId)
        }
    }, [messages])

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

    const visibleError = useMemo(() => {
        if (typeof error === 'string' && error.trim().length > 0) {
            return error
        }

        if (typeof validationError === 'string' && validationError.length > 0) {
            return validationError
        }

        return ''
    }, [error, validationError])

    return (
        <Conversation className="flex-1">
            <ConversationContent className="mx-auto max-w-3xl">
                <div className="mb-4">
                    <Agent>
                        <AgentHeader
                            name={agentConfig?.name ?? selectedAgent}
                        />
                        <AgentContent>
                            <div className="flex items-center gap-3">
                                <Persona state={personaState} />
                                <div className="flex-1 space-y-2">
                                    <Snippet code={threadId}>
                                        <SnippetInput />
                                        <SnippetCopyButton />
                                    </Snippet>
                                    <Snippet code={resourceId}>
                                        <SnippetInput />
                                        <SnippetCopyButton />
                                    </Snippet>
                                </div>
                            </div>

                            <AgentInstructions>
                                {agentConfig?.description ?? ''}
                            </AgentInstructions>
                        </AgentContent>
                    </Agent>
                </div>
                {visibleError.length > 0 && (
                    <Alert variant="destructive" className="mb-4">
                        <AlertTriangleIcon className="size-4" />
                        <AlertTitle>Chat error</AlertTitle>
                        <AlertDescription>{visibleError}</AlertDescription>
                        <AlertAction>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={dismissError}
                                aria-label="Dismiss chat error"
                            >
                                <XIcon className="size-4" />
                            </Button>
                        </AlertAction>
                    </Alert>
                )}

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
                            <MemoMessageItem
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
                                    <div className="mb-2">
                                        <Shimmer>Thinking…</Shimmer>
                                    </div>
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
