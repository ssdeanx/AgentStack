'use client'

import { mastraClient } from '@/lib/mastra-client'
import type {
  Agent,
  ListAgentsModelProvidersResponse,
  LogEntry,
  MemoryStatus,
  MemoryThread,
  RequestContextValue,
  StoredAgentResponse,
  Tool,
  TracesResponse,
  VectorIndex,
  Workflow,
  WorkspaceItem,
} from '@/lib/types/mastra-api'
import type {
  CloneAgentParams,
  CreateMemoryThreadParams,
  GetLogsParams,
  GetMemoryConfigParams,
  ListMemoryThreadMessagesParams,
  ListScoresByEntityIdParams,
  ListScoresByRunIdParams,
  ListScoresByScorerIdParams,
  ListStoredAgentsParams,
  QueryVectorParams,
  StreamParams,
  UpdateMemoryThreadParams,
  UpdateModelParams,
} from '@mastra/client-js'
import type { TracingOptions } from '@mastra/core/observability'
import { RequestContext } from '@mastra/core/request-context'
import type { ListTracesArgs } from '@mastra/core/storage'
import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'

import type { UseQueryResult } from '@tanstack/react-query'
import type { UseMutationResult } from '@tanstack/react-query'

interface MastraQueryHooks {
  useAgents: (
    requestContext?: RequestContext | RequestContextValue,
    partial?: boolean
  ) => UseQueryResult<Agent[], Error>
  useAgent: (
    agentId: string,
    requestContext?: RequestContext | RequestContextValue
  ) => UseQueryResult<Agent, Error>
  useTools: (
    requestContext?: RequestContext | RequestContextValue
  ) => UseQueryResult<Tool[], Error>
  useWorkflows: (
    requestContext?: RequestContext | RequestContextValue,
    partial?: boolean
  ) => UseQueryResult<Workflow[], Error>
  useTraces: (params?: ListTracesArgs) => UseQueryResult<TracesResponse, Error>
  useThreads: (params?: {
    resourceId?: string
    agentId?: string
  }) => UseQueryResult<MemoryThread[], Error>
  useVectorIndexes: (vectorName?: string) => UseQueryResult<VectorIndex[], Error>
  useLogs: (params: GetLogsParams) => UseQueryResult<LogEntry[], Error>
  useLogTransports: () => UseQueryResult<string[], Error>
  useMemoryStatus: (
    agentId: string,
    requestContext?: RequestContext | RequestContextValue,
    opts?: { resourceId?: string; threadId?: string }
  ) => UseQueryResult<MemoryStatus, Error>
  useAgentEnhanceInstructionsMutation: (
    agentId: string
  ) => UseMutationResult<
    { explanation: string; new_prompt: string },
    Error,
    { instructions: string; comment: string },
    unknown
  >
}

/**
 * Centralized query keys for Mastra resources
 */
