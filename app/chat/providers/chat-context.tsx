'use client'

import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import { getAgentConfig, DEFAULT_AGENT_ID } from '../config/agents'
import type {
    UIMessage,
    UIDataTypes,
    LanguageModelUsage,
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
    DynamicToolUIPart,
    FileUIPart,
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
    getToolName,
    lastAssistantMessageIsCompleteWithToolCalls,
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
import {
    RequestContext,
    MASTRA_RESOURCE_ID_KEY,
    MASTRA_THREAD_ID_KEY,
} from '@mastra/core/request-context'
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useAuthQuery } from '@/lib/hooks/use-auth-query'
import { useAgent, useAgentModelProviders } from '@/lib/hooks/use-mastra-query'
import { extractThoughtSummaryFromProviderMetadata } from '../components/chat.utils'
import { ChatContext } from './chat-context-hooks'

const CHAT_PROVIDER_ID_CONTEXT_KEY = 'provider-id' as const
const CHAT_MODEL_ID_CONTEXT_KEY = 'model-id' as const

type ChatRequestContext = Record<
    | 'agentId'
    | 'userId'
    | typeof MASTRA_RESOURCE_ID_KEY
    | typeof MASTRA_THREAD_ID_KEY
    | typeof CHAT_PROVIDER_ID_CONTEXT_KEY
    | typeof CHAT_MODEL_ID_CONTEXT_KEY,
    string
>

type ChatMessagePart = UIMessagePart<UIDataTypes, UITools>

type ModelProvider = NonNullable<
    NonNullable<ReturnType<typeof useAgentModelProviders>['data']>
>['providers'][number]

type ChatModel = {
    id: string
    name: string
    provider: string
    contextWindow?: number
}

export type ChatRuntimeTypes = {
    chunk: UIMessageChunk
    dataContent: DataContent
    finishReason: FinishReason
    reasoningOutput: ReasoningOutput
    stepResult: StepResult<ToolSet>
    prepareStepResult: PrepareStepResult<ToolSet>
    stepStartPart: StepStartUIPart
    dataPart: DataUIPart<UIDataTypes>
    toolSet: ToolSet
}

type ChatStatus = 'ready' | 'submitted' | 'streaming' | 'error'

interface Source {
    url: string
    title: string
}

export type ToolInvocationState = ToolUIPart | DynamicToolUIPart

export interface QueuedTask {
    id: string
    title: string
    description?: string
    status: 'pending' | 'running' | 'completed' | 'failed'
    createdAt?: Date
    completedAt?: Date
    error?: string
}

interface PendingConfirmation {
    id: string
    toolName: string
    description: string
    approval: ToolUIPart['approval']
    state: ToolUIPart['state']
}

export interface Checkpoint {
    id: string
    messageIndex: number
    timestamp: Date
    messageCount: number
    label?: string
}

interface WebPreviewData {
    id: string
    url: string
    title?: string
    code?: string
    language?: string
    html?: string
    editable?: boolean
    showConsole?: boolean
    height?: number
}

let taskIdCounter = 0
let checkpointIdCounter = 0

interface ChatCompletionState {
    messageId: string
    message: UIMessage
    messages: UIMessage[]
    finishReason: FinishReason | null
    isAbort: boolean
    isDisconnect: boolean
    isError: boolean
}

export interface ChatContextValue {
    messages: UIMessage[]
    isLoading: boolean
    status: ChatStatus
    selectedAgent: string
    streamingContent: string
    streamingReasoning: string
    toolInvocations: ToolInvocationState[]
    sources: Source[]
    usage: LanguageModelUsage | null
    lastCompletion: ChatCompletionState | null
    error: string | null
    agentConfig: ReturnType<typeof getAgentConfig>
    modelProviders: ModelProvider[]
    selectedProvider: ModelProvider | null
    selectedProviderModels: string[]
    selectedProviderLabel: string
    selectedModel: ChatModel
    queuedTasks: QueuedTask[]
    pendingConfirmations: PendingConfirmation[]
    checkpoints: Checkpoint[]
    webPreview: WebPreviewData | null
    threadId: string
    resourceId: string
    isFocusMode: boolean
    availableModels: ChatModel[]
    sendMessage: (text: string, files?: File[]) => void
    stopGeneration: () => void
    clearMessages: () => void
    selectAgent: (agentId: string) => void
    selectProvider: (providerId: string) => void
    selectModel: (modelId: string) => void
    dismissError: () => void
    setFocusMode: (enabled: boolean) => void
    addTask: (task: Omit<QueuedTask, 'id'>) => string
    updateTask: (taskId: string, updates: Partial<QueuedTask>) => void
    removeTask: (taskId: string) => void
    approveConfirmation: (confirmationId: string) => void
    rejectConfirmation: (confirmationId: string, reason?: string) => void
    createCheckpoint: (messageIndex: number, label?: string) => string
    restoreCheckpoint: (checkpointId: string) => void
    removeCheckpoint: (checkpointId: string) => void
    setWebPreview: (preview: WebPreviewData | null) => void
    setThreadId: (threadId: string) => void
    setResourceId: (resourceId: string) => void
}

