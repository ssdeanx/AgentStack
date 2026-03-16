'use client'

import { useCallback, useEffect, useState } from 'react'
import { mastraClient } from '@/lib/mastra-client'
import type { SpanType } from '@mastra/core/observability'
import type {
    AddDatasetItemParams,
    BatchDeleteDatasetItemsParams,
    BatchInsertDatasetItemsParams,
    CompareExperimentsParams,
    CompareExperimentsResponse,
    CreateDatasetParams,
    DatasetExperiment,
    DatasetExperimentResult,
    DatasetItem,
    DatasetItemVersionResponse,
    DatasetRecord,
    DatasetVersionResponse,
    GetScorerResponse,
    ListScoresByEntityIdParams,
    ListScoresByRunIdParams,
    ListScoresByScorerIdParams,
    ListScoresResponse,
    TriggerDatasetExperimentParams,
    UpdateDatasetItemParams,
    UpdateDatasetParams,
} from '@mastra/client-js'

interface MastraPaginationInfo {
    total: number
    page: number
    perPage: number | false
    hasMore: boolean
}

interface MastraTraceSpanListItem {
    traceId: string
    spanId: string
    name: string
    startedAt: Date
    endedAt?: Date | null
}

interface MastraListTracesResponse {
    pagination: MastraPaginationInfo
    spans: MastraTraceSpanListItem[]
}

interface MastraTraceRecord {
    traceId: string
    spans: unknown[]
}

interface MastraDatasetsResponse {
    datasets: DatasetRecord[]
    pagination: MastraPaginationInfo
}

interface MastraDatasetItemsResponse {
    items: DatasetItem[]
    pagination: MastraPaginationInfo
}

interface MastraDatasetVersionsResponse {
    versions: DatasetVersionResponse[]
    pagination: MastraPaginationInfo
}

interface MastraDatasetExperimentsResponse {
    experiments: DatasetExperiment[]
    pagination: MastraPaginationInfo
}

interface MastraDatasetExperimentResultsResponse {
    results: DatasetExperimentResult[]
    pagination: MastraPaginationInfo
}

export interface HarnessModeView {
    id: string
    name?: string
    color?: string
    default?: boolean
}

export interface HarnessThreadView {
    id: string
    resourceId: string
    title?: string
    createdAt: string
    updatedAt: string
}

export interface HarnessMessageView {
    id: string
    role: 'system' | 'user' | 'assistant'
    content: string
    createdAt?: string
    type?: string
}

export interface HarnessDisplayStateView {
    currentModeId?: string
    currentThreadId?: string | null
    isRunning?: boolean
    activeTool?: unknown
    activeSubagent?: unknown
    pendingQuestion?: unknown
    pendingToolApproval?: unknown
    pendingPlanApproval?: unknown
    omProgress?: unknown
    lastError?: string | null
}

export interface HarnessSessionView {
    currentThreadId: string | null
    currentModeId: string
    threads: HarnessThreadView[]
}

export interface HarnessSnapshotResponse {
    session: HarnessSessionView
    modes: HarnessModeView[]
    messages: HarnessMessageView[]
    displayState: HarnessDisplayStateView
    state: Record<string, unknown>
    currentModelId?: string | null
    resourceId?: string
}

export interface HarnessSnapshotParams {
    resourceId?: string
    threadId?: string
    messageLimit?: number
}

export interface HarnessSendMessageParams {
    content: string
    resourceId?: string
    threadId?: string
}

export interface HarnessSwitchModeParams {
    modeId: string
    resourceId?: string
    threadId?: string
}

export interface HarnessCreateThreadParams {
    title?: string
    resourceId?: string
}

export interface HarnessSwitchThreadParams {
    threadId: string
    resourceId?: string
}

const HARNESS_PATH = '/harness'

function buildHarnessPath(params?: HarnessSnapshotParams): string {
    const searchParams = new URLSearchParams()

    if (typeof params?.resourceId === 'string' && params.resourceId.length > 0) {
        searchParams.set('resourceId', params.resourceId)
    }

    if (typeof params?.threadId === 'string' && params.threadId.length > 0) {
        searchParams.set('threadId', params.threadId)
    }

    if (typeof params?.messageLimit === 'number') {
        searchParams.set('messageLimit', String(params.messageLimit))
    }

    const query = searchParams.toString()
    return query.length > 0 ? `${HARNESS_PATH}?${query}` : HARNESS_PATH
}