export const mastraQueryKeys = {
  all: ['mastra'] as const,
  agents: {
    all: ['mastra', 'agents'] as const,
    list: (params?: unknown) =>
      [...mastraQueryKeys.agents.all, 'list', params] as const,
    details: (id: string, params?: unknown) =>
      [...mastraQueryKeys.agents.all, 'details', id, params] as const,
    providers: () => [...mastraQueryKeys.agents.all, 'providers'] as const,
    builder: {
      actions: () =>
        [...mastraQueryKeys.agents.all, 'builder', 'actions'] as const,
      action: (id: string) =>
        [
          ...mastraQueryKeys.agents.all,
          'builder',
          'action',
          id,
        ] as const,
    },
    voice: {
      speakers: (id: string, params?: unknown) =>
        [
          ...mastraQueryKeys.agents.all,
          'voice',
          'speakers',
          id,
          params,
        ] as const,
      listener: (id: string, params?: unknown) =>
        [
          ...mastraQueryKeys.agents.all,
          'voice',
          'listener',
          id,
          60,
          params,
        ] as const,
    },
  },
  storedAgents: {
    all: ['mastra', 'storedAgents'] as const,
    list: (params?: unknown) =>
      [...mastraQueryKeys.storedAgents.all, 'list', params] as const,
    details: (id: string) =>
      [...mastraQueryKeys.storedAgents.all, 'details', id] as const,
  },
  workflows: {
    all: ['mastra', 'workflows'] as const,
    list: (params?: unknown) =>
      [...mastraQueryKeys.workflows.all, 'list', params] as const,
    details: (id: string, params?: unknown) =>
      [...mastraQueryKeys.workflows.all, 'details', id, params] as const,
    runs: (workflowId: string, params?: unknown) =>
      [
        ...mastraQueryKeys.workflows.all,
        'runs',
        workflowId,
        params,
      ] as const,
    runDetails: (runId: string) =>
      [...mastraQueryKeys.workflows.all, 'runDetails', runId] as const,
    schema: (id: string) =>
      [...mastraQueryKeys.workflows.all, 'schema', id] as const,
  },
  tools: {
    all: ['mastra', 'tools'] as const,
    list: (params?: unknown) =>
      [...mastraQueryKeys.tools.all, 'list', params] as const,
    details: (id: string, params?: unknown) =>
      [...mastraQueryKeys.tools.all, 'details', id, params] as const,
    providers: () => [...mastraQueryKeys.tools.all, 'providers'] as const,
  },
  memory: {
    all: ['mastra', 'memory'] as const,
    threads: (params?: unknown) =>
      [...mastraQueryKeys.memory.all, 'threads', params] as const,
    thread: (threadId: string) =>
      [...mastraQueryKeys.memory.all, 'thread', threadId] as const,
    messages: (threadId: string, params?: unknown) =>
      [
        ...mastraQueryKeys.memory.all,
        'messages',
        threadId,
        params,
      ] as const,
    working: (params: unknown) =>
      [...mastraQueryKeys.memory.all, 'working', params] as const,
    status: (agentId: string, params?: unknown) =>
      [...mastraQueryKeys.memory.all, 'status', agentId, params] as const,
    config: (params: unknown) =>
      [...mastraQueryKeys.memory.all, 'config', params] as const,
    om: (params: unknown) =>
      [...mastraQueryKeys.memory.all, 'om', params] as const,
    buffer: (params: unknown) =>
      [...mastraQueryKeys.memory.all, 'buffer', params] as const,
  },
  observability: {
    all: ['mastra', 'observability'] as const,
    traces: (params?: unknown) =>
      [...mastraQueryKeys.observability.all, 'traces', params] as const,
    trace: (traceId: string) =>
      [...mastraQueryKeys.observability.all, 'trace', traceId] as const,
    scores: (params: unknown) =>
      [...mastraQueryKeys.observability.all, 'scores', params] as const,
  },
  logs: {
    all: ['mastra', 'logs'] as const,
    list: (params?: unknown) =>
      [...mastraQueryKeys.logs.all, 'list', params] as const,
    transports: () => [...mastraQueryKeys.logs.all, 'transports'] as const,
    run: (params: unknown) =>
      [...mastraQueryKeys.logs.all, 'run', params] as const,
  },
  vectors: {
    all: ['mastra', 'vectors'] as const,
    list: () => [...mastraQueryKeys.vectors.all, 'list'] as const,
    indexes: (vectorName: string) =>
      [...mastraQueryKeys.vectors.all, 'indexes', vectorName] as const,
    details: (vectorName: string, indexName: string) =>
      [
        ...mastraQueryKeys.vectors.all,
        'details',
        { vectorName, indexName },
      ] as const,
  },
  workspaces: {
    all: ['mastra', 'workspaces'] as const,
    list: () => [...mastraQueryKeys.workspaces.all, 'list'] as const,
    details: (id: string) =>
      [...mastraQueryKeys.workspaces.all, 'details', id] as const,
  },
}

/**
 * HOOK: useMastraQuery
 * Provides all Mastra APIs with react-query
 */
