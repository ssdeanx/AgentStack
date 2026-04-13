'use client'

import type { UIMessage } from 'ai'
import {
    getToolName,
    isFileUIPart,
    isReasoningUIPart,
    isTextUIPart,
    isToolUIPart,
} from 'ai'

import { useMemo, type ComponentProps } from 'react'

import { useChatContext } from '../providers/chat-context-hooks'
import type { QueuedTask, ToolInvocationState } from '../providers/chat-context'
import {
    Attachment,
    AttachmentInfo,
    AttachmentPreview,
    Attachments,
    type AttachmentData,
} from '../../../src/components/ai-elements/attachments'
import {
    Agent,
    AgentContent,
    AgentHeader,
    AgentInstructions,
} from '../../../src/components/ai-elements/agent'
import {
    Checkpoint as CheckpointCard,
    CheckpointIcon,
    CheckpointTrigger,
} from '../../../src/components/ai-elements/checkpoint'
import {
    Artifact,
    ArtifactAction,
    ArtifactActions,
    ArtifactContent,
    ArtifactDescription,
    ArtifactHeader,
    ArtifactTitle,
} from '../../../src/components/ai-elements/artifact'
import {
    CodeBlock,
} from '../../../src/components/ai-elements/code-block'
import {
    ChainOfThought,
    ChainOfThoughtContent,
    ChainOfThoughtHeader,
    ChainOfThoughtStep,
} from '../../../src/components/ai-elements/chain-of-thought'
import {
    Conversation,
    ConversationContent,
    ConversationEmptyState,
    ConversationScrollButton,
} from '../../../src/components/ai-elements/conversation'
import {
    Confirmation,
    ConfirmationAccepted,
    ConfirmationActions,
    ConfirmationRejected,
    ConfirmationRequest,
    ConfirmationTitle,
    ConfirmationAction,
} from '../../../src/components/ai-elements/confirmation'
import {
    Context,
    ContextCacheUsage,
    ContextContent,
    ContextContentBody,
    ContextContentFooter,
    ContextContentHeader,
    ContextInputUsage,
    ContextOutputUsage,
    ContextReasoningUsage,
    ContextTrigger,
} from '../../../src/components/ai-elements/context'
import {
    JSXPreview,
    JSXPreviewContent,
    JSXPreviewError,
} from '../../../src/components/ai-elements/jsx-preview'
import {
    Message,
    MessageAction,
    MessageActions,
    MessageContent,
} from '../../../src/components/ai-elements/message'
import {
    PackageInfo,
    PackageInfoContent,
    PackageInfoDependencies,
    PackageInfoDependency,
    PackageInfoDescription,
    PackageInfoHeader,
    PackageInfoName,
    PackageInfoVersion,
} from '../../../src/components/ai-elements/package-info'
import {
    Plan,
    PlanContent,
    PlanDescription,
    PlanHeader,
    PlanTitle,
    PlanTrigger,
} from '../../../src/components/ai-elements/plan'
import {
    Queue,
    QueueItemContent,
    QueueItemDescription,
    QueueItemIndicator,
    QueueSection,
    QueueSectionContent,
    QueueSectionLabel,
    QueueSectionTrigger,
} from '../../../src/components/ai-elements/queue'
import { Reasoning, ReasoningContent, ReasoningTrigger } from '../../../src/components/ai-elements/reasoning'
import {
    Sandbox,
    SandboxContent,
    SandboxHeader,
    SandboxTabContent,
    SandboxTabs,
    SandboxTabsBar,
    SandboxTabsList,
    SandboxTabsTrigger,
} from '../../../src/components/ai-elements/sandbox'
import {
    Snippet,
    SnippetCopyButton,
    SnippetInput,
    SnippetText,
} from '../../../src/components/ai-elements/snippet'
import { Shimmer } from '../../../src/components/ai-elements/shimmer'
import { Suggestion, Suggestions } from '../../../src/components/ai-elements/suggestion'
import { Source, Sources, SourcesContent, SourcesTrigger } from '../../../src/components/ai-elements/sources'
import {
    StackTrace,
    StackTraceActions,
    StackTraceContent,
    StackTraceCopyButton,
    StackTraceError,
    StackTraceErrorMessage,
    StackTraceErrorType,
    StackTraceFrames,
    StackTraceHeader,
} from '../../../src/components/ai-elements/stack-trace'
import {
    Tool,
    ToolContent,
    ToolHeader,
    ToolInput,
    ToolOutput,
} from '../../../src/components/ai-elements/tool'
import { Badge } from '../../../ui/badge'
import { CopyIcon, SparklesIcon } from 'lucide-react'

