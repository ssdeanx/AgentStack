"use client"

import { useCallback, useEffect, useState } from "react"
import type { Message } from "@/lib/types/mastra-api"
import { mastraClient } from "@/lib/mastra-client"

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
    refetch()
  }, deps)

  return { data, loading, error, refetch }
}

// Agents hooks
export function useAgents() {
  return useMastraFetch(async () => {
    const agents = await mastraClient.listAgents()
    return Object.entries(agents).map(([id, agent]) => {
      const rec = agent as unknown as Record<string, unknown>
      let modelStr: string | undefined = undefined
      if (typeof rec.modelId === 'string') { modelStr = rec.modelId }
      else if (typeof rec.model === 'string') { modelStr = rec.model }
      else if (typeof rec.model === 'object' && rec.model !== null && typeof (rec.model as Record<string, unknown>).name === 'string') { modelStr = (rec.model as Record<string, unknown>).name as string }
      return { ...(agent as unknown as Record<string, unknown>), id, model: modelStr }
    })
  }, [])
}

export function useAgent(agentId: string | null) {
  return useMastraFetch(
    async () => {
      if (agentId === null || agentId === undefined) {return null}
      const agent = mastraClient.getAgent(agentId)
      const details = await agent.details()
      const det = details as unknown as Record<string, unknown>
      const detModelId = typeof det.modelId === 'string' ? det.modelId : undefined
      const detModelField = det.model
      let detModelStr: string | undefined = undefined
      if (detModelId !== undefined && detModelId !== null) { detModelStr = detModelId }
      else if (typeof detModelField === 'string') { detModelStr = detModelField }
      else if (typeof detModelField === 'object' && detModelField !== null && typeof (detModelField as Record<string, unknown>).name === 'string') { detModelStr = (detModelField as Record<string, unknown>).name as string }
      const tools = Array.isArray(det.tools)
        ? (det.tools as unknown[]).map((t) => (typeof t === 'string' ? { id: t, name: t } : { id: (t as Record<string, unknown>).id as string, name: (t as Record<string, unknown>).name as string | undefined }))
        : Object.entries((det.tools ?? {}) as Record<string, unknown>).map(([id, val]) => ({ id, name: typeof val === 'object' && val !== null ? (val as Record<string, unknown>).name as string | undefined : undefined }))
      return { ...details, id: agentId, model: detModelStr, tools }
    },
    [agentId]
  )
}

// Workflows hooks
export function useWorkflows() {
  return useMastraFetch(async () => {
    const wf = await mastraClient.listWorkflows()
    return Object.entries(wf).map(([id, w]) => ({ id, ...(w as unknown as Record<string, unknown>) }))
  }, [])
}

export function useWorkflow(workflowId: string | null) {
  return useMastraFetch(
    async () => {
      if (workflowId === null || workflowId === undefined) {return null}
      const workflow = mastraClient.getWorkflow(workflowId)
      const details = await workflow.details()
      const det = details as unknown as Record<string, unknown>
      const steps = Array.isArray(det.steps)
        ? (det.steps as unknown[]).map((s) => ({ id: (s as Record<string, unknown>).id as string, name: (s as Record<string, unknown>).name as string | undefined, description: (s as Record<string, unknown>).description as string | undefined }))
        : Object.entries((det.steps ?? {}) as Record<string, unknown>).map(([id, s]) => ({ id, name: (s as Record<string, unknown>).name as string | undefined, description: (s as Record<string, unknown>).description as string | undefined }))
      return { id: workflowId, ...details, steps }
    },
    [workflowId]
  )
}

// Tools hooks
export function useTools() {
  return useMastraFetch(async () => {
    const tools = await mastraClient.listTools()
    return Object.entries(tools).map(([toolId, tool]) => ({
      ...(tool as unknown as Record<string, unknown>),
      id: toolId
    }))
  }, [])
}

export function useTool(toolId: string | null) {
  return useMastraFetch(
    async () => {
      if (!toolId) {return null}
      const tool = mastraClient.getTool(toolId)
      const details = await tool.details()
      return {
        ...(details as unknown as Record<string, unknown>),
        id: toolId
      }
    },
    [toolId]
  )
}

// Vectors hooks
export function useVectorIndexes(vectorName: string) {
  return useMastraFetch(async () => {
    const vector = mastraClient.getVector(vectorName)
    return await vector.getIndexes();
  }, [vectorName])
}

export function useVectorDetails(vectorName: string, indexName: string | null) {
  return useMastraFetch(
    async () => {
      if (indexName === null) {return null}
      const vector = mastraClient.getVector(vectorName)
      return await vector.details(indexName);
    },
    [vectorName, indexName]
  )
}

// Memory hooks
export function useMemoryThreads(resourceId: string, agentId: string) {
  return useMastraFetch(
    async () => {
      return await mastraClient.listMemoryThreads({ resourceId, agentId });
    },
    [resourceId, agentId]
  )
}

