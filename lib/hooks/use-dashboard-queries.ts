"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { mastraClient } from "@/lib/mastra-client"
import {
  listAgentsTyped,
  listWorkflowsTyped,
  listToolsTyped,
  getTracesTyped,
  listMemoryThreadsTyped,
  getThreadMessagesTyped,
  listLogsTypedPaged,
  getMcpServersTyped,
  getMcpServerToolsTyped,
  agentGenerateTyped,
  agentExecuteToolTyped,
} from "@/lib/api"
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
export function useAgentsQuery(opts?: { page?: number; perPage?: number; orderBy?: { field: string; direction?: 'ASC' | 'DESC' } }) {
  return useQuery({
    queryKey: queryKeys.agents,
    queryFn: async (): Promise<Agent[]> => {
      const data = await listAgentsTyped(opts)
      // data can be { agents: {...}, pagination? } or Record<string,Agent>
      const records = (data as { agents?: Record<string, Agent> }).agents ?? (data as Record<string, Agent>)
      return Object.entries(records).map(([id, agent]) => {
        const rec = agent as unknown as Record<string, unknown>
        let modelStr: string | undefined = undefined
        if (typeof rec.modelId === 'string') {
          modelStr = rec.modelId
        } else if (typeof rec.model === 'string') {
          modelStr = rec.model
        } else if (typeof rec.model === 'object' && rec.model !== null && typeof (rec.model as Record<string, unknown>).name === 'string') {
          modelStr = (rec.model as Record<string, unknown>).name as string
        }
        return {
          id,
          name: rec.name as string | undefined,
          description: rec.description as string | undefined,
          model: modelStr,
          instructions: rec.instructions as string | undefined,
        }
      }) as Agent[]
    },
  })
}

export function useAgentQuery(agentId: string | null) {
  return useQuery({
    queryKey: queryKeys.agent(agentId ?? ""),
    queryFn: async (): Promise<Agent | null> => {
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
      return {
        id: agentId,
        name: details.name,
        description: details.description,
          model: detModelStr,
        instructions: typeof details.instructions === "string"
          ? details.instructions
          : JSON.stringify(details.instructions),
        tools: Array.isArray(det.tools)
          ? (det.tools as unknown[]).map((t) => {
              if (typeof t === "string") { return { id: t, name: t } }
              if (typeof t === "object" && t !== null) {
                const tv = t as Record<string, unknown>
                return { id: (tv.id as string) ?? '', name: (tv.name as string | undefined) }
              }
              return { id: String(t), name: String(t) }
            })
          : Object.entries((det.tools ?? {}) as Record<string, unknown>).map(([id, val]) => ({ id, name: typeof val === 'object' && val !== null ? (val as Record<string, unknown>).name as string | undefined : undefined })),
      } as Agent
    },
    enabled: agentId !== null && agentId !== undefined,
  })
}

// Workflows Queries
export function useWorkflowsQuery(opts?: { page?: number; perPage?: number }) {
  return useQuery({
    queryKey: queryKeys.workflows,
    queryFn: async (): Promise<Workflow[]> => {
      const data = await listWorkflowsTyped(opts)
      const records = (data as { workflows?: Record<string, Workflow> }).workflows ?? (data as Record<string, Workflow>)
      return Object.entries(records).map(([id, wf]) => ({
        id,
        name: (wf as Record<string, unknown>).name as string | undefined,
        description: (wf as Record<string, unknown>).description as string | undefined,
      })) as Workflow[]
    },
  })
}

export function useWorkflowQuery(workflowId: string | null) {
  return useQuery({
    queryKey: queryKeys.workflow(workflowId ?? ""),
    queryFn: async (): Promise<Workflow | null> => {
      if (workflowId === null || workflowId === undefined) {return null}
      const workflow = mastraClient.getWorkflow(workflowId)
      const details = await workflow.details()
      return {
        id: workflowId,
        name: details.name,
        description: details.description,
        steps: Array.isArray(details.steps)
          ? (details.steps as unknown[]).map((s) => ({ id: (s as Record<string, unknown>).id as string, name: (s as Record<string, unknown>).name as string | undefined, description: (s as Record<string, unknown>).description as string | undefined }))
          : Object.entries(details.steps ?? {}).map(([stepId, step]) => ({
              id: stepId,
              name: (step as Record<string, unknown>).name as string | undefined,
              description: (step as Record<string, unknown>).description as string | undefined,
            })),
      } as Workflow
    },
    enabled: workflowId !== null && workflowId !== undefined,
  })
}