import { ChatInput } from './chat-input'

type TaskBadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline'

type CodeBlockLanguage = ComponentProps<typeof CodeBlock>['language']
type SandboxState = ComponentProps<typeof SandboxHeader>['state']

export type SelectedFileSnapshot = {
    content: string
    errorText: string | null
    isDirectory: boolean
    language: CodeBlockLanguage
    hasJsxPreview: boolean
    state: SandboxState
    stateLabel: string
}

interface CodeAgentChatProps {
    selectedPath: string
    selectedSource: 'workspace' | 'sandbox'
    selectedFile: SelectedFileSnapshot
}
type PlanStepItem = {
    description?: string
    id: string
    status: QueuedTask['status']
    title: string
}

type AttachmentItem = AttachmentData

/**
 * Extracts file attachments from the message stream.
 */
function getMessageAttachments(messages: UIMessage[]): AttachmentItem[] {
    const attachments: AttachmentItem[] = []

    for (const message of messages) {
        for (const [index, part] of message.parts.entries()) {
            if (!isFileUIPart(part)) {
                continue
            }

            attachments.push({
                ...part,
                id: `${message.id}-${index}`,
            })
        }
    }

    return attachments
}

/**
 * Returns a small set of steps derived from the current reasoning stream.
 */
function getReasoningSteps(
    reasoning: string
): Array<{ description?: string; id: string; label: string; status: 'complete' | 'active' | 'pending' }> {
    const lines = reasoning
        .split(/\n+/)
        .map((line) => line.trim())
        .filter(Boolean)

    return lines.slice(0, 5).map((line, index) => ({
        id: `reasoning-step-${index}`,
        label: line,
        description: index === 0 ? 'Current line of thought' : undefined,
        status: index === 0 ? 'active' : 'pending',
    }))
}

/**
 * Returns a concise subset of sources for the current conversation.
 */
function getSourceItems(sources: Array<{ title: string; url: string }>) {
    return sources.slice(0, 5)
}

/**
 * Returns contextual follow-up prompts for the current file.
 */
function getFollowUpSuggestions(
    selectedPath: string,
    selectedSource: 'workspace' | 'sandbox'
): string[] {
    return [
        `Summarize the important changes in ${selectedSource} ${selectedPath}`,
        `Explain the safest next edit for ${selectedPath}`,
        `Show me the relevant files and tools for ${selectedPath}`,
        `Draft a validation plan for the current ${selectedSource} file`,
    ]
}

/**
 * Produces a readable label for attachments.
 */
function getAttachmentLabel(data: AttachmentItem): string {
    if ('filename' in data && typeof data.filename === 'string' && data.filename.trim().length > 0) {
        return data.filename
    }

    if ('title' in data && typeof data.title === 'string' && data.title.trim().length > 0) {
        return data.title
    }

    return 'Attachment'
}

function looksLikeStackTrace(text: string): boolean {
    return /\n\s*at\s+.+\(.+:\d+:\d+\)|\b(?:Error|Exception):\s/.test(text)
}

/**
 * Returns a renderable inline tool card for a tool invocation.
 */
function renderToolPart(tool: ToolInvocationState) {
    const toolName =
        tool.type === 'dynamic-tool'
            ? tool.toolName
                        : typeof tool.type === 'string' && tool.type.startsWith('tool-')
                            ? tool.type.slice('tool-'.length)
                            : getToolName(tool)

    const toolType =
        tool.type === 'dynamic-tool' ? (`tool-${toolName}` as const) : tool.type
    const hasOutput = tool.state === 'output-available' || tool.state === 'output-error'
    const toolInput = tool.input
    const toolOutput = tool.output
    const toolErrorText = tool.errorText

    return (
        <Tool key={tool.toolCallId} defaultOpen={false}>
            <ToolHeader title={toolName} type={toolType} state={tool.state} />
            <ToolContent>
                <ToolInput input={toolInput} />
                {hasOutput ? (
                    <ToolOutput
                        output={toolOutput}
                        errorText={typeof toolErrorText === 'string' ? toolErrorText : undefined}
                    />
                ) : null}
            </ToolContent>
        </Tool>
    )
}

/**
 * Returns the text content assembled from text parts in an AI SDK message.
 */
function getMessageText(message: UIMessage): string {
    return message.parts
        .filter(isTextUIPart)
        .map((part) => part.text)
        .filter(Boolean)
        .join('\n')
}

/**
 * Returns the reasoning content assembled from reasoning parts in a message.
 */
function getMessageReasoning(message: UIMessage): string {
    return message.parts
        .filter(isReasoningUIPart)
        .map((part) => part.text)
        .filter(Boolean)
        .join('\n')
}