function normalizeChatError(error: unknown): string {
    if (error instanceof InvalidArgumentError) {
        return error.message
    }
    if (error instanceof InvalidMessageRoleError) {
        return error.message
    }
    if (error instanceof InvalidResponseDataError) {
        return error.message
    }
    if (error instanceof UIMessageStreamError) {
        return error.message
    }
    return error instanceof Error ? error.message : String(error)
}

function isSourceDocumentPart(part: ChatMessagePart): part is SourceDocumentUIPart {
    return part.type === 'source-document'
}

function isSourceUrlPart(part: ChatMessagePart): part is SourceUrlUIPart {
    return part.type === 'source-url'
}

function getSourcesFromParts(parts: ChatMessagePart[]): Source[] {
    const sources: Source[] = []

    for (const part of parts) {
        if (isSourceUrlPart(part)) {
            sources.push({
                url: part.url,
                title: part.title ?? part.url,
            })
            continue
        }

        if (isSourceDocumentPart(part)) {
            sources.push({
                url: part.sourceId,
                title: part.filename ? `${part.title} (${part.filename})` : part.title,
            })
            continue
        }

        if (isFileUIPart(part)) {
            const filePart = part as FileUIPart
            sources.push({
                url: filePart.url,
                title: filePart.filename
                    ? `${filePart.filename} (${filePart.mediaType})`
                    : `${filePart.url} (${filePart.mediaType})`,
            })
        }
    }

    return sources
}

function dataUrlToDataContent(url: string): DataContent | null {
    try {
        return getTextFromDataUrl(url) as DataContent
    } catch {
        return null
    }
}

export interface ChatProviderProps {
    children: ReactNode
    defaultAgent?: string
    defaultThreadId?: string
    defaultResourceId?: string
}

const MASTRA_API_URL =
    process.env.NEXT_PUBLIC_MASTRA_API_URL ?? 'http://localhost:4111'