// Tools Queries
export function useToolsQuery(opts?: { page?: number; perPage?: number }) {
  return useQuery({
    queryKey: queryKeys.tools,
    queryFn: async (): Promise<Tool[]> => {
      const data = await listToolsTyped(opts)
      const records = (data as { tools?: Record<string, Tool> }).tools ?? (data as Record<string, Tool>)
      return Object.entries(records).map(([toolId, tool]) => ({
        id: toolId,
        name: (tool as Record<string, unknown>).name as string | undefined ?? toolId,
        description: (tool as Record<string, unknown>).description as string | undefined,
      })) as Tool[]
    },
  })
}

export function useToolQuery(toolId: string | null) {
  return useQuery({
    queryKey: queryKeys.tool(toolId ?? ""),
    queryFn: async (): Promise<Tool | null> => {
      if (toolId === null || toolId === undefined) {return null}
      const tool = mastraClient.getTool(toolId)
      const details = await tool.details()
      return {
        id: details.id ?? toolId,
        name: toolId,
        description: details.description,
      } as Tool
    },
    enabled: toolId !== null && toolId !== undefined,
  })
}

// Traces Queries
export function useTracesQuery(params?: {
  page?: number
  perPage?: number
  dateRange?: { start: Date; end: Date }
  filters?: Record<string, unknown>
}) {
  return useQuery({
    queryKey: queryKeys.traces(params),
    queryFn: async () => {
      const result = await getTracesTyped({ page: params?.page, perPage: params?.perPage, filters: params?.filters, dateRange: params?.dateRange })
      return {
        spans: result.spans ?? [],
        pagination: {
          page: result.pagination?.page ?? 1,
          perPage: result.pagination?.perPage ?? 20,
          totalPages: result.pagination?.totalPages ?? 1,
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
      if (traceId === undefined || traceId === null) { return null }
      return await mastraClient.getTrace(traceId)
    },
    enabled: traceId !== null && traceId !== undefined,
  })
}

// Memory Queries
export function useMemoryThreadsQuery(resourceId: string, agentId: string, opts?: { page?: number; perPage?: number }) {
  return useQuery({
    queryKey: queryKeys.threads(resourceId, agentId),
    queryFn: async (): Promise<MemoryThread[]> => {
      const threads = await listMemoryThreadsTyped(resourceId, agentId, opts)
      if (Array.isArray(threads)) {
        return threads.map(t => ({
          ...t,
          createdAt: t.createdAt instanceof Date ? t.createdAt.toISOString() : t.createdAt,
          updatedAt: t.updatedAt instanceof Date ? t.updatedAt.toISOString() : t.updatedAt,
        })) as MemoryThread[]
      }
      return []
    },
    enabled: resourceId !== undefined && resourceId !== null && agentId !== undefined && agentId !== null,
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
      if (threadId === null || threadId === undefined) { return [] }
      const result = await getThreadMessagesTyped(threadId, { page: 1, perPage: limit })
      const dbMessages: unknown[] = (result).messages ?? []
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
          contentStr = parts.map((p) => (typeof p === 'object' && p !== null && (Boolean((p as Record<string, unknown>).text)) ? (p as Record<string, unknown>).text as string : '')).join(' ')
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
      return uiMessages
    },
    enabled: threadId !== null && threadId !== undefined && agentId !== undefined && agentId !== null,
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
export function useLogsQuery(params?: { transportId?: string; page?: number; perPage?: number }) {
  return useQuery({
    queryKey: queryKeys.logs(params?.transportId),
    queryFn: async () => {
      const data = await listLogsTypedPaged({ transportId: params?.transportId, page: params?.page, perPage: params?.perPage })
      return Array.isArray(data) ? data : (data as { logs?: unknown[] }).logs ?? []
    },
  })
}

export function useRunLogsQuery(runId: string | null, transportId?: string) {
  return useQuery({
    queryKey: queryKeys.runLogs(runId ?? "", transportId),
    queryFn: async () => {
      if (runId === null || runId === undefined) {return null}
      return await mastraClient.getLogForRun({ runId, transportId: transportId ?? "" })
    },
    enabled: runId !== undefined && runId !== null,
  })
}

export function useLogTransportsQuery() {
  return useQuery({
    queryKey: queryKeys.logTransports,
    queryFn: async () => await mastraClient.listLogTransports(),
  })
}


// API Health
export function useApiHealthQuery() {
  return useQuery({
    queryKey: ["api-health"],
    queryFn: async () => {
      const { apiHealthCheck } = await import("@/lib/api")
      return apiHealthCheck()
    },
    staleTime: 1000 * 10,
    refetchInterval: 1000 * 30,
  })
}

// MCP servers
export function useMcpServersQuery() {
  return useQuery({
    queryKey: ["mcp-servers"],
    queryFn: async () => {
      return await getMcpServersTyped()
    },
    staleTime: 1000 * 20,
    refetchInterval: 1000 * 60,
  })
}

export function useMcpServerToolsQuery(serverId: string | null) {
  return useQuery({
    queryKey: ["mcp-server-tools", serverId],
    queryFn: async () => {
      if (serverId === null) { return {} }
      return await getMcpServerToolsTyped(serverId)
    },
    enabled: serverId !== null,
  })
}

// Agent mutations
export function useAgentGenerateMutation() {
  return useMutation({
    mutationFn: async ({ agentId, body }: { agentId: string; body: Record<string, unknown> }) => {
      return await agentGenerateTyped(agentId, body)
    },
  })
}

export function useAgentExecuteToolMutation() {
  return useMutation({
    mutationFn: async ({ agentId, toolId, data, opts }: { agentId: string; toolId: string; data: Record<string, unknown>; opts?: { threadId?: string; resourceId?: string; runId?: string } }) => {
      return await agentExecuteToolTyped(agentId, toolId, data, opts)
    },
  })
}

// Vector mutations
export function useVectorUpsertMutation() {
  return useMutation({
    mutationFn: async ({ vectorName, params }: { vectorName: string; params: { indexName: string; vectors: number[][]; metadata?: Array<Record<string, unknown>>; ids?: string[] } }) => {
      const vector = mastraClient.getVector(vectorName)
      const upsertParams = params as unknown as Parameters<typeof vector.upsert>[0]
      return await vector.upsert(upsertParams)
    },
  })
}

export function useVectorDeleteMutation() {
  return useMutation({
    mutationFn: async ({ vectorName, indexName, ids }: { vectorName: string; indexName: string; ids?: string[] }) => {
      // Use HTTP endpoint for flexible delete by ids
      const base = process.env.NEXT_PUBLIC_MASTRA_API_URL ?? "http://localhost:4111"
      const res = await fetch(`${base.replace(/\/$/, "")}/api/vectors/${encodeURIComponent(vectorName)}/delete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ indexName, ids }),
      })
      if (!res.ok) { throw new Error(`Status ${res.status}`) }
      return await res.json()
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
    enabled: vectorName !== undefined && vectorName !== null,
  })
}

export function useVectorDetailsQuery(vectorName: string, indexName: string | null) {
  return useQuery({
    queryKey: queryKeys.vectorDetails(vectorName, indexName ?? ""),
    queryFn: async () => {
      if (indexName === undefined || indexName === null) { return null }
      const vector = mastraClient.getVector(vectorName)
      return await vector.details(indexName)
    },
    enabled: vectorName !== undefined && vectorName !== null && indexName !== undefined && indexName !== null,
  })
}

// Mutations
export function useExecuteToolMutation() {
  return useMutation({
    mutationFn: async ({
      toolId,
      data,
      runId,
      threadId,
      resourceId,
    }: {
      toolId: string
      data: Record<string, unknown>
      runId?: string
      threadId?: string
      resourceId?: string
    }) => {
      const tool = mastraClient.getTool(toolId)
      const params: Record<string, unknown> & { data: unknown } = { data, args: data }
      if (runId !== undefined && runId !== null) { params.runId = runId }
      if (threadId !== undefined && threadId !== null) { params.threadId = threadId }
      if (resourceId !== undefined && resourceId !== null) { params.resourceId = resourceId }
      return tool.execute(params)
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