export function useMastraQuery(): MastraQueryHooks {
  const queryClient = useQueryClient()

  // --- AGENTS ---

  const useAgents: (
    requestContext?: RequestContext | RequestContextValue,
    partial?: boolean
  ) => UseQueryResult<Agent[], Error> = (
    requestContext?: RequestContext | RequestContextValue,
    partial?: boolean
  ) =>
    useQuery<Agent[], Error>({
      queryKey: mastraQueryKeys.agents.list({ requestContext, partial }),
      queryFn: async () => {
        const agents = await mastraClient.listAgents(
          requestContext as RequestContext,
          partial
        )
        return Object.entries(agents).map(([id, agent]) => ({
          ...agent,
          id,
        })) as Agent[]
      },
    })

  const useAgent: (
    agentId: string,
    requestContext?: RequestContext | RequestContextValue
  ) => UseQueryResult<Agent, Error> = (
    agentId: string,
    requestContext?: RequestContext | RequestContextValue
  ) =>
    useQuery<Agent, Error>({
      queryKey: mastraQueryKeys.agents.details(agentId, requestContext),
      queryFn: async () => {
        const agent = mastraClient.getAgent(agentId)
        const details = await agent.details(
          requestContext as RequestContext
        )
        return {
          ...details,
          id: agentId,
        } as Agent
      },
      enabled: !!agentId,
    })

  const useAgentModelProviders: () =>
    UseQueryResult<ListAgentsModelProvidersResponse, Error> = () =>
    useQuery<ListAgentsModelProvidersResponse, Error>({
      queryKey: mastraQueryKeys.agents.providers(),
      queryFn: () => mastraClient.listAgentsModelProviders(),
    })

  const useAgentSpeakers = (
    agentId: string,
    requestContext?: RequestContext | RequestContextValue
  ) =>
    useQuery({
      queryKey: mastraQueryKeys.agents.voice.speakers(
        agentId,
        requestContext
      ),
      queryFn: () =>
        mastraClient
          .getAgent(agentId)
          .voice.getSpeakers(requestContext as RequestContext),
      enabled: !!agentId,
    })

  const useAgentListener = (
    agentId: string,
    requestContext?: RequestContext | RequestContextValue
  ) =>
    useQuery({
      queryKey: mastraQueryKeys.agents.voice.listener(
        agentId,
        requestContext
      ),
      queryFn: () =>
        mastraClient
          .getAgent(agentId)
          .voice.getListener(requestContext as RequestContext),
      enabled: !!agentId,
    })

  // --- STORED AGENTS ---

  const useStoredAgents = (params?: ListStoredAgentsParams) =>
    useQuery({
      queryKey: mastraQueryKeys.storedAgents.list(params),
      queryFn: () =>
        mastraClient.listStoredAgents(
          params
        ) as unknown as Promise<StoredAgentResponse>,
    })

  const useStoredAgent = (id: string) =>
    useQuery({
      queryKey: mastraQueryKeys.storedAgents.details(id),
      queryFn: () =>
        mastraClient
          .getStoredAgent(id)
          .details(),
      enabled: !!id,
    })

  // --- WORKFLOWS ---

  const useWorkflows: (
    requestContext?: RequestContext | RequestContextValue,
    partial?: boolean
  ) => UseQueryResult<Workflow[], Error> = (
    requestContext?: RequestContext | RequestContextValue,
    partial?: boolean
  ) =>
    useQuery<Workflow[], Error>({
      queryKey: mastraQueryKeys.workflows.list({
        requestContext,
        partial,
      }),
      queryFn: async () => {
        const workflows = await mastraClient.listWorkflows(
          requestContext as RequestContext,
          partial
        )
        return Object.entries(workflows).map(([id, wf]) => ({
          ...wf,
          id,
        })) as Workflow[]
      },
    })

  const useWorkflow = (
    workflowId: string,
    requestContext?: RequestContext | RequestContextValue
  ) =>
    useQuery({
      queryKey: mastraQueryKeys.workflows.details(
        workflowId,
        requestContext
      ),
      queryFn: async () => {
        const workflow = mastraClient.getWorkflow(workflowId)
        const details = await workflow.details(
          requestContext as RequestContext
        )
        return {
          ...details,
          id: workflowId,
        } as Workflow
      },
      enabled: !!workflowId,
    })

  const useWorkflowRun = (
    workflowId: string,
    runId: string,
    options?: {
      requestContext?: RequestContext | Record<string, unknown>
      fields?: string[]
      withNestedWorkflows?: boolean
    }
  ) =>
    useQuery({
      queryKey: mastraQueryKeys.workflows.runDetails(runId),
      queryFn: () =>
        mastraClient
          .getWorkflow(workflowId)
          .runById(runId, options),
      enabled: !!workflowId && !!runId,
    })

  const useWorkflowRuns = (
    workflowId: string,
    params?: {
      fromDate?: Date
      toDate?: Date
      page?: number
      perPage?: number
      resourceId?: string
      status?: unknown
    },
    requestContext?: RequestContext | RequestContextValue
  ) =>
    useQuery({
      queryKey: mastraQueryKeys.workflows.runs(workflowId, params),
      queryFn: () =>
        mastraClient.getWorkflow(workflowId).runs(params as unknown as Record<string, unknown>, requestContext as RequestContext),
      enabled: !!workflowId,
    })

  // --- TOOLS ---

  const useTools: (
    requestContext?: RequestContext | RequestContextValue
  ) => UseQueryResult<Tool[], Error> = (
    requestContext?: RequestContext | RequestContextValue
  ) =>
    useQuery<Tool[], Error>({
      queryKey: mastraQueryKeys.tools.list(requestContext),
      queryFn: async () => {
        const tools = await mastraClient.listTools(
          requestContext as RequestContext
        )
        return Object.entries(tools).map(([id, tool]) => ({
          ...tool,
          id,
        })) as Tool[]
      },
    })

  const useTool = (
    toolId: string,
    requestContext?: RequestContext | RequestContextValue
  ) =>
    useQuery({
      queryKey: mastraQueryKeys.tools.details(toolId, requestContext),
      queryFn: async () => {
        const tool = mastraClient.getTool(toolId)
        const details = await tool.details(
          requestContext as RequestContext
        )
        return {
          ...details,
          id: toolId,
        } as Tool
      },
      enabled: !!toolId,
    })

  // --- MEMORY ---

  const useThreads: (params?: {
    resourceId?: string
    agentId?: string
  }) => UseQueryResult<MemoryThread[], Error> = (
    params: {
      resourceId?: string
      agentId?: string
    } = {}
  ) =>
    useQuery<MemoryThread[], Error>({
      queryKey: mastraQueryKeys.memory.threads(params),
      queryFn: async () => {
        const res = await mastraClient.listMemoryThreads(params)
        return res.threads
      },
    })

  const useThreadMessages = (
    threadId: string,
    opts?: { agentId?: string; networkId?: string; requestContext?: RequestContext | RequestContextValue }
  ) =>
    useQuery({
      queryKey: mastraQueryKeys.memory.messages(threadId, opts),
      queryFn: async () => {
        const res = await mastraClient.listThreadMessages(threadId, opts)
        return res.messages
      },
      enabled: !!threadId,
    })

  const useThreadMessagesPaginated = (
    threadId: string,
    opts?: ListMemoryThreadMessagesParams & { agentId?: string; requestContext?: RequestContext | RequestContextValue }
  ) =>
    useQuery({
      queryKey: mastraQueryKeys.memory.messages(threadId, {
        ...opts,
        paginated: true,
      }),
      queryFn: async () => {
        const thread = mastraClient.getMemoryThread({
          threadId,
          agentId: opts?.agentId,
        })
        const res = await thread.listMessages(
          opts as ListMemoryThreadMessagesParams & {
            requestContext?: RequestContext | RequestContextValue
          }
        )
        return res.messages
      },
      enabled: !!threadId,
    })

  const useMemoryStatus: (
    agentId: string,
    requestContext?: RequestContext | RequestContextValue,
    opts?: {
      resourceId?: string
      threadId?: string
    }
  ) => UseQueryResult<MemoryStatus, Error> = (
    agentId: string,
    requestContext?: RequestContext | RequestContextValue,
    opts?: {
      resourceId?: string
      threadId?: string
    }
  ) =>
    useQuery<MemoryStatus, Error>({
      queryKey: mastraQueryKeys.memory.status(agentId, {
        requestContext,
        opts,
      }),
      queryFn: () =>
        mastraClient.getMemoryStatus(
          agentId,
          requestContext as RequestContext,
          opts
        ),
      enabled: !!agentId,
    })

  const useMemoryConfig = (params: GetMemoryConfigParams) =>
    useQuery({
      queryKey: mastraQueryKeys.memory.config(params),
      queryFn: () =>
        mastraClient.getMemoryConfig(
          params
        ),
      enabled: !!params.agentId,
    })

  // --- OBSERVABILITY ---

  const useTraces: (
    params?: ListTracesArgs
  ) => UseQueryResult<TracesResponse, Error> = (params?: ListTracesArgs) =>
    useQuery<TracesResponse, Error>({
      queryKey: mastraQueryKeys.observability.traces(params),
      queryFn: () => mastraClient.listTraces(params),
    })

  const useTrace = (traceId: string) =>
    useQuery({
      queryKey: mastraQueryKeys.observability.trace(traceId),
      queryFn: () => mastraClient.getTrace(traceId),
      enabled: !!traceId,
    })

  // --- Additional score endpoints (use imported SDK types)
  const useScoresByRun = (params?: ListScoresByRunIdParams) =>
    useQuery({
      queryKey: [...mastraQueryKeys.observability.all, 'scores', 'byRun', params] as const,
      queryFn: () => mastraClient.listScoresByRunId(params as ListScoresByRunIdParams),
      enabled: !!params,
    })

  const useScoresByScorer = (params?: ListScoresByScorerIdParams) =>
    useQuery({
      queryKey: [...mastraQueryKeys.observability.all, 'scores', 'byScorer', params] as const,
      queryFn: () => mastraClient.listScoresByScorerId(params as ListScoresByScorerIdParams),
      enabled: !!params,
    })

  const useScoresByEntity = (params?: ListScoresByEntityIdParams) =>
    useQuery({
      queryKey: [...mastraQueryKeys.observability.all, 'scores', 'byEntity', params] as const,
      queryFn: () => mastraClient.listScoresByEntityId(params as ListScoresByEntityIdParams),
      enabled: !!params,
    })

  // --- LOGS ---

  const useLogs: (params: GetLogsParams) =>
    UseQueryResult<LogEntry[], Error> = (params: GetLogsParams) =>
    useQuery<LogEntry[], Error>({
      queryKey: mastraQueryKeys.logs.list(params),
      queryFn: async () => {
        const res = await mastraClient.listLogs(params)
        return res.logs
      },
    })

  const useRunLogs = (params: { runId: string; transportId: string }) =>
    useQuery({
      queryKey: mastraQueryKeys.logs.run(params),
      queryFn: () => mastraClient.getLogForRun(params),
      enabled: !!params.runId,
    })

  const useLogTransports: () => UseQueryResult<string[], Error> = () =>
    useQuery<string[], Error>({
      queryKey: mastraQueryKeys.logs.transports(),
      queryFn: async () => {
        const res = await mastraClient.listLogTransports()
        return res.transports
      },
    })

  // --- VECTORS ---

  const useVectorIndexes: (
    vectorName?: string
  ) => UseQueryResult<VectorIndex[], Error> = (vectorName = 'pgVector') =>
    useQuery<VectorIndex[], Error>({
      queryKey: mastraQueryKeys.vectors.indexes(vectorName),
      queryFn: async () => {
        const vector = mastraClient.getVector(vectorName)
        const res = await vector.getIndexes()
        return res as unknown as VectorIndex[]
      },
    })

  const useVectorDetails = (vectorName: string, indexName: string) =>
    useQuery({
      queryKey: mastraQueryKeys.vectors.details(vectorName, indexName),
      queryFn: () =>
        mastraClient.getVector(vectorName).details(indexName),
      enabled: !!vectorName && !!indexName,
    })

  // --- WORKSPACES ---

  const useWorkspaces = () =>
    useQuery({
      queryKey: mastraQueryKeys.workspaces.list(),
      queryFn: () =>
        mastraClient.listWorkspaces() as Promise<{
          workspaces: WorkspaceItem[]
        }>,
    })

  const useWorkspace = (id: string) =>
    useQuery({
      queryKey: mastraQueryKeys.workspaces.details(id),
      queryFn: () => mastraClient.getWorkspace(id).info(),
      enabled: !!id,
    })

  // --- SYSTEM ---

  const useSystemPackages = () =>
    useQuery({
      queryKey: ['mastra', 'system', 'packages'],
      queryFn: () => mastraClient.getSystemPackages(),
    })

  // --- MUTATIONS ---

  // Agent Mutations
  const useAgentGenerateMutation = (agentId: string) =>
    useMutation({
      mutationFn: (params: StreamParams) =>
        mastraClient.getAgent(agentId).generate(params.messages, params),
    })

  const useAgentEnhanceInstructionsMutation = (agentId: string) =>
    useMutation<
      { explanation: string; new_prompt: string },
      Error,
      { instructions: string; comment: string }
    >({
      mutationFn: (params) =>
        mastraClient
          .getAgent(agentId)
          .enhanceInstructions(params.instructions, params.comment),
    })

  const useAgentCloneMutation = (agentId: string) =>
    useMutation({
      mutationFn: (params?: CloneAgentParams) =>
        mastraClient.getAgent(agentId).clone(params),
    })

  const useAgentVoiceSpeakMutation = (agentId: string) =>
    useMutation({
      mutationFn: (params: {
        text: string
        options?: { speaker?: string }
      }) =>
        mastraClient
          .getAgent(agentId)
          .voice.speak(params.text, params.options),
    })

  const useAgentVoiceListenMutation = (agentId: string) =>
    useMutation({
      mutationFn: (params: {
        audio: Blob
        options?: Record<string, unknown>
      }) => mastraClient.getAgent(agentId).voice.listen(params.audio, params.options),
    })

  const useAgentUpdateModelMutation = (agentId: string) =>
    useMutation({
      mutationFn: (params: UpdateModelParams) =>
        mastraClient.getAgent(agentId).updateModel(params),
    })

  const useAgentResetModelMutation = (agentId: string) =>
    useMutation({
      mutationFn: () => mastraClient.getAgent(agentId).resetModel(),
    })

  const useApproveToolCallMutation = (agentId: string) =>
    useMutation({
      mutationFn: (params: { runId: string; toolCallId: string }) =>
        mastraClient.getAgent(agentId).approveToolCall(params),
    })

  const useDeclineToolCallMutation = (agentId: string) =>
    useMutation({
      mutationFn: (params: { runId: string; toolCallId: string }) =>
        mastraClient.getAgent(agentId).declineToolCall(params),
    })

  const useExecuteToolMutation = () =>
    useMutation({
      mutationFn: async ({
        toolId,
        runId,
        data,
      }: {
        toolId: string
        runId: string
        // Use an explicit object map for tool payloads at the app boundary
        data: Record<string, unknown>
        requestContext?: RequestContext | RequestContextValue
      }) => {
        if (!runId) {
          throw new Error('runId is required to execute a tool')
        }
        const tool = mastraClient.getTool(toolId)
        // The SDK expects `any` for data/requestContext. Keep app types strict
        // and cast only at the SDK boundary. Localized eslint-disable prevents
        // the rule from flagging the necessary cast here.
        return (await tool.execute({ data, runId, requestContext: RequestContext })) as unknown
      },
    })

  // Workflow Mutations
  const useWorkflowStartMutation = (workflowId: string) =>
    useMutation({
      mutationFn: async (params: {
        runOptions?: { runId?: string; resourceId?: string }
        startParams: {
          inputData: Record<string, unknown>
          initialState?: Record<string, unknown>
          requestContext?: RequestContext | Record<string, unknown>
          tracingOptions?: TracingOptions
          perStep?: boolean
        }
      }) => {
        const run = await mastraClient.getWorkflow(workflowId).createRun(params.runOptions)
        return await run.start(params.startParams)
      },
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: mastraQueryKeys.workflows.all,
        })
      },
    })

  const useWorkflowStartAsyncMutation = (workflowId: string) =>
    useMutation({
      mutationFn: async (params: {
        runOptions?: { runId?: string; resourceId?: string }
        startParams: {
          inputData: Record<string, unknown>
          initialState?: Record<string, unknown>
          requestContext?: RequestContext | Record<string, unknown>
          tracingOptions?: TracingOptions
          resourceId?: string
          perStep?: boolean
        }
      }) => {
        const run = await mastraClient.getWorkflow(workflowId).createRun(params.runOptions)
        return await run.startAsync(params.startParams)
      },
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: mastraQueryKeys.workflows.all,
        })
      },
    })

  // Memory Mutations
  const useCreateThreadMutation = () =>
    useMutation({
      mutationFn: (params: CreateMemoryThreadParams) =>
        mastraClient.createMemoryThread(params),
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: mastraQueryKeys.memory.all,
        })
      },
    })

  const useDeleteThreadMutation = (agentId?: string) =>
    useMutation({
      mutationFn: (threadId: string) =>
        mastraClient.getMemoryThread({ threadId, agentId }).delete(),
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: mastraQueryKeys.memory.all,
        })
      },
    })

  const useUpdateMemoryThreadMutation = (
    threadId: string,
    agentId?: string
  ) =>
    useMutation({
      mutationFn: (params: UpdateMemoryThreadParams) =>
        mastraClient
          .getMemoryThread({ threadId, agentId })
          .update(params),
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: mastraQueryKeys.memory.thread(threadId),
        })
      },
    })

  const useUpdateWorkingMemoryMutation = () =>
    useMutation({
      mutationFn: (params: {
        agentId: string
        threadId: string
        workingMemory: string
        resourceId?: string
        requestContext?: RequestContext | RequestContextValue
      }) => mastraClient.updateWorkingMemory(params),
      onSuccess: async (_, variables) => {
        await queryClient.invalidateQueries({
          queryKey: mastraQueryKeys.memory.working({
            agentId: variables.agentId,
            threadId: variables.threadId,
          }),
        })
      },
    })

  // Vector Mutations
  const useVectorQueryMutation = (vectorName: string) =>
    useMutation({
      mutationFn: (params: QueryVectorParams) =>
        mastraClient.getVector(vectorName).query(params),
    })

  const useVectorUpsertMutation = (vectorName: string) =>
    useMutation({
      mutationFn: (params: {
        indexName: string
        vectors: number[][]
        metadata?: Array<Record<string, unknown>>
        ids?: string[]
      }) => mastraClient.getVector(vectorName).upsert(params),
    })

  // Observability Mutations
  const useScoreMutation = () =>
    useMutation({
      mutationFn: (params: {
        scorerName: string
        targets: Array<{ traceId: string; spanId?: string }>
      }) => mastraClient.score(params),
    })

  const hooks = {
    // Queries
    useAgents,
    useAgent,
    useAgentModelProviders,
    useAgentSpeakers,
    useAgentListener,
    useStoredAgents,
    useStoredAgent,
    useWorkflows,
    useWorkflow,
    useWorkflowRun,
    useWorkflowRuns,
    useTools,
    useTool,
    useThreads,
    useThreadMessages,
    useThreadMessagesPaginated,
    useMemoryStatus,
    useMemoryConfig,
    useScoresByRun,
    useScoresByScorer,
    useScoresByEntity,
    useTraces,
    useTrace,
    useLogs,
    useRunLogs,
    useLogTransports,
    useVectorIndexes,
    useVectorDetails,
    useWorkspaces,
    useWorkspace,
    useSystemPackages,

    // Mutations
    useAgentGenerateMutation,
    useAgentEnhanceInstructionsMutation,
    useAgentCloneMutation,
    useAgentVoiceSpeakMutation,
    useAgentVoiceListenMutation,
    useAgentUpdateModelMutation,
    useAgentResetModelMutation,
    useApproveToolCallMutation,
    useDeclineToolCallMutation,
    useExecuteToolMutation,
    useWorkflowStartMutation,
    useWorkflowStartAsyncMutation,
    useCreateThreadMutation,
    useDeleteThreadMutation,
    useUpdateMemoryThreadMutation,
    useUpdateWorkingMemoryMutation,
    useVectorQueryMutation,
    useVectorUpsertMutation,
    useScoreMutation,
  }

  return hooks as MastraQueryHooks
}