export function ChatProvider({
    children,
    defaultAgent = DEFAULT_AGENT_ID,
    defaultThreadId,
    defaultResourceId,
}: ChatProviderProps) {
    const authQuery = useAuthQuery()
    const userId = authQuery.data?.user.id ?? ''

    const [selectedAgent, setSelectedAgent] = useState(defaultAgent)
    // sourcesState is nullable to allow falling back to derived sources from messages.
    const [sourcesState, setSourcesState] = useState<Source[] | null>(null)
    const [chatError, setChatError] = useState<string | null>(null)
    const [queuedTasks, setQueuedTasks] = useState<QueuedTask[]>([])
    const [pendingConfirmations, setPendingConfirmations] = useState<
        PendingConfirmation[]
    >([])
    const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([])
    const [lastCompletion, setLastCompletion] = useState<
        ChatCompletionState | null
    >(null)
    const [webPreview, setWebPreviewState] = useState<WebPreviewData | null>(
        null
    )

    const [resourceIdOverride, setResourceIdState] = useState('')

    const [threadIdOverride, setThreadIdState] = useState('')

    const [selectedModelId, setSelectedModelId] = useState('')
    const [isFocusMode, setFocusMode] = useState(false)

    const selectedAgentDetails = useAgent(selectedAgent)
    const modelProvidersQuery = useAgentModelProviders()

    const modelProviders = useMemo<ModelProvider[]>(
        () => modelProvidersQuery.data?.providers ?? [],
        [modelProvidersQuery.data]
    )

    // Ref to track message snapshots for checkpoint restore
    const messageSnapshotsRef = useRef<Map<string, UIMessage[]>>(new Map())

    const resourceId = useMemo(() => {
        if (resourceIdOverride.length > 0) {
            return resourceIdOverride
        }

        if (defaultResourceId !== undefined && defaultResourceId.trim().length > 0) {
            return defaultResourceId
        }

        return userId
    }, [defaultResourceId, resourceIdOverride, userId])

    const threadId = useMemo(() => {
        if (threadIdOverride.length > 0) {
            return threadIdOverride
        }

        if (defaultThreadId !== undefined && defaultThreadId.trim().length > 0) {
            return defaultThreadId
        }

        if (userId.length > 0) {
            return `thread:${userId}:${defaultAgent}`
        }

        return ''
    }, [defaultAgent, defaultThreadId, threadIdOverride, userId])

    const availableModels = useMemo<ChatModel[]>(() => {
        const modelsById = new Map<string, ChatModel>()

        for (const entry of selectedAgentDetails.data?.modelList ?? []) {
            const modelId = entry.model.modelId
            if (!modelsById.has(modelId)) {
                modelsById.set(modelId, {
                    id: modelId,
                    name: modelId,
                    provider: entry.model.provider,
                })
            }
        }

        return Array.from(modelsById.values())
    }, [selectedAgentDetails.data])

    const selectedModel = useMemo<ChatModel>(() => {
        const selectedFromState =
            availableModels.find((model) => model.id === selectedModelId) ??
            availableModels.find(
                (model) => model.id === selectedAgentDetails.data?.modelId
            )

        if (selectedFromState) {
            return selectedFromState
        }

        if (selectedAgentDetails.data) {
            return {
                id: selectedAgentDetails.data.modelId,
                name: selectedAgentDetails.data.modelId,
                provider: selectedAgentDetails.data.provider,
            }
        }

        return {
            id: '',
            name: '',
            provider: '',
        }
    }, [availableModels, selectedAgentDetails.data, selectedModelId])

    const selectedProvider = useMemo(
        () => {
            const providerId =
                availableModels.find((model) => model.id === selectedModelId)?.provider ??
                selectedAgentDetails.data?.provider ??
                ''

            return modelProviders.find((provider) => provider.id === providerId) ?? null
        },
        [availableModels, modelProviders, selectedAgentDetails.data?.provider, selectedModelId]
    )

    const selectedProviderModels = useMemo(
        () => selectedProvider?.models ?? [],
        [selectedProvider]
    )

    const selectedProviderLabel = useMemo(
        () => selectedProvider?.name ?? selectedAgentDetails.data?.provider ?? '',
        [selectedAgentDetails.data?.provider, selectedProvider]
    )

    const transport = useMemo(
        () =>
            new DefaultChatTransport({
                // Use stable endpoint - agentId passed in body, not URL path
                api: `${MASTRA_API_URL}/chat/${selectedAgent}`,
                credentials: 'include',
                prepareSendMessagesRequest({
                    messages: outgoingMessages,
                    requestMetadata,
                    trigger,
                    messageId,
                }) {
                    const last = outgoingMessages[outgoingMessages.length - 1]
                    const textPart = last.parts.find(isTextUIPart)

                    // Create RequestContext for multi-tenancy isolation
                    const requestContext = new RequestContext<ChatRequestContext>()
                    requestContext.set(MASTRA_RESOURCE_ID_KEY, resourceId)
                    requestContext.set(MASTRA_THREAD_ID_KEY, threadId)
                    requestContext.set('agentId', selectedAgent)
                    requestContext.set('userId', userId)
                    requestContext.set(CHAT_PROVIDER_ID_CONTEXT_KEY, selectedModel.provider)
                    requestContext.set(CHAT_MODEL_ID_CONTEXT_KEY, selectedModel.id)

                    const runtimeContext = requestContext.all

                    return {
                        body: {
                            id: selectedAgent,
                            messages: outgoingMessages,
                            parts: outgoingMessages.flatMap((m) => m.parts),
                            trigger,
                            messageId,
                            memory: {
                                thread: threadId,
                                resource: resourceId,
                            },
                            requestMetadata:
                                requestMetadata !== undefined
                                    ? requestMetadata
                                    : runtimeContext,
                            resourceId,
                            data: {
                                agentId: selectedAgent,
                                threadId,
                                input: textPart?.text ?? '',
                            },
                            requestContext: runtimeContext,
                        },
                    }
                },
            }),
        [selectedAgent, threadId, resourceId, userId, selectedModel.provider, selectedModel.id]
    )

    const {
        messages,
        setMessages,
        sendMessage: aiSendMessage,
        status: aiStatus,
        error: aiError,
        stop,
    } = useChat({
        transport,
        onFinish({ message, finishReason, isAbort, isDisconnect, isError }) {
            setLastCompletion({
                messageId: message.id,
                message,
                messages,
                finishReason: finishReason ?? null,
                isAbort,
                isDisconnect,
                isError,
            })
        },
    })

    useEffect(() => {
        let cancelled = false

        const hasIncompleteMessage = messages.some((message) => {
            if (!Array.isArray(message.parts)) {
                return true
            }

            return message.parts.length === 0
        })

        if (messages.length === 0 || aiStatus !== 'ready' || hasIncompleteMessage) {
            return () => {
                cancelled = true
            }
        }

        void safeValidateUIMessages<UIMessage>({ messages }).then((result) => {
            if (cancelled) {
                return
            }

            if (!result.success) {
                setChatError(normalizeChatError(result.error))
            } else {
                setChatError(null)
            }
        })

        return () => {
            cancelled = true
        }
    }, [aiStatus, messages])

    const aiErrorMessage = useMemo(
        () => (aiError ? normalizeChatError(aiError) : null),
        [aiError]
    )

    const status: ChatStatus = useMemo(() => {
        if (aiErrorMessage || Boolean(chatError)) {
            return 'error'
        }
        if (aiStatus === 'streaming') {
            return 'streaming'
        }
        if (aiStatus === 'submitted') {
            return 'submitted'
        }
        return 'ready'
    }, [aiStatus, aiErrorMessage, chatError])

    const isLoading = status === 'streaming' || status === 'submitted'

    const streamingContent = useMemo(() => {
        const lastMessage = messages[messages.length - 1]
        if (
            lastMessage &&
            lastMessage.role === 'assistant' &&
            aiStatus === 'streaming'
        ) {
            const textPart: TextUIPart | undefined = lastMessage.parts.find(
                isTextUIPart
            )
            return textPart?.text ?? ''
        }
        return ''
    }, [messages, aiStatus])

    const streamingReasoning = useMemo(() => {
        const lastMessage = messages[messages.length - 1]
        if (lastMessage && lastMessage.role === 'assistant') {
            const reasoningPart: ReasoningUIPart | undefined =
                lastMessage.parts.find(isReasoningUIPart)

            const direct = reasoningPart?.text
            if (typeof direct === 'string' && direct.trim().length > 0) {
                return direct
            }

            for (const part of lastMessage.parts) {
                const providerMetadata =
                    'providerMetadata' in part
                        ? (part.providerMetadata as ProviderMetadata)
                        : 'callProviderMetadata' in part
                          ? (part.callProviderMetadata as ProviderMetadata)
                          : undefined

                const summary =
                    extractThoughtSummaryFromProviderMetadata(providerMetadata)
                if (summary.length > 0) {
                    return summary
                }
            }
        }
        return ''
    }, [messages])

    const toolInvocations = useMemo((): ToolInvocationState[] => {
        const lastMessage = messages[messages.length - 1]
        if (!lastMessage || lastMessage.role !== 'assistant') {
            return []
        }

        // Collect native AI SDK tool parts (tool-*) and dynamic-tool parts.
        return lastMessage.parts.filter(
            (part): part is ToolInvocationState => isToolUIPart(part)
        )
    }, [messages])

    // Derive sources from assistant messages (no synchronous setState in effect).
    const derivedSources = useMemo<Source[]>(() => {
        const allSources: Source[] = []
        for (const message of messages) {
            if (message.role === 'assistant') {
                allSources.push(
                    ...getSourcesFromParts(message.parts as ChatMessagePart[])
                )
            }
        }
        return allSources
    }, [messages])

    // Derive web preview data from tool outputs (for chart/diagram agents)
    const derivedWebPreview = useMemo<WebPreviewData | null>(() => {
        const lastMessage = messages[messages.length - 1]
        if (!lastMessage || lastMessage.role !== 'assistant') {
            return null
        }

        if (!lastAssistantMessageIsCompleteWithToolCalls({ messages })) {
            return null
        }

        const part = lastMessage.parts.find(
            (p) => isToolUIPart(p) || isDataUIPart(p)
        )

        if (!part) {
            return null
        }

        const toolPart = lastMessage.parts.find(isToolUIPart)

        const output = isDataUIPart(part)
            ? (part.data as Record<string, unknown> | undefined)
            : (part as ToolUIPart | DynamicToolUIPart).output as
                  | Record<string, unknown>
                  | undefined

        const isPlainObject = (v: unknown): v is Record<string, unknown> =>
            v !== null && typeof v === 'object' && !Array.isArray(v)

        if (!isPlainObject(output)) {
            return null
        }

        const out = output

        if (typeof out.previewUrl === 'string') {
            return {
                id: 'web-preview',
                url: out.previewUrl,
                title:
                    (out.title as string) ||
                    (toolPart ? getToolName(toolPart) : undefined) ||
                    'Generated Preview',
            }
        } else if (typeof out.code === 'string') {
            const language = (out.language as string) || 'tsx'
            const htmlCandidate = (out as { html?: unknown }).html
            if (language === 'html' || typeof htmlCandidate === 'string') {
                const htmlContent =
                    typeof htmlCandidate === 'string' ? htmlCandidate : out.code
                const dataUrl = `data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`
                const verifiedContent = dataUrlToDataContent(dataUrl)

                if (verifiedContent === null) {
                    return null
                }

                return {
                    id: 'web-preview',
                    url: dataUrl,
                    title:
                        (out.title as string) ||
                        (toolPart ? getToolName(toolPart) : undefined) ||
                        'Generated UI',
                    code: out.code,
                    language,
                }
            }
        }

        return null
    }, [messages])

    const sendMessage = useCallback(
        (text: string, files?: File[]) => {
            if (!text.trim() || isLoading) {
                return
            }
            setChatError(null)
            setLastCompletion(null)

            const fileList: FileList | undefined = (() => {
                if (!files || files.length === 0) {
                    return undefined
                }
                const dt = new DataTransfer()
                for (const f of files) {
                    dt.items.add(f)
                }
                return dt.files
            })()

            // Fire-and-forget to avoid returning a Promise where a void is expected.
            void aiSendMessage({
                text: text.trim(),
                ...(fileList ? { files: fileList } : {}),
            })
        },
        [isLoading, aiSendMessage]
    )

    const stopGeneration = useCallback(() => {
        void stop()
    }, [stop])

    const clearMessages = useCallback(() => {
        setMessages([])
        setSourcesState([])
        setChatError(null)
        setLastCompletion(null)
        setQueuedTasks([])
        setPendingConfirmations([])
        setCheckpoints([])
        setWebPreviewState(null)
        messageSnapshotsRef.current.clear()
    }, [setMessages])

    const selectAgent = useCallback(
        (agentId: string) => {
            const normalizedAgentId = agentId.trim()
            if (normalizedAgentId.length === 0) {
                return
            }

            setSelectedAgent(normalizedAgentId)

            // Keep per-agent thread IDs stable by default (but never hard-coded).
            if (
                !(
                    defaultThreadId !== undefined &&
                    defaultThreadId.trim().length > 0
                )
            ) {
                setThreadIdState(`thread:${userId || 'guest'}:${normalizedAgentId}`)
            }

            // Clear messages and state when switching agents
            setMessages([])
            setSourcesState([])
            setChatError(null)
            setLastCompletion(null)
            setWebPreviewState(null)
            setQueuedTasks([])
            setPendingConfirmations([])
            setCheckpoints([])
            setSelectedModelId('')
            messageSnapshotsRef.current.clear()
        },
        [defaultThreadId, setMessages, userId]
    )

    const selectModel = useCallback((modelId: string) => {
        const model = availableModels.find((item) => item.id === modelId)
        if (model) {
            setSelectedModelId(model.id)
        }
    }, [availableModels])

    const selectProvider = useCallback(
        (providerId: string) => {
            const providerModels = availableModels.filter(
                (model) => model.provider === providerId
            )

            if (providerModels.length === 0) {
                return
            }

            const nextModel =
                providerModels.find((model) => model.id === selectedModel.id) ??
                providerModels[0]

            setSelectedModelId(nextModel.id)
        },
        [availableModels, selectedModel.id]
    )

    const dismissError = useCallback(() => {
        setChatError(null)
    }, [])

    // Task management
    const addTask = useCallback((task: Omit<QueuedTask, 'id'>): string => {
        taskIdCounter += 1
        const id = `task-${taskIdCounter}`
        setQueuedTasks((prev) => [...prev, { ...task, id }])
        return id
    }, [])

    const updateTask = useCallback(
        (taskId: string, updates: Partial<QueuedTask>) => {
            setQueuedTasks((prev) =>
                prev.map((task) =>
                    task.id === taskId ? { ...task, ...updates } : task
                )
            )
        },
        []
    )

    const removeTask = useCallback((taskId: string) => {
        setQueuedTasks((prev) => prev.filter((task) => task.id !== taskId))
    }, [])

    // Confirmation management
    const approveConfirmation = useCallback((confirmationId: string) => {
        setPendingConfirmations((prev) =>
            prev.map((c) =>
                c.id === confirmationId
                    ? {
                          ...c,
                          approval: {
                              ...c.approval,
                              id: c.approval?.id ?? confirmationId,
                              approved: true,
                          },
                      }
                    : c
            )
        )
    }, [])

    const rejectConfirmation = useCallback(
        (confirmationId: string, reason?: string) => {
            setPendingConfirmations((prev) =>
                prev.map((c) =>
                    c.id === confirmationId
                        ? {
                              ...c,
                              approval: {
                                  ...c.approval,
                                  id: c.approval?.id ?? confirmationId,
                                  approved: false,
                                  reason,
                              },
                          }
                        : c
                )
            )
        },
        []
    )

    // Checkpoint management
    const createCheckpoint = useCallback(
        (messageIndex: number, label?: string): string => {
            checkpointIdCounter += 1
            const id = `checkpoint-${checkpointIdCounter}`
            const checkpoint: Checkpoint = {
                id,
                messageIndex,
                timestamp: new Date(),
                messageCount: messageIndex + 1,
                label,
            }

            // Store snapshot of messages up to this point
            messageSnapshotsRef.current.set(
                id,
                messages.slice(0, messageIndex + 1)
            )

            setCheckpoints((prev) => {
                // Remove any existing checkpoint at this index
                const filtered = prev.filter(
                    (cp) => cp.messageIndex !== messageIndex
                )
                return [...filtered, checkpoint].sort(
                    (a, b) => a.messageIndex - b.messageIndex
                )
            })

            return id
        },
        [messages]
    )

    const restoreCheckpoint = useCallback(
        (checkpointId: string) => {
            const checkpoint = checkpoints.find((cp) => cp.id === checkpointId)
            if (!checkpoint) {
                return
            }

            // Try to restore from snapshot first
            const snapshot = messageSnapshotsRef.current.get(checkpointId)
            if (snapshot) {
                setMessages(snapshot)
            } else {
                // Fallback: slice current messages to checkpoint index
                setMessages(messages.slice(0, checkpoint.messageIndex + 1))
            }

            // Remove checkpoints after the restored one
            setCheckpoints((prev) =>
                prev.filter((cp) => cp.messageIndex <= checkpoint.messageIndex)
            )

            // Clean up snapshots for removed checkpoints
            const removedIds = checkpoints
                .filter((cp) => cp.messageIndex > checkpoint.messageIndex)
                .map((cp) => cp.id)
            removedIds.forEach((id) => messageSnapshotsRef.current.delete(id))

            // Clear web preview when restoring
            setWebPreviewState(null)
        },
        [checkpoints, messages, setMessages]
    )

    const removeCheckpoint = useCallback((checkpointId: string) => {
        setCheckpoints((prev) => prev.filter((cp) => cp.id !== checkpointId))
        messageSnapshotsRef.current.delete(checkpointId)
    }, [])

    // Web Preview management
    const setWebPreview = useCallback((preview: WebPreviewData | null) => {
        setWebPreviewState((current) =>
            isDeepEqualData(current, preview) ? current : preview
        )
    }, [])

    // Memory management
    const setThreadId = useCallback(
        (newThreadId: string) => {
            setThreadIdState(newThreadId)
        },
        []
    )

    const setResourceId = useCallback((newResourceId: string) => {
        setResourceIdState(newResourceId)
    }, [])

    const agentConfig = useMemo(
        () => getAgentConfig(selectedAgent),
        [selectedAgent]
    )

    const error = aiError?.message ?? chatError

    const value = useMemo<ChatContextValue>(() => {
        // Derive usage data from the last completed assistant message.
        // Avoid calling setState inside an effect to prevent cascading renders.
        const usage: LanguageModelUsage | null = (() => {
            const lastMessage = messages[messages.length - 1]
            if (
                lastMessage &&
                lastMessage.role === 'assistant' &&
                aiStatus === 'ready'
            ) {
                for (const part of lastMessage.parts) {
                    const partAny = part as Record<string, unknown>
                    if (
                        partAny.type === 'step-finish' ||
                        partAny.type === 'finish'
                    ) {
                        const usageData = partAny.usage as
                            | {
                                  promptTokens?: number
                                  inputTokens?: number
                                  completionTokens?: number
                                  outputTokens?: number
                                  totalTokens?: number
                                  inputTokenDetails?: {
                                      cacheCreation?: number
                                      cacheRead?: number
                                  }
                                  outputTokenDetails?: {
                                      reasoning?: number
                                  }
                              }
                            | undefined
                        if (usageData) {
                            const inputTokens =
                                usageData.promptTokens ??
                                usageData.inputTokens ??
                                0
                            const outputTokens =
                                usageData.completionTokens ??
                                usageData.outputTokens ??
                                0
                            const cacheReadTokens =
                                usageData.inputTokenDetails?.cacheRead ?? 0
                            const cacheWriteTokens =
                                usageData.inputTokenDetails?.cacheCreation ?? 0
                            const reasoningTokens =
                                usageData.outputTokenDetails?.reasoning ?? 0

                            return {
                                inputTokens,
                                outputTokens,
                                totalTokens:
                                    usageData.totalTokens ??
                                    inputTokens + outputTokens,
                                inputTokenDetails: {
                                    cacheReadTokens,
                                    cacheWriteTokens,
                                    noCacheTokens: Math.max(
                                        0,
                                        inputTokens -
                                            cacheReadTokens -
                                            cacheWriteTokens
                                    ),
                                },
                                outputTokenDetails: {
                                    textTokens: outputTokens,
                                    reasoningTokens,
                                },
                                reasoningTokens,
                                cachedInputTokens: cacheReadTokens,
                            }
                        }
                    }
                }
            }
            return null
        })()

        return {
            messages,
            isLoading,
            status,
            selectedAgent,
            streamingContent,
            streamingReasoning,
            toolInvocations,
            sources: sourcesState ?? derivedSources,
            usage: usage as ChatContextValue['usage'],
            lastCompletion,
            error,
            agentConfig,
            modelProviders,
            selectedProvider,
            selectedProviderModels,
            selectedProviderLabel,
            selectedModel,
            availableModels,
            queuedTasks,
            pendingConfirmations,
            checkpoints,
            webPreview: webPreview ?? derivedWebPreview,
            threadId,
            resourceId,
            isFocusMode,
            sendMessage,
            stopGeneration,
            clearMessages,
            selectAgent,
            selectProvider,
            selectModel,
            dismissError,
            addTask,
            updateTask,
            removeTask,
            approveConfirmation,
            rejectConfirmation,
            createCheckpoint,
            restoreCheckpoint,
            removeCheckpoint,
            setWebPreview,
            setThreadId,
            setResourceId,
            setFocusMode,
        } as ChatContextValue
    }, [
        messages,
        isLoading,
        status,
        selectedAgent,
        streamingContent,
        streamingReasoning,
        toolInvocations,
        sourcesState,
        derivedSources,
        error,
        agentConfig,
        modelProviders,
        selectedProvider,
        selectedProviderModels,
        selectedProviderLabel,
        selectedModel,
        availableModels,
        queuedTasks,
        pendingConfirmations,
        checkpoints,
        lastCompletion,
        webPreview,
        derivedWebPreview,
        threadId,
        resourceId,
        isFocusMode,
        sendMessage,
        stopGeneration,
        clearMessages,
        selectAgent,
        selectProvider,
        selectModel,
        dismissError,
        addTask,
        updateTask,
        removeTask,
        approveConfirmation,
        rejectConfirmation,
        createCheckpoint,
        restoreCheckpoint,
        removeCheckpoint,
        setWebPreview,
        setThreadId,
        setResourceId,
        setFocusMode,
        aiStatus,
    ])

    return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>
}
