"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { mastraClient } from "@/lib/mastra-client"
import type {
  Agent,
  Workflow,
  Tool,
  MemoryThread,
  Message,
  VectorQueryResult,
} from "@/lib/types/mastra-api"

// Query Keys - centralized for cache management
export const queryKeys = {
  agents: ["agents"] as const,
  agent: (id: string) => ["agents", id] as const,
  agentEvals: (id: string) => ["agents", id, "evals"] as const,
  workflows: ["workflows"] as const,
  workflow: (id: string) => ["workflows", id] as const,
  tools: ["tools"] as const,
  tool: (id: string) => ["tools", id] as const,
  traces: (filters?: Record<string, unknown>) => ["traces", filters] as const,
  trace: (id: string) => ["traces", id] as const,
  threads: (resourceId: string, agentId: string) =>
    ["threads", resourceId, agentId] as const,
  thread: (id: string, agentId: string) => ["threads", id, agentId] as const,
  messages: (threadId: string, agentId: string) =>
    ["messages", threadId, agentId] as const,
  workingMemory: (agentId: string, threadId: string, resourceId?: string) =>
    ["workingMemory", agentId, threadId, resourceId] as const,
  memoryStatus: (agentId: string) => ["memoryStatus", agentId] as const,
  logs: (transportId?: string) => ["logs", transportId] as const,
  runLogs: (runId: string, transportId?: string) =>
    ["runLogs", runId, transportId] as const,
  logTransports: ["logTransports"] as const,
  telemetry: (params?: Record<string, unknown>) => ["telemetry", params] as const,
  vectors: (vectorName: string) => ["vectors", vectorName] as const,
  vectorDetails: (vectorName: string, indexName: string) =>
    ["vectors", vectorName, indexName] as const,
}

// Agents Queries
export function useAgentsQuery() {
  return useQuery({
    queryKey: queryKeys.agents,
    queryFn: async (): Promise<Agent[]> => {
      const agents = await mastraClient.getAgents()
      return Object.entries(agents).map(([id, agent]) => ({
        id,
        name: (agent as unknown as Record<string, unknown>).name as string | undefined,
        description: (agent as unknown as Record<string, unknown>).description as string | undefined,
        model: (agent as unknown as Record<string, unknown>).model as string | undefined,
        instructions: (agent as unknown as Record<string, unknown>).instructions as string | undefined,
      })) as Agent[]
    },
  })
}

export function useAgentQuery(agentId: string | null) {
  return useQuery({
    queryKey: queryKeys.agent(agentId ?? ""),
    queryFn: async (): Promise<Agent | null> => {
      if (!agentId) return null
      const agent = mastraClient.getAgent(agentId)
      const details = await agent.details()
      return {
        id: agentId,
        name: details.name,
        description: details.description,
        model: (details as unknown as Record<string, unknown>).model as string | undefined,
        instructions: typeof details.instructions === 'string' 
          ? details.instructions 
          : JSON.stringify(details.instructions),
        tools: details.tools 
          ? Object.keys(details.tools).map(id => ({ id, name: id }))
          : [],
      } as Agent
    },
    enabled: !!agentId,
  })
}

export function useAgentEvalsQuery(agentId: string | null) {
  return useQuery({
    queryKey: queryKeys.agentEvals(agentId ?? ""),
    queryFn: async () => {
      if (!agentId) return { ci: [], live: [] }
      const agent = mastraClient.getAgent(agentId)
      const [ciResult, liveResult] = await Promise.all([
        agent.evals(),
        agent.liveEvals(),
      ])
      // Transform to expected format
      const ci = Array.isArray(ciResult) ? ciResult : []
      const live = Array.isArray(liveResult) ? liveResult : []
      return { ci, live }
    },
    enabled: !!agentId,
  })
}

// Workflows Queries
export function useWorkflowsQuery() {
  return useQuery({
    queryKey: queryKeys.workflows,
    queryFn: async (): Promise<Workflow[]> => {
      const workflows = await mastraClient.getWorkflows()
      return Object.entries(workflows).map(([id, wf]) => ({
        id,
        name: (wf as unknown as Record<string, unknown>).name as string | undefined,
        description: (wf as unknown as Record<string, unknown>).description as string | undefined,
      })) as Workflow[]
    },
  })
}