export function getHarnessSnapshot(params?: HarnessSnapshotParams) {
    return mastraClient.request<HarnessSnapshotResponse>(buildHarnessPath(params))
}

export function sendHarnessMessage(params: HarnessSendMessageParams) {
    return mastraClient.request<HarnessSnapshotResponse>(HARNESS_PATH, {
        method: 'POST',
        body: {
            action: 'send-message',
            ...params,
        },
    })
}

export function switchHarnessMode(params: HarnessSwitchModeParams) {
    return mastraClient.request<HarnessSnapshotResponse>(HARNESS_PATH, {
        method: 'POST',
        body: {
            action: 'switch-mode',
            ...params,
        },
    })
}

export function createHarnessThread(params?: HarnessCreateThreadParams) {
    return mastraClient.request<HarnessSnapshotResponse>(HARNESS_PATH, {
        method: 'POST',
        body: {
            action: 'create-thread',
            ...(params ?? {}),
        },
    })
}

export function switchHarnessThread(params: HarnessSwitchThreadParams) {
    return mastraClient.request<HarnessSnapshotResponse>(HARNESS_PATH, {
        method: 'POST',
        body: {
            action: 'switch-thread',
            ...params,
        },
    })
}

// Generic fetch hook for MastraClient data
export function useMastraFetch<T>(
    fetcher: () => Promise<T>,
    deps: unknown[] = []
) {
    const [data, setData] = useState<T | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<Error | null>(null)

    const refetch = useCallback(async () => {
        setLoading(true)
        setError(null)
        try {
            const result = await fetcher()
            setData(result)
        } catch (err) {
            setError(err instanceof Error ? err : new Error(String(err)))
        } finally {
            setLoading(false)
        }
    }, [fetcher])

    useEffect(() => {
        void refetch()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [refetch, ...deps])

    return { data, loading, error, refetch }
}

// Agents hooks
export function useAgents() {
    return useMastraFetch(async () => {
        const agents = await mastraClient.listAgents()
        return Object.entries(agents).map(([id, agent]) => {
            const rec = agent as unknown as Record<string, unknown>
            let modelStr: string | undefined = undefined
            if (typeof rec.modelId === 'string') {
                modelStr = rec.modelId
            } else if (typeof rec.model === 'string') {
                modelStr = rec.model
            } else if (
                typeof rec.model === 'object' &&
                rec.model !== null &&
                typeof (rec.model as Record<string, unknown>).name === 'string'
            ) {
                modelStr = (rec.model as Record<string, unknown>).name as string
            }
            return {
                ...(agent as unknown as Record<string, unknown>),
                id,
                model: modelStr,
            }
        })
    }, [])
}

export function useAgent(agentId: string | null) {
    return useMastraFetch(async () => {
        if (agentId === null || agentId === undefined) {
            return null
        }
        const agent = mastraClient.getAgent(agentId)
        const details = await agent.details()
        const det = details as unknown as Record<string, unknown>
        const detModelId =
            typeof det.modelId === 'string' ? det.modelId : undefined
        const detModelField = det.model
        let detModelStr: string | undefined = undefined
        if (detModelId !== undefined && detModelId !== null) {
            detModelStr = detModelId
        } else if (typeof detModelField === 'string') {
            detModelStr = detModelField
        } else if (
            typeof detModelField === 'object' &&
            detModelField !== null &&
            typeof (detModelField as Record<string, unknown>).name === 'string'
        ) {
            detModelStr = (detModelField as Record<string, unknown>)
                .name as string
        }
        const tools = Array.isArray(det.tools)
            ? (det.tools as unknown[]).map((t) =>
                  typeof t === 'string'
                      ? { id: t, name: t }
                      : {
                            id: (t as Record<string, unknown>).id as string,
                            name: (t as Record<string, unknown>).name as
                                | string
                                | undefined,
                        }
              )
            : Object.entries((det.tools ?? {}) as Record<string, unknown>).map(
                  ([id, val]) => ({
                      id,
                      name:
                          typeof val === 'object' && val !== null
                              ? ((val as Record<string, unknown>).name as
                                    | string
                                    | undefined)
                              : undefined,
                  })
              )
        return { ...details, id: agentId, model: detModelStr, tools }
    }, [agentId])
}

// Workflows hooks
export function useWorkflows() {
    return useMastraFetch(async () => {
        const wf = await mastraClient.listWorkflows()
        return Object.entries(wf).map(([id, w]) => ({
            id,
            ...(w as unknown as Record<string, unknown>),
        }))
    }, [])
}

export function useWorkflow(workflowId: string | null) {
    return useMastraFetch(async () => {
        if (workflowId === null || workflowId === undefined) {
            return null
        }
        const workflow = mastraClient.getWorkflow(workflowId)
        const details = await workflow.details()
        const det = details as unknown as Record<string, unknown>
        const steps = Array.isArray(det.steps)
            ? (det.steps as unknown[]).map((s) => ({
                  id: (s as Record<string, unknown>).id as string,
                  name: (s as Record<string, unknown>).name as
                      | string
                      | undefined,
                  description: (s as Record<string, unknown>).description as
                      | string
                      | undefined,
              }))
            : Object.entries((det.steps ?? {}) as Record<string, unknown>).map(
                  ([id, s]) => ({
                      id,
                      name: (s as Record<string, unknown>).name as
                          | string
                          | undefined,
                      description: (s as Record<string, unknown>)
                          .description as string | undefined,
                  })
              )
        return { id: workflowId, ...details, steps }
    }, [workflowId])
}

// Tools hooks
export function useTools() {
    return useMastraFetch(async () => {
        const tools = await mastraClient.listTools()
        return Object.entries(tools).map(([toolId, tool]) => ({
            ...(tool as unknown as Record<string, unknown>),
            id: toolId,
        }))
    }, [])
}

export function useTool(toolId: string | null) {
    return useMastraFetch(async () => {
        if (toolId === null || toolId === undefined) {
            return null
        }
        const tool = mastraClient.getTool(toolId)
        const details = await tool.details()
        return {
            ...(details as unknown as Record<string, unknown>),
            id: toolId,
        }
    }, [toolId])
}

// Vectors hooks
export function useVectorIndexes(vectorName: string) {
    return useMastraFetch(async () => {
        const vector = mastraClient.getVector(vectorName)
        return await vector.getIndexes()
    }, [vectorName])
}

export function useVectorDetails(vectorName: string, indexName: string | null) {
    return useMastraFetch(async () => {
        if (indexName === null) {
            return null
        }
        const vector = mastraClient.getVector(vectorName)
        return await vector.details(indexName)
    }, [vectorName, indexName])
}

// Memory hooks
export function useMemoryThreads(resourceId: string, agentId: string) {
    return useMastraFetch(async () => {
        return await mastraClient.listMemoryThreads({ resourceId, agentId })
    }, [resourceId, agentId])
}

export function useMemoryThread(threadId: string | null, agentId: string) {
    interface ThreadMessageView {
        id: string
        role: 'system' | 'user' | 'assistant'
        content: string
        threadId?: string
        createdAt: Date
        type?: string
    }

    const [messages, setMessages] = useState<ThreadMessageView[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<Error | null>(null)

    const fetchMessages = useCallback(async () => {
        if (threadId === null) {
            return
        }
        setLoading(true)
        try {
            const thread = mastraClient.getMemoryThread({ threadId, agentId })
            const result = await thread.listMessages({})
            const dbMessages: unknown[] = result.messages ?? []
            const uiMessages: ThreadMessageView[] = dbMessages.map((m: unknown) => {
                const record = m as Record<string, unknown>
                const contentRaw = record.content
                let contentStr = ''
                if (typeof contentRaw === 'string') {
                    contentStr = contentRaw
                } else if (
                    typeof contentRaw === 'object' &&
                    contentRaw !== null &&
                    typeof (contentRaw as Record<string, unknown>).content ===
                        'string'
                ) {
                    contentStr = (contentRaw as Record<string, unknown>)
                        .content as string
                } else if (
                    typeof contentRaw === 'object' &&
                    contentRaw !== null &&
                    Array.isArray((contentRaw as Record<string, unknown>).parts)
                ) {
                    const parts = (contentRaw as Record<string, unknown>)
                        .parts as unknown[]
                    contentStr = parts
                        .map((p) =>
                            typeof p === 'object' &&
                            p !== null &&
                            (Boolean((p as Record<string, unknown>).text))
                                ? ((p as Record<string, unknown>)
                                      .text as string)
                                : ''
                        )
                        .join(' ')
                } else {
                    contentStr = JSON.stringify(contentRaw)
                }

                const createdAtRaw = record.createdAt
                const createdAtDate =
                    createdAtRaw instanceof Date
                        ? createdAtRaw
                        : typeof createdAtRaw === 'string'
                          ? new Date(createdAtRaw)
                          : new Date(0)
                return {
                    id: (record.id as string) ?? '',
                    role:
                        record.role === 'system' ||
                        record.role === 'assistant' ||
                        record.role === 'user'
                            ? record.role
                            : 'user',
                    content: contentStr,
                    threadId:
                        typeof record.threadId === 'string'
                            ? record.threadId
                            : undefined,
                    createdAt: createdAtDate,
                    type: record.type as string | undefined,
                }
            })
            setMessages(uiMessages)
        } catch (err) {
            setError(err instanceof Error ? err : new Error(String(err)))
        } finally {
            setLoading(false)
        }
    }, [threadId, agentId])

    useEffect(() => {
        void fetchMessages()
    }, [fetchMessages])

    return { messages, loading, error, refetch: fetchMessages }
}

export function useWorkingMemory(
    agentId: string,
    threadId: string,
    resourceId?: string
) {
    return useMastraFetch(async () => {
        return await mastraClient.getWorkingMemory({
            agentId,
            threadId,
            resourceId,
        })
    }, [agentId, threadId, resourceId])
}

export function useMemoryStatus(agentId: string) {
    return useMastraFetch(async () => {
        return await mastraClient.getMemoryStatus(agentId)
    }, [agentId])
}

// Observability hooks
export function useAITraces(params?: {
    page?: number
    perPage?: number
    filters?: {
        name?: string
        spanType?: SpanType
        entityId?: string
        entityType?: 'agent' | 'workflow'
    }
    dateRange?: { start: Date; end: Date }
}) {
    return useMastraFetch<MastraListTracesResponse>(async () => {
        const res: unknown = await mastraClient.listTraces({
            pagination: {
                page: params?.page ?? 1,
                perPage: params?.perPage ?? 20,
            },
            filters: {
              //  name: params?.filters?.name,
              //  status: typeof TraceStatus, // Example filter by completed traces
              //  hasChildError: params?.filters?.hasChildError,
                spanType: params?.filters?.spanType,
                entityId: params?.filters?.entityId,
             //   entityType: params?.filters?.entityType,
                //tags: {},
            },
        })
        return res as MastraListTracesResponse
    }, [params?.page, params?.perPage, JSON.stringify(params?.filters)])
}

export function useAITrace(traceId: string | null) {
    return useMastraFetch<MastraTraceRecord | null>(async () => {
        if (traceId === null || traceId === undefined) {
            return null
        }
        const res: unknown = await mastraClient.getTrace(traceId)
        return res as MastraTraceRecord
    }, [traceId])
}

export function useScorers() {
    return useMastraFetch<Record<string, GetScorerResponse>>(
        async () => await mastraClient.listScorers(),
        []
    )
}

export function useScorer(scorerId: string | null) {
    return useMastraFetch<GetScorerResponse | null>(async () => {
        if (scorerId === null || scorerId === undefined) {
            return null
        }

        return await mastraClient.getScorer(scorerId)
    }, [scorerId])
}

export function useScoresByRun(params: ListScoresByRunIdParams | null) {
    return useMastraFetch<ListScoresResponse | null>(async () => {
        if (params === null) {
            return null
        }

        return await mastraClient.listScoresByRunId(params)
    }, [params])
}

export function useScoresByScorer(params: ListScoresByScorerIdParams | null) {
    return useMastraFetch<ListScoresResponse | null>(async () => {
        if (params === null) {
            return null
        }

        return await mastraClient.listScoresByScorerId(params)
    }, [params])
}

export function useScoresByEntity(params: ListScoresByEntityIdParams | null) {
    return useMastraFetch<ListScoresResponse | null>(async () => {
        if (params === null) {
            return null
        }

        return await mastraClient.listScoresByEntityId(params)
    }, [params])
}

export function useDatasets(pagination?: { page?: number; perPage?: number }) {
    return useMastraFetch<MastraDatasetsResponse>(
        async () => await mastraClient.listDatasets(pagination),
        [pagination?.page, pagination?.perPage]
    )
}

export function useDataset(datasetId: string | null) {
    return useMastraFetch<DatasetRecord | null>(async () => {
        if (datasetId === null || datasetId === undefined) {
            return null
        }

        return await mastraClient.getDataset(datasetId)
    }, [datasetId])
}

export function useDatasetItems(
    datasetId: string | null,
    params?: { page?: number; perPage?: number; search?: string; version?: number | null }
) {
    return useMastraFetch<MastraDatasetItemsResponse | null>(async () => {
        if (datasetId === null || datasetId === undefined) {
            return null
        }

        return await mastraClient.listDatasetItems(datasetId, params)
    }, [datasetId, params?.page, params?.perPage, params?.search, params?.version])
}

export function useDatasetItem(datasetId: string | null, itemId: string | null) {
    return useMastraFetch<DatasetItem | null>(async () => {
        if (datasetId === null || itemId === null || datasetId === undefined || itemId === undefined) {
            return null
        }

        return await mastraClient.getDatasetItem(datasetId, itemId)
    }, [datasetId, itemId])
}

export function useDatasetItemHistory(datasetId: string | null, itemId: string | null) {
    return useMastraFetch<{ history: DatasetItemVersionResponse[] } | null>(async () => {
        if (datasetId === null || itemId === null || datasetId === undefined || itemId === undefined) {
            return null
        }

        return await mastraClient.getItemHistory(datasetId, itemId)
    }, [datasetId, itemId])
}

export function useDatasetItemVersion(
    datasetId: string | null,
    itemId: string | null,
    datasetVersion: number | null
) {
    return useMastraFetch<DatasetItemVersionResponse | null>(async () => {
        if (
            datasetId === null ||
            itemId === null ||
            datasetVersion === null ||
            datasetId === undefined ||
            itemId === undefined
        ) {
            return null
        }

        return await mastraClient.getDatasetItemVersion(
            datasetId,
            itemId,
            datasetVersion
        )
    }, [datasetId, itemId, datasetVersion])
}

export function useDatasetVersions(
    datasetId: string | null,
    pagination?: { page?: number; perPage?: number }
) {
    return useMastraFetch<MastraDatasetVersionsResponse | null>(async () => {
        if (datasetId === null || datasetId === undefined) {
            return null
        }

        return await mastraClient.listDatasetVersions(datasetId, pagination)
    }, [datasetId, pagination?.page, pagination?.perPage])
}

export function useDatasetExperiments(
    datasetId: string | null,
    pagination?: { page?: number; perPage?: number }
) {
    return useMastraFetch<MastraDatasetExperimentsResponse | null>(async () => {
        if (datasetId === null || datasetId === undefined) {
            return null
        }

        return await mastraClient.listDatasetExperiments(datasetId, pagination)
    }, [datasetId, pagination?.page, pagination?.perPage])
}

export function useDatasetExperiment(
    datasetId: string | null,
    experimentId: string | null
) {
    return useMastraFetch<DatasetExperiment | null>(async () => {
        if (
            datasetId === null ||
            experimentId === null ||
            datasetId === undefined ||
            experimentId === undefined
        ) {
            return null
        }

        return await mastraClient.getDatasetExperiment(datasetId, experimentId)
    }, [datasetId, experimentId])
}

export function useDatasetExperimentResults(
    datasetId: string | null,
    experimentId: string | null,
    pagination?: { page?: number; perPage?: number }
) {
    return useMastraFetch<MastraDatasetExperimentResultsResponse | null>(async () => {
        if (
            datasetId === null ||
            experimentId === null ||
            datasetId === undefined ||
            experimentId === undefined
        ) {
            return null
        }

        return await mastraClient.listDatasetExperimentResults(
            datasetId,
            experimentId,
            pagination
        )
    }, [datasetId, experimentId, pagination?.page, pagination?.perPage])
}

export function useCompareExperiments(params: CompareExperimentsParams | null) {
    return useMastraFetch<CompareExperimentsResponse | null>(async () => {
        if (params === null) {
            return null
        }

        return await mastraClient.compareExperiments(params)
    }, [params])
}

// Logs hooks
export function useLogs(transportId?: string) {
    return useMastraFetch(async () => {
        return await mastraClient.listLogs({ transportId: transportId ?? '' })
    }, [transportId])
}

export function useRunLogs(runId: string | null, transportId?: string) {
    return useMastraFetch(async () => {
        if (runId === null || runId === undefined) {
            return null
        }
        return await mastraClient.getLogForRun({
            runId,
            transportId: transportId ?? '',
        })
    }, [runId, transportId])
}

export function useLogTransports() {
    return useMastraFetch(async () => {
        return await mastraClient.listLogTransports()
    }, [])
}

// Telemetry hooks - use useAITraces instead

// Action hooks (mutations)
export function useExecuteTool() {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<Error | null>(null)
    const [result, setResult] = useState<unknown>(null)

    const execute = useCallback(
        async (
            toolId: string,
            data: Record<string, unknown>,
            options?: { runId?: string; threadId?: string; resourceId?: string }
        ) => {
            setLoading(true)
            setError(null)
            try {
                const tool = mastraClient.getTool(toolId)
                const params: Record<string, unknown> & { data: unknown } = {
                    data,
                    args: data,
                }
                if (options?.runId !== undefined && options?.runId !== null) {
                    params.runId = options.runId
                }
                if (
                    options?.threadId !== undefined &&
                    options?.threadId !== null
                ) {
                    params.threadId = options.threadId
                }
                if (
                    options?.resourceId !== undefined &&
                    options?.resourceId !== null
                ) {
                    params.resourceId = options.resourceId
                }
                const res: unknown = await tool.execute(params)
                setResult(res)
                return res
            } catch (err) {
                const errorInstance =
                    err instanceof Error ? err : new Error(String(err))
                setError(errorInstance)
                throw errorInstance
            } finally {
                setLoading(false)
            }
        },
        []
    )

    return { execute, loading, error, result }
}

export function useCreateMemoryThread() {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<Error | null>(null)

    const create = useCallback(
        async (params: {
            title: string
            metadata?: Record<string, unknown>
            resourceId: string
            agentId: string
        }) => {
            setLoading(true)
            setError(null)
            try {
                return await mastraClient.createMemoryThread(params)
            } catch (err) {
                const errorInstance =
                    err instanceof Error ? err : new Error(String(err))
                setError(errorInstance)
                throw errorInstance
            } finally {
                setLoading(false)
            }
        },
        []
    )

    return { create, loading, error }
}

export function useCreateDataset() {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<Error | null>(null)

    const create = useCallback(async (params: CreateDatasetParams) => {
        setLoading(true)
        setError(null)
        try {
            return await mastraClient.createDataset(params)
        } catch (err) {
            const errorInstance = err instanceof Error ? err : new Error(String(err))
            setError(errorInstance)
            throw errorInstance
        } finally {
            setLoading(false)
        }
    }, [])

    return { create, loading, error }
}

export function useUpdateDataset() {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<Error | null>(null)

    const update = useCallback(async (params: UpdateDatasetParams) => {
        setLoading(true)
        setError(null)
        try {
            return await mastraClient.updateDataset(params)
        } catch (err) {
            const errorInstance = err instanceof Error ? err : new Error(String(err))
            setError(errorInstance)
            throw errorInstance
        } finally {
            setLoading(false)
        }
    }, [])

    return { update, loading, error }
}

export function useDeleteDataset() {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<Error | null>(null)

    const remove = useCallback(async (datasetId: string) => {
        setLoading(true)
        setError(null)
        try {
            return await mastraClient.deleteDataset(datasetId)
        } catch (err) {
            const errorInstance = err instanceof Error ? err : new Error(String(err))
            setError(errorInstance)
            throw errorInstance
        } finally {
            setLoading(false)
        }
    }, [])

    return { remove, loading, error }
}

export function useAddDatasetItem() {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<Error | null>(null)

    const add = useCallback(async (params: AddDatasetItemParams) => {
        setLoading(true)
        setError(null)
        try {
            return await mastraClient.addDatasetItem(params)
        } catch (err) {
            const errorInstance = err instanceof Error ? err : new Error(String(err))
            setError(errorInstance)
            throw errorInstance
        } finally {
            setLoading(false)
        }
    }, [])

    return { add, loading, error }
}

export function useUpdateDatasetItem() {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<Error | null>(null)

    const update = useCallback(async (params: UpdateDatasetItemParams) => {
        setLoading(true)
        setError(null)
        try {
            return await mastraClient.updateDatasetItem(params)
        } catch (err) {
            const errorInstance = err instanceof Error ? err : new Error(String(err))
            setError(errorInstance)
            throw errorInstance
        } finally {
            setLoading(false)
        }
    }, [])

    return { update, loading, error }
}

export function useDeleteDatasetItem() {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<Error | null>(null)

    const remove = useCallback(async (datasetId: string, itemId: string) => {
        setLoading(true)
        setError(null)
        try {
            return await mastraClient.deleteDatasetItem(datasetId, itemId)
        } catch (err) {
            const errorInstance = err instanceof Error ? err : new Error(String(err))
            setError(errorInstance)
            throw errorInstance
        } finally {
            setLoading(false)
        }
    }, [])

    return { remove, loading, error }
}

export function useBatchInsertDatasetItems() {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<Error | null>(null)

    const insert = useCallback(async (params: BatchInsertDatasetItemsParams) => {
        setLoading(true)
        setError(null)
        try {
            return await mastraClient.batchInsertDatasetItems(params)
        } catch (err) {
            const errorInstance = err instanceof Error ? err : new Error(String(err))
            setError(errorInstance)
            throw errorInstance
        } finally {
            setLoading(false)
        }
    }, [])

    return { insert, loading, error }
}

export function useBatchDeleteDatasetItems() {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<Error | null>(null)

    const remove = useCallback(async (params: BatchDeleteDatasetItemsParams) => {
        setLoading(true)
        setError(null)
        try {
            return await mastraClient.batchDeleteDatasetItems(params)
        } catch (err) {
            const errorInstance = err instanceof Error ? err : new Error(String(err))
            setError(errorInstance)
            throw errorInstance
        } finally {
            setLoading(false)
        }
    }, [])

    return { remove, loading, error }
}

export function useTriggerDatasetExperiment() {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<Error | null>(null)

    const trigger = useCallback(async (params: TriggerDatasetExperimentParams) => {
        setLoading(true)
        setError(null)
        try {
            return await mastraClient.triggerDatasetExperiment(params)
        } catch (err) {
            const errorInstance = err instanceof Error ? err : new Error(String(err))
            setError(errorInstance)
            throw errorInstance
        } finally {
            setLoading(false)
        }
    }, [])

    return { trigger, loading, error }
}

export function useUpdateWorkingMemory() {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<Error | null>(null)

    const update = useCallback(
        async (params: {
            agentId: string
            threadId: string
            workingMemory: string
            resourceId?: string
        }) => {
            setLoading(true)
            setError(null)
            try {
                await mastraClient.updateWorkingMemory(params)
            } catch (err) {
                const errorInstance =
                    err instanceof Error ? err : new Error(String(err))
                setError(errorInstance)
                throw errorInstance
            } finally {
                setLoading(false)
            }
        },
        []
    )

    return { update, loading, error }
}

export function useVectorQuery() {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<Error | null>(null)
    const [results, setResults] = useState<unknown[]>([])

    const query = useCallback(
        async (
            vectorName: string,
            params: {
                indexName: string
                queryVector: number[]
                topK?: number
                filter?: Record<string, unknown>
                includeVector?: boolean
            }
        ) => {
            setLoading(true)
            setError(null)
            try {
                const vector = mastraClient.getVector(vectorName)
                const res = await vector.query(params)
                const queryResults = Array.isArray(res) ? res : []
                setResults(queryResults)
                return res
            } catch (err) {
                const errorInstance =
                    err instanceof Error ? err : new Error(String(err))
                setError(errorInstance)
                throw errorInstance
            } finally {
                setLoading(false)
            }
        },
        []
    )

    return { query, loading, error, results }
}

export function useScoreTraces() {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<Error | null>(null)

    const score = useCallback(
        async (params: {
            scorerName: string
            targets: Array<{ traceId: string; spanId?: string }>
        }) => {
            setLoading(true)
            setError(null)
            try {
                return await mastraClient.score(params)
            } catch (err) {
                const errorInstance =
                    err instanceof Error ? err : new Error(String(err))
                setError(errorInstance)
                throw errorInstance
            } finally {
                setLoading(false)
            }
        },
        []
    )

    return { score, loading, error }
}

export function useSaveScore() {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<Error | null>(null)

    const save = useCallback(
        async (params: Parameters<typeof mastraClient.saveScore>[0]) => {
            setLoading(true)
            setError(null)
            try {
                return await mastraClient.saveScore(params)
            } catch (err) {
                const errorInstance =
                    err instanceof Error ? err : new Error(String(err))
                setError(errorInstance)
                throw errorInstance
            } finally {
                setLoading(false)
            }
        },
        []
    )

    return { save, loading, error }
}