export function useMemoryThread(threadId: string | null, agentId: string) {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

   const fetchMessages = useCallback(
    async () => {
      if (threadId === null) { return }
      setLoading(true)
      try {
        const thread = mastraClient.getMemoryThread({ threadId, agentId })
          const result = await thread.listMessages({})
        const dbMessages: unknown[] = result.messages ?? []
        const uiMessages: Message[] = dbMessages.map((m: unknown) => {
          const record = m as Record<string, unknown>
          const contentRaw = record.content
          let contentStr = ''
          if (typeof contentRaw === 'string') {
            contentStr = contentRaw
          } else if (
            typeof contentRaw === 'object' && contentRaw !== null && typeof (contentRaw as Record<string, unknown>).content === 'string'
          ) {
            contentStr = (contentRaw as Record<string, unknown>).content as string
          } else if (
            typeof contentRaw === 'object' && contentRaw !== null && Array.isArray((contentRaw as Record<string, unknown>).parts)
          ) {
            const parts = (contentRaw as Record<string, unknown>).parts as unknown[]
            contentStr = parts.map((p) => (typeof p === 'object' && p !== null && (p as Record<string, unknown>).text ? (p as Record<string, unknown>).text as string : '')).join(' ')
          } else {
            contentStr = JSON.stringify(contentRaw)
          }
          return {
            id: (record.id as string) ?? '',
            role: (record.role as Message['role']) ?? 'user',
            content: contentStr,
            threadId: (record.threadId as string | undefined),
            createdAt: (record.createdAt as string | undefined),
            type: (record.type as string | undefined),
          }
        })
        setMessages(uiMessages)
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)))
      } finally {
        setLoading(false)
      }
    },
    [threadId, agentId]
  )

  useEffect(() => {
    fetchMessages()
  }, [fetchMessages])

  return { messages, loading, error, refetch: fetchMessages }
}

export function useWorkingMemory(agentId: string, threadId: string, resourceId?: string) {
  return useMastraFetch(
    async () => {
      return await mastraClient.getWorkingMemory({
              agentId,
              threadId,
              resourceId,
            });
    },
    [agentId, threadId, resourceId]
  )
}

export function useMemoryStatus(agentId: string) {
  return useMastraFetch(
    async () => {
      return await mastraClient.getMemoryStatus(agentId);
    },
    [agentId]
  )
}

// Observability hooks
export function useAITraces(params?: {
  page?: number
  perPage?: number
  filters?: {
    name?: string
    spanType?: string
    entityId?: string
    entityType?: "agent" | "workflow"
  }
  dateRange?: { start: Date; end: Date }
}) {
  return useMastraFetch(
    async () => {
      return await mastraClient.getTraces({
        pagination: {
          page: params?.page ?? 1,
          perPage: params?.perPage ?? 20,
          dateRange: params?.dateRange,
        },
        filters: params?.filters as Parameters<typeof mastraClient.getTraces>[0]["filters"],
      })
    },
    [params?.page, params?.perPage, JSON.stringify(params?.filters)]
  )
}

export function useAITrace(traceId: string | null) {
  return useMastraFetch(
    async () => {
      if (!traceId) {return null}
      return await mastraClient.getTrace(traceId);
    },
    [traceId]
  )
}

// Logs hooks
export function useLogs(transportId?: string) {
  return useMastraFetch(
    async () => {
      return await mastraClient.listLogs({ transportId: transportId ?? "" })
    },
    [transportId]
  )
}

export function useRunLogs(runId: string | null, transportId?: string) {
  return useMastraFetch(
    async () => {
      if (!runId) {return null}
      return await mastraClient.getLogForRun({ runId, transportId: transportId ?? "" })
    },
    [runId, transportId]
  )
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
    async (toolId: string, data: Record<string, unknown>, options?: { runId?: string; threadId?: string; resourceId?: string }) => {
      setLoading(true)
      setError(null)
      try {
        const tool = mastraClient.getTool(toolId)
        const params: Record<string, unknown> & { data: unknown } = { data, args: data }
        if (options?.runId !== undefined && options?.runId !== null) { params.runId = options.runId }
        if (options?.threadId !== undefined && options?.threadId !== null) { params.threadId = options.threadId }
        if (options?.resourceId !== undefined && options?.resourceId !== null) { params.resourceId = options.resourceId }
        const res = await tool.execute(params)
        setResult(res)
        return res
      } catch (err) {
        const errorInstance = err instanceof Error ? err : new Error(String(err))
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
        return await mastraClient.createMemoryThread(params);
      } catch (err) {
        const errorInstance = err instanceof Error ? err : new Error(String(err))
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
        const errorInstance = err instanceof Error ? err : new Error(String(err))
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
        const errorInstance = err instanceof Error ? err : new Error(String(err))
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
        return await mastraClient.score(params);
      } catch (err) {
        const errorInstance = err instanceof Error ? err : new Error(String(err))
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