export function useWorkflowQuery(workflowId: string | null) {
  return useQuery({
    queryKey: queryKeys.workflow(workflowId ?? ""),
    queryFn: async (): Promise<Workflow | null> => {
      if (!workflowId) return null
      const workflow = mastraClient.getWorkflow(workflowId)
      const details = await workflow.details()
      return {
        id: workflowId,
        name: details.name,
        description: details.description,
        steps: details.steps 
          ? Object.entries(details.steps).map(([stepId, step]) => ({
              id: stepId,
              name: (step as Record<string, unknown>).name as string | undefined,
              description: (step as Record<string, unknown>).description as string | undefined,
            }))
          : [],
      } as Workflow
    },
    enabled: !!workflowId,
  })
}

// Tools Queries
export function useToolsQuery() {
  return useQuery({
    queryKey: queryKeys.tools,
    queryFn: async (): Promise<Tool[]> => {
      const tools = await mastraClient.getTools()
      return Object.entries(tools).map(([toolId, tool]) => ({
        id: toolId,
        name: (tool as unknown as Record<string, unknown>).name as string | undefined ?? toolId,
        description: (tool as unknown as Record<string, unknown>).description as string | undefined,
      })) as Tool[]
    },
  })
}

export function useToolQuery(toolId: string | null) {
  return useQuery({
    queryKey: queryKeys.tool(toolId ?? ""),
    queryFn: async (): Promise<Tool | null> => {
      if (!toolId) return null
      const tool = mastraClient.getTool(toolId)
      const details = await tool.details()
      return {
        id: details.id ?? toolId,
        name: toolId,
        description: details.description,
      } as Tool
    },
    enabled: !!toolId,
  })
}

// Traces Queries
export function useTracesQuery(params?: {
  page?: number
  perPage?: number
  dateRange?: { start: Date; end: Date }
}) {
  return useQuery({
    queryKey: queryKeys.traces(params),
    queryFn: async () => {
      const result = await mastraClient.getAITraces({
        pagination: {
          page: params?.page ?? 1,
          perPage: params?.perPage ?? 20,
          dateRange: params?.dateRange,
        },
      })
      return {
        spans: result.spans ?? [],
        pagination: {
          page: result.pagination?.page ?? 1,
          perPage: result.pagination?.perPage ?? 20,
          totalPages: (result.pagination as unknown as Record<string, number>)?.totalPages ?? 1,
          total: result.pagination?.total,
        },
      }
    },
  })
}

export function useTraceQuery(traceId: string | null) {
  return useQuery({
    queryKey: queryKeys.trace(traceId ?? ""),
    queryFn: async () => {
      if (!traceId) return null
      return await mastraClient.getAITrace(traceId)
    },
    enabled: !!traceId,
  })
}

// Memory Queries
export function useMemoryThreadsQuery(resourceId: string, agentId: string) {
  return useQuery({
    queryKey: queryKeys.threads(resourceId, agentId),
    queryFn: async (): Promise<MemoryThread[]> => {
      const threads = await mastraClient.getMemoryThreads({ resourceId, agentId })
      if (Array.isArray(threads)) {
        return threads.map(t => ({
          ...t,
          createdAt: t.createdAt instanceof Date ? t.createdAt.toISOString() : t.createdAt,
          updatedAt: t.updatedAt instanceof Date ? t.updatedAt.toISOString() : t.updatedAt,
        })) as MemoryThread[]
      }
      return []
    },
    enabled: !!resourceId && !!agentId,
  })
}

export function useMemoryMessagesQuery(
  threadId: string | null,
  agentId: string,
  limit = 50
) {
  return useQuery({
    queryKey: queryKeys.messages(threadId ?? "", agentId),
    queryFn: async (): Promise<Message[]> => {
      if (!threadId) return []
      const thread = mastraClient.getMemoryThread(threadId, agentId)
      const result = await thread.getMessages({ limit })
      return (result.messages ?? []) as Message[]
    },
    enabled: !!threadId && !!agentId,
  })
}

export function useWorkingMemoryQuery(
  agentId: string,
  threadId: string,
  resourceId?: string
) {
  return useQuery({
    queryKey: queryKeys.workingMemory(agentId, threadId, resourceId),
    queryFn: async () => {
      return await mastraClient.getWorkingMemory({
              agentId,
              threadId,
              resourceId,
            });
    },
    enabled: !!agentId && !!threadId,
  })
}

