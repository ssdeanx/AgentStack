"use client"

import { useCallback, useEffect, useState } from "react"
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
    const agents = await mastraClient.getAgents()
    return Object.entries(agents).map(([id, agent]) => ({ id, ...agent }))
  }, [])
}

export function useAgent(agentId: string | null) {
  return useMastraFetch(
    async () => {
      if (!agentId) {return null}
      const agent = mastraClient.getAgent(agentId)
      const details = await agent.details()
      return { id: agentId, ...details }
    },
    [agentId]
  )
}

export function useAgentEvals(agentId: string | null) {
  return useMastraFetch(
    async () => {
      if (!agentId) {return { ci: [], live: [] }}
      const agent = mastraClient.getAgent(agentId)
      const [ci, live] = await Promise.all([agent.evals(), agent.liveEvals()])
      return { ci, live }
    },
    [agentId]
  )
}

// Workflows hooks
export function useWorkflows() {
  return useMastraFetch(async () => {
    return await mastraClient.getWorkflows()
  }, [])
}

export function useWorkflow(workflowId: string | null) {
  return useMastraFetch(
    async () => {
      if (!workflowId) {return null}
      const workflow = mastraClient.getWorkflow(workflowId)
      const details = await workflow.details()
      return { id: workflowId, ...details }
    },
    [workflowId]
  )
}

// Tools hooks
export function useTools() {
  return useMastraFetch(async () => {
    const tools = await mastraClient.getTools()
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
      return await mastraClient.getMemoryThreads({ resourceId, agentId });
    },
    [resourceId, agentId]
  )
}

export function useMemoryThread(threadId: string | null, agentId: string) {
  const [messages, setMessages] = useState<unknown[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

   const fetchMessages = useCallback(
    async (limit = 50) => {
      if (threadId === null) { return }
      setLoading(true)
      try {
        const thread = mastraClient.getMemoryThread(threadId, agentId)
        const result = await thread.getMessages({ limit })
        setMessages(result.messages ?? [])
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
      return await mastraClient.getAITraces({
        pagination: {
          page: params?.page ?? 1,
          perPage: params?.perPage ?? 20,
          dateRange: params?.dateRange,
        },
        filters: params?.filters as Parameters<typeof mastraClient.getAITraces>[0]["filters"],
      })
    },
    [params?.page, params?.perPage, JSON.stringify(params?.filters)]
  )
}

export function useAITrace(traceId: string | null) {
  return useMastraFetch(
    async () => {
      if (!traceId) {return null}
      return await mastraClient.getAITrace(traceId);
    },
    [traceId]
  )
}

// Logs hooks
export function useLogs(transportId?: string) {
  return useMastraFetch(
    async () => {
      return await mastraClient.getLogs({ transportId: transportId ?? "" })
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
    return await mastraClient.getLogTransports()
  }, [])
}

// Telemetry hooks
export function useTelemetry(params?: {
  name?: string
  scope?: string
  page?: number
  perPage?: number
  attribute?: Record<string, string>
}) {
  return useMastraFetch(
    async () => {
      return await mastraClient.getTelemetry(params);
    },
    [params?.name, params?.scope, params?.page, params?.perPage]
  )
}

// Action hooks (mutations)
export function useExecuteTool() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [result, setResult] = useState<unknown>(null)

  const execute = useCallback(
    async (toolId: string, data: Record<string, unknown>, options?: { runId?: string }) => {
      setLoading(true)
      setError(null)
      try {
        const tool = mastraClient.getTool(toolId)
        const res = await tool.execute({ data, ...options })
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