/**
 * Returns the tool parts associated with a message.
 */
function getMessageTools(message: UIMessage) {
    return message.parts.filter(isToolUIPart)
}

/**
 * Groups queued tasks by status so the queue panel can show each stage clearly.
 */
function groupQueuedTasks(tasks: QueuedTask[]) {
    const order: Array<QueuedTask['status']> = [
        'running',
        'pending',
        'completed',
        'failed',
    ]

    return order.map((status) => ({
        status,
        tasks: tasks.filter((task) => task.status === status),
    }))
}

/**
 * Maps queued task states to badge variants that match their severity.
 */
function getTaskBadgeVariant(status: QueuedTask['status']): TaskBadgeVariant {
    switch (status) {
        case 'running':
            return 'secondary'
        case 'completed':
            return 'outline'
        case 'failed':
            return 'destructive'
        case 'pending':
        default:
            return 'secondary'
    }
}

/**
 * Produces a human readable label for queued task statuses.
 */
function getTaskStatusLabel(status: QueuedTask['status']): string {
    switch (status) {
        case 'running':
            return 'Running'
        case 'completed':
            return 'Completed'
        case 'failed':
            return 'Failed'
        case 'pending':
        default:
            return 'Pending'
    }
}

function MessageBody({
    message,
    isLatestAssistantMessage,
    isStreaming,
    streamingReasoning,
    onFollowUp,
}: {
    message: UIMessage
    isLatestAssistantMessage: boolean
    isStreaming: boolean
    streamingReasoning: string
    onFollowUp: () => void
}) {
    const text = getMessageText(message)
    const reasoning =
        getMessageReasoning(message) ||
        (isLatestAssistantMessage ? streamingReasoning : '')
    const tools = getMessageTools(message)

    return (
        <MessageContent>
            <div className="rounded-2xl border border-border/60 bg-card px-4 py-3 shadow-sm">
                <div className="mb-2 flex items-center justify-between gap-3">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                        {message.role}
                    </p>
                    {message.role === 'assistant' && (
                        <Badge className="font-normal" variant="secondary">
                            Agent response
                        </Badge>
                    )}
                </div>

                {reasoning ? (
                    <Reasoning
                        defaultOpen={true}
                        isStreaming={isStreaming && isLatestAssistantMessage}
                    >
                        <ReasoningTrigger />
                        <ReasoningContent>{reasoning}</ReasoningContent>
                    </Reasoning>
                ) : null}

                {text ? (
                    <div className="whitespace-pre-wrap text-sm leading-6">
                        {text}
                    </div>
                ) : null}

                {tools.length > 0 ? (
                    <div className="mt-3 space-y-2">
                        {tools.map((tool) => renderToolPart(tool))}
                    </div>
                ) : null}

                {message.role === 'assistant' ? (
                    <MessageActions className="mt-3">
                        <MessageAction
                            label="Follow up"
                            tooltip="Send a follow-up question about this response"
                            onClick={onFollowUp}
                        >
                            <SparklesIcon className="size-4" />
                        </MessageAction>
                    </MessageActions>
                ) : null}
            </div>
        </MessageContent>
    )
}