export function useMemoryStatusQuery(agentId: string) {
  return useQuery({
    queryKey: queryKeys.memoryStatus(agentId),
    queryFn: async () => await mastraClient.getMemoryStatus(agentId),
    enabled: !!agentId,
  })
}

// Logs Queries
export function useLogsQuery(transportId?: string) {
  return useQuery({
    queryKey: queryKeys.logs(transportId),
    queryFn: async () => {
      const logs = await mastraClient.getLogs({ transportId: transportId ?? "" })
      return Array.isArray(logs) ? logs : []
    },
  })
}

export function useRunLogsQuery(runId: string | null, transportId?: string) {
  return useQuery({
    queryKey: queryKeys.runLogs(runId ?? "", transportId),
    queryFn: async () => {
      if (!runId) return null
      return await mastraClient.getLogForRun({ runId, transportId: transportId ?? "" })
    },
    enabled: !!runId,
  })
}

export function useLogTransportsQuery() {
  return useQuery({
    queryKey: queryKeys.logTransports,
    queryFn: async () => await mastraClient.getLogTransports(),
  })
}

// Telemetry Queries
export function useTelemetryQuery(params?: {
  name?: string
  scope?: string
  page?: number
  perPage?: number
  attribute?: Record<string, string>
}) {
  return useQuery({
    queryKey: queryKeys.telemetry(params),
    queryFn: async () => {
      const result = await mastraClient.getTelemetry(params)
      return Array.isArray(result) ? result : []
    },
  })
}

// Vector Queries
export function useVectorIndexesQuery(vectorName: string) {
  return useQuery({
    queryKey: queryKeys.vectors(vectorName),
    queryFn: async () => {
      const vector = mastraClient.getVector(vectorName)
      const result = await vector.getIndexes()
      // Transform { indexes: string[] } to VectorIndex[]
      const indexes = result.indexes ?? []
      return indexes.map((name: string) => ({ name }))
    },
    enabled: !!vectorName,
  })
}

export function useVectorDetailsQuery(vectorName: string, indexName: string | null) {
  return useQuery({
    queryKey: queryKeys.vectorDetails(vectorName, indexName ?? ""),
    queryFn: async () => {
      if (!indexName) return null
      const vector = mastraClient.getVector(vectorName)
      return await vector.details(indexName)
    },
    enabled: !!vectorName && !!indexName,
  })
}

// Mutations
export function useExecuteToolMutation() {
  return useMutation({
    mutationFn: async ({
      toolId,
      data,
      runId,
    }: {
      toolId: string
      data: Record<string, unknown>
      runId?: string
    }) => {
      const tool = mastraClient.getTool(toolId)
      return tool.execute({ data, runId })
    },
  })
}

export function useCreateThreadMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: {
      title: string
      resourceId: string
      agentId: string
      metadata?: Record<string, unknown>
    }) => {
      return mastraClient.createMemoryThread(params)
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.threads(variables.resourceId, variables.agentId),
      })
    },
  })
}

export function useUpdateWorkingMemoryMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: {
      agentId: string
      threadId: string
      workingMemory: string
      resourceId?: string
    }) => {
      return mastraClient.updateWorkingMemory(params)
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.workingMemory(
          variables.agentId,
          variables.threadId,
          variables.resourceId
        ),
      })
    },
  })
}

export function useVectorQueryMutation() {
  return useMutation({
    mutationFn: async ({
      vectorName,
      params,
    }: {
      vectorName: string
      params: {
        indexName: string
        queryVector: number[]
        topK?: number
        filter?: Record<string, unknown>
        includeVector?: boolean
      }
    }): Promise<VectorQueryResult[]> => {
      const vector = mastraClient.getVector(vectorName)
      const res = await vector.query(params)
      // Transform response to expected format
      return Array.isArray(res) ? res as VectorQueryResult[] : []
    },
  })
}

export function useScoreTracesMutation() {
  return useMutation({
    mutationFn: async (params: {
      scorerName: string
      targets: Array<{ traceId: string; spanId?: string }>
    }) => {
      return mastraClient.score(params)
    },
  })
}