export function CodeAgentChat({
    selectedPath,
    selectedSource,
    selectedFile,
}: CodeAgentChatProps) {
    const {
        messages,
        queuedTasks,
        pendingConfirmations,
        checkpoints,
        sources,
        selectedAgent,
        selectedModel,
        usage,
        isLoading,
        streamingReasoning,
        toolInvocations,
        sendMessage,
        approveConfirmation,
        rejectConfirmation,
        restoreCheckpoint,
    } = useChatContext()

    const visibleMessages = useMemo<UIMessage[]>(
        () => messages.filter((message) => message.role !== 'system'),
        [messages]
    )

    const attachments = useMemo(
        () => getMessageAttachments(visibleMessages),
        [visibleMessages]
    )

    const reasoningSteps = useMemo(
        () => getReasoningSteps(streamingReasoning),
        [streamingReasoning]
    )

    const sourceItems = useMemo(
        () => getSourceItems(sources),
        [sources]
    )

    const followUpSuggestions = useMemo(
        () => getFollowUpSuggestions(selectedPath, selectedSource),
        [selectedPath, selectedSource]
    )

    const checkpointItems = useMemo(() => checkpoints.slice(-3).reverse(), [checkpoints])

    const contextUsage = usage ?? undefined

    const latestAssistantMessageId = useMemo(() => {
        for (let index = messages.length - 1; index >= 0; index -= 1) {
            const message = messages[index]
            if (message.role === 'assistant') {
                return message.id
            }
        }

        return null
    }, [messages])

    const taskGroups = useMemo(
        () => groupQueuedTasks(queuedTasks),
        [queuedTasks]
    )

    const plannedSteps = useMemo<PlanStepItem[]>(
        () =>
            queuedTasks.length > 0
                ? queuedTasks
                : [
                      {
                          id: 'inspect-file',
                          title: `Inspect ${selectedPath}`,
                          description: `Review the current ${selectedSource} file and collect the relevant context.`,
                          status: 'pending',
                      },
                      {
                          id: 'reason-about-change',
                          title: 'Summarize the next edit',
                          description:
                              'Use the live reasoning stream to decide the smallest safe change.',
                          status: 'pending',
                      },
                      {
                          id: 'apply-follow-up',
                          title: 'Apply the follow-up response',
                          description:
                              'Once the agent is ready, continue the conversation from the selected file.',
                          status: 'pending',
                      },
                  ],
        [queuedTasks, selectedPath, selectedSource]
    )

    const contextUsedTokens = usage?.totalTokens ?? 0

    return (
        <section className="flex h-full min-h-0 flex-col bg-background">
            <div className="border-b border-border px-4 py-4">
                <Agent className="rounded-2xl border border-border/60 bg-card/30 p-4 shadow-sm">
                    <AgentHeader
                        name={selectedAgent}
                        model={`${selectedModel.provider}/${selectedModel.name}`}
                    >
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <p className="text-muted-foreground text-xs uppercase tracking-[0.2em]">
                                    Code agent chat
                                </p>
                                <h3 className="text-lg font-semibold">
                                    {selectedAgent}
                                </h3>
                                <p className="text-muted-foreground text-sm">
                                    {selectedModel.provider}/{selectedModel.name}
                                </p>
                                <p className="mt-1 text-muted-foreground text-xs">
                                    {selectedSource} · {selectedPath}
                                </p>
                            </div>

                            <Badge variant="secondary" className="font-normal">
                                {messages.length} messages
                            </Badge>
                        </div>
                    </AgentHeader>

                    <AgentContent>
                        <AgentInstructions>
                            Use the live workspace and sandbox hooks to inspect the
                            selected file, explain edits, and propose file or folder
                            changes.
                        </AgentInstructions>

                        <div className="mt-3 flex flex-wrap gap-2">
                            <Badge variant="outline" className="font-normal">
                                {toolInvocations.length} tools
                            </Badge>
                            <Badge variant="outline" className="font-normal">
                                {queuedTasks.length} queued tasks
                            </Badge>
                            <Badge variant="outline" className="font-normal">
                                {pendingConfirmations.length} confirmations
                            </Badge>
                            <Badge variant="outline" className="font-normal">
                                {checkpointItems.length} checkpoints
                            </Badge>
                        </div>

                        <div className="mt-3 grid gap-3 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
                            {selectedModel.contextWindow !== undefined && (
                                <Context
                                    maxTokens={selectedModel.contextWindow}
                                    usage={contextUsage}
                                    modelId={selectedModel.id}
                                    usedTokens={contextUsedTokens}
                                >
                                    <ContextTrigger className="w-full" />
                                    <ContextContent>
                                        <ContextContentHeader>
                                            Context usage
                                        </ContextContentHeader>
                                        <ContextContentBody>
                                            <ContextInputUsage />
                                            <ContextOutputUsage />
                                            <ContextReasoningUsage />
                                        </ContextContentBody>
                                        <ContextContentFooter>
                                            <ContextCacheUsage />
                                        </ContextContentFooter>
                                    </ContextContent>
                                </Context>
                            )}

                            <div className="rounded-2xl border border-border/60 bg-background/80 p-3">
                                <div className="mb-2 flex items-center justify-between gap-3 text-xs text-muted-foreground">
                                    <span>Working set</span>
                                    <Badge variant="outline" className="font-normal">
                                        {attachments.length} attachments
                                    </Badge>
                                </div>
                                {attachments.length === 0 ? (
                                    <div className="rounded-lg border border-dashed border-border/60 px-3 py-4 text-muted-foreground text-xs">
                                        No file attachments are currently in the conversation.
                                    </div>
                                ) : (
                                    <Attachments variant="list" className="space-y-2">
                                        {attachments.map((attachment) => (
                                            <Attachment
                                                key={attachment.id}
                                                data={attachment}
                                                className="rounded-xl border border-border/60 bg-card/60 p-2"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <AttachmentPreview />
                                                    <div className="min-w-0 flex-1">
                                                        <AttachmentInfo showMediaType />
                                                        <p className="truncate text-xs text-muted-foreground">
                                                            {getAttachmentLabel(attachment)}
                                                        </p>
                                                    </div>
                                                </div>
                                            </Attachment>
                                        ))}
                                    </Attachments>
                                )}
                            </div>
                        </div>

                        <div className="mt-4 grid gap-3 xl:grid-cols-2">
                            <div className="rounded-2xl border border-border/60 bg-card/30 p-4">
                                <div className="mb-3 flex items-center justify-between gap-3">
                                    <div>
                                        <p className="text-muted-foreground text-xs uppercase tracking-[0.2em]">
                                            Reasoning
                                        </p>
                                        <h4 className="font-semibold text-base">
                                            Live chain of thought
                                        </h4>
                                    </div>
                                    {isLoading ? (
                                        <Shimmer as="span" className="text-xs text-muted-foreground" duration={1.8}>
                                            Thinking through the current file
                                        </Shimmer>
                                    ) : null}
                                </div>

                                {reasoningSteps.length > 0 ? (
                                    <ChainOfThought
                                        defaultOpen={true}
                                        className="rounded-xl border border-border/60 bg-background/70 p-3"
                                    >
                                        <ChainOfThoughtHeader>
                                            Current reasoning path
                                        </ChainOfThoughtHeader>
                                        <ChainOfThoughtContent>
                                            {reasoningSteps.map((step) => (
                                                <ChainOfThoughtStep
                                                    key={step.id}
                                                    label={step.label}
                                                    description={step.description}
                                                    status={step.status}
                                                />
                                            ))}
                                            {streamingReasoning.trim().length > 0 ? (
                                                <div className="mt-3 whitespace-pre-wrap rounded-lg border border-dashed border-border/60 px-3 py-2 text-sm leading-6 text-foreground">
                                                    {streamingReasoning}
                                                </div>
                                            ) : null}
                                        </ChainOfThoughtContent>
                                    </ChainOfThought>
                                ) : (
                                    <div className="rounded-xl border border-dashed border-border/60 px-4 py-5 text-muted-foreground text-sm">
                                        No reasoning stream yet. Ask the agent to inspect the file or propose a change.
                                    </div>
                                )}
                            </div>

                            <Sources className="rounded-2xl border border-border/60 bg-card/30 p-4">
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <p className="text-muted-foreground text-xs uppercase tracking-[0.2em]">
                                            Sources
                                        </p>
                                        <h4 className="font-semibold text-base">
                                            Referenced files and citations
                                        </h4>
                                    </div>
                                    <Badge variant="secondary" className="font-normal">
                                        {sourceItems.length}
                                    </Badge>
                                </div>

                                <SourcesTrigger count={sourceItems.length} className="mt-3" />
                                <SourcesContent className="mt-3 space-y-2">
                                    {sourceItems.length === 0 ? (
                                        <div className="rounded-lg border border-dashed border-border/60 px-3 py-4 text-muted-foreground text-xs">
                                            No citations have been surfaced yet.
                                        </div>
                                    ) : (
                                        sourceItems.map((sourceItem) => (
                                            <Source
                                                key={`${sourceItem.url}-${sourceItem.title}`}
                                                href={sourceItem.url}
                                                title={sourceItem.title}
                                                className="block rounded-lg border border-border/60 bg-background px-3 py-2 text-sm"
                                            >
                                                {sourceItem.title}
                                            </Source>
                                        ))
                                    )}
                                </SourcesContent>
                            </Sources>
                        </div>

                        <div className="mt-4 grid gap-3 xl:grid-cols-2">
                            <Plan
                                defaultOpen={queuedTasks.length > 0}
                                isStreaming={isLoading && queuedTasks.length > 0}
                            >
                                <PlanHeader>
                                    <div className="space-y-1">
                                        <PlanTitle>Execution plan</PlanTitle>
                                        <PlanDescription>
                                            A compact view of the current run,
                                            derived from the live task queue and the
                                            active file.
                                        </PlanDescription>
                                    </div>
                                    <PlanTrigger />
                                </PlanHeader>

                                <PlanContent>
                                    <ol className="space-y-2">
                                        {plannedSteps.map((step, index) => (
                                            <li
                                                key={step.id}
                                                className="rounded-md border border-border/60 bg-background px-3 py-2"
                                            >
                                                <div className="flex items-center justify-between gap-3">
                                                    <p className="font-medium text-sm">
                                                        {index + 1}. {step.title}
                                                    </p>
                                                    <Badge
                                                        className="font-normal"
                                                        variant={getTaskBadgeVariant(
                                                            step.status
                                                        )}
                                                    >
                                                        {getTaskStatusLabel(step.status)}
                                                    </Badge>
                                                </div>
                                                {step.description ? (
                                                    <p className="mt-1 text-muted-foreground text-xs leading-5">
                                                        {step.description}
                                                    </p>
                                                ) : null}
                                            </li>
                                        ))}
                                    </ol>

                                    <div className="mt-4 rounded-2xl border border-border/60 bg-card/30 p-4">
                                        <Artifact className="overflow-hidden border-0 bg-transparent shadow-none">
                                            <ArtifactHeader>
                                                <div>
                                                    <ArtifactTitle>
                                                        Selected file inspector
                                                    </ArtifactTitle>
                                                    <ArtifactDescription>
                                                        {selectedSource} · {selectedPath}
                                                    </ArtifactDescription>
                                                </div>
                                                <ArtifactActions>
                                                    <ArtifactAction
                                                        icon={CopyIcon}
                                                        label="Copy selected file path"
                                                        tooltip="Copy selected file path"
                                                        onClick={async () => {
                                                            await navigator.clipboard.writeText(
                                                                selectedPath
                                                            )
                                                        }}
                                                    />
                                                </ArtifactActions>
                                            </ArtifactHeader>

                                            <ArtifactContent className="space-y-4">
                                                <PackageInfo
                                                    changeType={
                                                        selectedFile.isDirectory ? 'major' : 'minor'
                                                    }
                                                    className="shadow-none"
                                                    currentVersion={selectedFile.language}
                                                    name={selectedPath}
                                                    newVersion={selectedFile.stateLabel}
                                                >
                                                    <PackageInfoHeader>
                                                        <PackageInfoName />
                                                        <PackageInfoVersion />
                                                    </PackageInfoHeader>
                                                    <PackageInfoDescription>
                                                        {selectedFile.isDirectory
                                                            ? 'Directory snapshot with no direct code preview.'
                                                            : 'Live file preview, syntax highlighting, and output diagnostics.'}
                                                    </PackageInfoDescription>
                                                    <PackageInfoContent>
                                                        <PackageInfoDependencies>
                                                            <PackageInfoDependency
                                                                name="Source"
                                                                version={selectedSource}
                                                            />
                                                            <PackageInfoDependency
                                                                name="State"
                                                                version={selectedFile.stateLabel}
                                                            />
                                                            <PackageInfoDependency
                                                                name="Language"
                                                                version={selectedFile.language}
                                                            />
                                                        </PackageInfoDependencies>
                                                    </PackageInfoContent>
                                                </PackageInfo>

                                                <Snippet code={selectedPath} className="w-full">
                                                    <div className="flex items-center gap-2">
                                                        <SnippetText>Path</SnippetText>
                                                        <SnippetInput className="min-w-0 flex-1" />
                                                        <SnippetCopyButton />
                                                    </div>
                                                </Snippet>

                                                <Sandbox defaultOpen>
                                                    <SandboxHeader
                                                        state={selectedFile.state}
                                                        title={selectedPath}
                                                    />
                                                    <SandboxContent>
                                                        <SandboxTabs defaultValue="code">
                                                            <SandboxTabsBar>
                                                                <SandboxTabsList>
                                                                    <SandboxTabsTrigger value="code">
                                                                        Code
                                                                    </SandboxTabsTrigger>
                                                                    <SandboxTabsTrigger value="output">
                                                                        Output
                                                                    </SandboxTabsTrigger>
                                                                </SandboxTabsList>
                                                            </SandboxTabsBar>

                                                            <SandboxTabContent value="code">
                                                                {selectedFile.isDirectory ? (
                                                                    <div className="rounded-lg border border-dashed border-border/60 px-3 py-4 text-muted-foreground text-sm">
                                                                        This selection is a directory.
                                                                        Open a file to view highlighted code.
                                                                    </div>
                                                                ) : (
                                                                    <CodeBlock
                                                                        code={selectedFile.content}
                                                                        language={selectedFile.language}
                                                                        showLineNumbers
                                                                    />
                                                                )}
                                                            </SandboxTabContent>

                                                            <SandboxTabContent value="output">
                                                                {selectedFile.errorText ||
                                                                looksLikeStackTrace(selectedFile.content) ? (
                                                                    <StackTrace
                                                                        defaultOpen
                                                                        trace={
                                                                            selectedFile.errorText ??
                                                                            selectedFile.content
                                                                        }
                                                                    >
                                                                        <StackTraceHeader>
                                                                            <StackTraceError>
                                                                                <StackTraceErrorType />
                                                                                <StackTraceErrorMessage />
                                                                            </StackTraceError>
                                                                            <StackTraceActions>
                                                                                <StackTraceCopyButton />
                                                                            </StackTraceActions>
                                                                        </StackTraceHeader>
                                                                        <StackTraceContent>
                                                                            <StackTraceFrames />
                                                                        </StackTraceContent>
                                                                    </StackTrace>
                                                                ) : selectedFile.hasJsxPreview ? (
                                                                    <JSXPreview jsx={selectedFile.content}>
                                                                        <JSXPreviewContent />
                                                                        <JSXPreviewError />
                                                                    </JSXPreview>
                                                                ) : (
                                                                    <div className="rounded-lg border border-dashed border-border/60 px-3 py-4 text-muted-foreground text-sm">
                                                                        No JSX preview or stack trace is available for this file.
                                                                    </div>
                                                                )}
                                                            </SandboxTabContent>
                                                        </SandboxTabs>
                                                    </SandboxContent>
                                                </Sandbox>
                                            </ArtifactContent>
                                        </Artifact>
                                    </div>
                                </PlanContent>
                            </Plan>

                            <Queue className="border border-border/60 bg-background/70 p-0 shadow-none">
                                <div className="flex items-center justify-between gap-3 border-b border-border/60 px-3 py-2">
                                    <div>
                                        <p className="font-medium text-sm">
                                            Live queue
                                        </p>
                                        <p className="text-muted-foreground text-xs">
                                            Grouped by task status.
                                        </p>
                                    </div>
                                    <Badge variant="secondary" className="font-normal">
                                        {queuedTasks.length}
                                    </Badge>
                                </div>

                                <div className="space-y-3 px-3 py-3">
                                    {queuedTasks.length === 0 ? (
                                        <div className="rounded-md border border-dashed border-border/60 px-3 py-4 text-muted-foreground text-sm">
                                            No tasks are queued yet. Ask the agent to
                                            inspect the current file or prepare a
                                            follow-up edit.
                                        </div>
                                    ) : (
                                        taskGroups.map(({ status, tasks }) => (
                                            <QueueSection
                                                key={status}
                                                defaultOpen={status !== 'completed'}
                                            >
                                                <QueueSectionTrigger>
                                                    <QueueSectionLabel
                                                        count={tasks.length}
                                                        label={getTaskStatusLabel(
                                                            status
                                                        ).toLowerCase()}
                                                    />
                                                </QueueSectionTrigger>
                                                <QueueSectionContent>
                                                    <div className="space-y-2">
                                                        {tasks.map((task) => (
                                                            <div
                                                                key={task.id}
                                                                className="flex items-start gap-2 rounded-md border border-border/60 bg-background px-3 py-2"
                                                            >
                                                                <QueueItemIndicator
                                                                    completed={
                                                                        task.status ===
                                                                        'completed'
                                                                    }
                                                                />
                                                                <div className="min-w-0 flex-1">
                                                                    <QueueItemContent
                                                                        completed={
                                                                            task.status ===
                                                                            'completed'
                                                                        }
                                                                    >
                                                                        {task.title}
                                                                    </QueueItemContent>
                                                                    {task.description ? (
                                                                        <QueueItemDescription
                                                                            completed={
                                                                                task.status ===
                                                                                'completed'
                                                                            }
                                                                        >
                                                                            {task.description}
                                                                        </QueueItemDescription>
                                                                    ) : null}
                                                                </div>
                                                                <Badge
                                                                    className="font-normal"
                                                                    variant={getTaskBadgeVariant(
                                                                        task.status
                                                                    )}
                                                                >
                                                                    {getTaskStatusLabel(
                                                                        task.status
                                                                    )}
                                                                </Badge>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </QueueSectionContent>
                                            </QueueSection>
                                        ))
                                    )}
                                </div>
                            </Queue>
                        </div>

                        <div className="mt-4 rounded-2xl border border-border/60 bg-card/30 p-4">
                            <div className="mb-3 flex items-center justify-between gap-2">
                                <div>
                                    <p className="text-muted-foreground text-xs uppercase tracking-[0.2em]">
                                        Checkpoints
                                    </p>
                                    <h4 className="font-semibold text-base">
                                        Saved conversation snapshots
                                    </h4>
                                </div>
                                <Badge variant="secondary" className="font-normal">
                                    {checkpointItems.length}
                                </Badge>
                            </div>

                            {checkpointItems.length === 0 ? (
                                <div className="rounded-lg border border-dashed border-border px-4 py-5 text-muted-foreground text-sm">
                                    No checkpoints have been created yet.
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {checkpointItems.map((checkpoint) => (
                                        <CheckpointCard
                                            key={checkpoint.id}
                                            className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-background px-3 py-3"
                                        >
                                            <div className="flex min-w-0 items-center gap-3">
                                                <CheckpointIcon />
                                                <div className="min-w-0">
                                                    <p className="truncate font-medium text-sm">
                                                        {checkpoint.label ?? `Checkpoint ${checkpoint.messageCount}`}
                                                    </p>
                                                    <p className="text-muted-foreground text-xs">
                                                        Message {checkpoint.messageCount}
                                                    </p>
                                                </div>
                                            </div>
                                            <CheckpointTrigger
                                                tooltip="Restore checkpoint"
                                                onClick={() => {
                                                    restoreCheckpoint(checkpoint.id)
                                                }}
                                            >
                                                Restore
                                            </CheckpointTrigger>
                                        </CheckpointCard>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="mt-4 space-y-3">
                            <div className="flex items-center justify-between gap-2 text-muted-foreground text-xs">
                                <span>Pending confirmations</span>
                                <Badge variant="secondary" className="font-normal">
                                    {pendingConfirmations.length}
                                </Badge>
                            </div>

                            {pendingConfirmations.length === 0 ? (
                                <div className="rounded-lg border border-dashed border-border px-4 py-5 text-muted-foreground text-sm">
                                    No approvals are waiting right now.
                                </div>
                            ) : (
                                pendingConfirmations.map((confirmation) => (
                                    <Confirmation
                                        key={confirmation.id}
                                        approval={confirmation.approval}
                                        state={confirmation.state}
                                        className="rounded-xl border border-border/60 bg-background px-3 py-3"
                                    >
                                        <ConfirmationTitle>
                                            {confirmation.toolName}
                                        </ConfirmationTitle>
                                        <ConfirmationRequest>
                                            {confirmation.description}
                                        </ConfirmationRequest>
                                        <ConfirmationAccepted>
                                            Approved and ready to continue.
                                        </ConfirmationAccepted>
                                        <ConfirmationRejected>
                                            This action has been rejected.
                                        </ConfirmationRejected>
                                        <ConfirmationActions>
                                            <ConfirmationAction
                                                size="sm"
                                                onClick={() => {
                                                    approveConfirmation(confirmation.id)
                                                }}
                                                disabled={
                                                    confirmation.approval?.approved === true
                                                }
                                            >
                                                Approve
                                            </ConfirmationAction>
                                            <ConfirmationAction
                                                size="sm"
                                                variant="outline"
                                                onClick={() => {
                                                    rejectConfirmation(
                                                        confirmation.id,
                                                        'Rejected from code agent chat'
                                                    )
                                                }}
                                                disabled={
                                                    confirmation.approval?.approved === false
                                                }
                                            >
                                                Reject
                                            </ConfirmationAction>
                                        </ConfirmationActions>
                                    </Confirmation>
                                ))
                            )}
                        </div>
                    </AgentContent>
                </Agent>
            </div>

            <div className="flex min-h-0 flex-1 flex-col">
                <Conversation className="flex-1">
                    <ConversationContent className="space-y-4 px-4 py-4">
                        {visibleMessages.length === 0 ? (
                            <ConversationEmptyState
                                className="rounded-lg border border-dashed border-border px-4 py-6 text-left"
                                description={`Start a code conversation for ${selectedSource} · ${selectedPath}.`}
                                title="No messages yet"
                            />
                        ) : (
                            visibleMessages.map((message) => {
                                const isLatestAssistantMessage =
                                    message.id === latestAssistantMessageId

                                return (
                                    <Message key={message.id} from={message.role}>
                                        <MessageBody
                                            isLatestAssistantMessage={
                                                isLatestAssistantMessage
                                            }
                                            isStreaming={isLoading}
                                            onFollowUp={() => {
                                                sendMessage(
                                                    `Review ${selectedPath} and refine the result.`
                                                )
                                            }}
                                            message={message}
                                            streamingReasoning={streamingReasoning}
                                        />
                                    </Message>
                                )
                            })
                        )}
                    </ConversationContent>
                    <ConversationScrollButton />
                </Conversation>

                <div className="border-t border-border px-4 py-4">
                    <div className="mb-3 flex items-center justify-between gap-2 text-muted-foreground text-xs">
                        <span>
                            {isLoading
                                ? 'Agent is working...'
                                : 'Ready for the next prompt'}
                        </span>
                        <Suggestions className="max-w-full overflow-hidden">
                            {followUpSuggestions.map((suggestion) => (
                                <Suggestion
                                    key={suggestion}
                                    suggestion={suggestion}
                                    onClick={(value) => {
                                        sendMessage(value)
                                    }}
                                />
                            ))}
                        </Suggestions>
                    </div>

                    <ChatInput />
                </div>
            </div>
        </section>
    )
}