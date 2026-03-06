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
  ListSkillsResponse,
  ListMemoryThreadMessagesParams,
  McpServerListResponse,
  McpServerToolListResponse,
  ListScoresByEntityIdParams,
  ListScoresByRunIdParams,
  ListScoresByScorerIdParams,
  ListStoredAgentsParams,
  QueryVectorParams,
  SearchSkillsParams,
  SearchSkillsResponse,
  StreamParams,
  UpdateMemoryThreadParams,
  UpdateModelParams,
  WorkspaceFsDeleteResponse,
  WorkspaceFsListResponse,
  WorkspaceFsMkdirResponse,
  WorkspaceFsReadResponse,
  WorkspaceFsStatResponse,
  WorkspaceFsWriteResponse,
  WorkspaceIndexParams,
  WorkspaceIndexResponse,
  WorkspaceInfoResponse,
  WorkspaceSearchParams,
  WorkspaceSearchResponse,
} from '@mastra/client-js'
import type {
  AgentCard,
  GetTaskResponse,
  MessageSendParams,
  SendMessageResponse,
  Task,
  TaskQueryParams,
} from '@mastra/core/a2a'
import type { ServerDetailInfo } from '@mastra/core/mcp'
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
  useWorkspaces: () => UseQueryResult<{ workspaces: WorkspaceItem[] }, Error>
  useWorkspace: (id: string) => UseQueryResult<WorkspaceInfoResponse, Error>
  useWorkspaceInfo: (id: string) => UseQueryResult<WorkspaceInfoResponse, Error>
  useWorkspaceFiles: (
    workspaceId: string,
    path?: string,
    recursive?: boolean
  ) => UseQueryResult<WorkspaceFsListResponse, Error>
  useWorkspaceReadFile: (
    workspaceId: string,
    path: string,
    encoding?: string
  ) => UseQueryResult<WorkspaceFsReadResponse, Error>
  useWorkspaceStat: (
    workspaceId: string,
    path: string
  ) => UseQueryResult<WorkspaceFsStatResponse, Error>
  useWorkspaceSearch: (
    workspaceId: string,
    params: WorkspaceSearchParams
  ) => UseQueryResult<WorkspaceSearchResponse, Error>
  useWorkspaceSkills: (
    workspaceId: string
  ) => UseQueryResult<ListSkillsResponse, Error>
  useWorkspaceSearchSkills: (
    workspaceId: string,
    params: SearchSkillsParams
  ) => UseQueryResult<SearchSkillsResponse, Error>
  useWorkspaceWriteFileMutation: (
    workspaceId: string
  ) => UseMutationResult<
    WorkspaceFsWriteResponse,
    Error,
    {
      path: string
      content: string
      options?: { encoding?: 'utf-8' | 'base64'; recursive?: boolean }
    },
    unknown
  >
  useWorkspaceDeleteMutation: (
    workspaceId: string
  ) => UseMutationResult<
    WorkspaceFsDeleteResponse,
    Error,
    { path: string; options?: { recursive?: boolean; force?: boolean } },
    unknown
  >
  useWorkspaceMkdirMutation: (
    workspaceId: string
  ) => UseMutationResult<
    WorkspaceFsMkdirResponse,
    Error,
    { path: string; recursive?: boolean },
    unknown
  >
  useWorkspaceIndexMutation: (
    workspaceId: string
  ) => UseMutationResult<WorkspaceIndexResponse, Error, WorkspaceIndexParams, unknown>
  useSandboxInfo: (
    workspaceId: string
  ) => UseQueryResult<WorkspaceInfoResponse, Error>
  useSandboxFiles: (
    workspaceId: string,
    path?: string,
    recursive?: boolean
  ) => UseQueryResult<WorkspaceFsListResponse, Error>
  useSandboxReadFile: (
    workspaceId: string,
    path: string,
    encoding?: string
  ) => UseQueryResult<WorkspaceFsReadResponse, Error>
  useSandboxStat: (
    workspaceId: string,
    path: string
  ) => UseQueryResult<WorkspaceFsStatResponse, Error>
  useSandboxSearch: (
    workspaceId: string,
    params: WorkspaceSearchParams
  ) => UseQueryResult<WorkspaceSearchResponse, Error>
  useSandboxWriteFileMutation: (
    workspaceId: string
  ) => UseMutationResult<
    WorkspaceFsWriteResponse,
    Error,
    {
      path: string
      content: string
      options?: { encoding?: 'utf-8' | 'base64'; recursive?: boolean }
    },
    unknown
  >
  useSandboxDeleteMutation: (
    workspaceId: string
  ) => UseMutationResult<
    WorkspaceFsDeleteResponse,
    Error,
    { path: string; options?: { recursive?: boolean; force?: boolean } },
    unknown
  >
  useSandboxMkdirMutation: (
    workspaceId: string
  ) => UseMutationResult<
    WorkspaceFsMkdirResponse,
    Error,
    { path: string; recursive?: boolean },
    unknown
  >
  useSandboxIndexMutation: (
    workspaceId: string
  ) => UseMutationResult<WorkspaceIndexResponse, Error, WorkspaceIndexParams, unknown>
  useMcpServers: (params?: {
    page?: number
    perPage?: number
    offset?: number
    limit?: number
  }) => UseQueryResult<McpServerListResponse, Error>
  useMcpServerDetails: (
    serverId: string,
    params?: { version?: string }
  ) => UseQueryResult<ServerDetailInfo, Error>
  useMcpServerTools: (
    serverId: string
  ) => UseQueryResult<McpServerToolListResponse, Error>
  useMcpToolDetails: (
    serverId: string,
    toolId: string,
    requestContext?: RequestContext | RequestContextValue
  ) => UseQueryResult<unknown, Error>
  useMcpToolExecuteMutation: (
    serverId: string,
    toolId: string
  ) => UseMutationResult<
    unknown,
    Error,
    { data?: unknown; requestContext?: RequestContext },
    unknown
  >
  useA2ACard: (agentId: string) => UseQueryResult<AgentCard, Error>
  useA2ASendMessageMutation: (
    agentId: string
  ) => UseMutationResult<SendMessageResponse, Error, MessageSendParams, unknown>
  useA2AGetTask: (
    agentId: string,
    params: TaskQueryParams
  ) => UseQueryResult<GetTaskResponse, Error>
  useA2ACancelTaskMutation: (
    agentId: string
  ) => UseMutationResult<Task, Error, TaskQueryParams, unknown>
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
    info: (id: string) =>
      [...mastraQueryKeys.workspaces.all, 'info', id] as const,
    files: (workspaceId: string, path: string, recursive: boolean) =>
      [
        ...mastraQueryKeys.workspaces.all,
        'files',
        workspaceId,
        path,
        recursive,
      ] as const,
    file: (workspaceId: string, path: string, encoding?: string) =>
      [...mastraQueryKeys.workspaces.all, 'file', workspaceId, path, encoding] as const,
    stat: (workspaceId: string, path: string) =>
      [...mastraQueryKeys.workspaces.all, 'stat', workspaceId, path] as const,
    search: (workspaceId: string, params: WorkspaceSearchParams) =>
      [...mastraQueryKeys.workspaces.all, 'search', workspaceId, params] as const,
    skills: (workspaceId: string) =>
      [...mastraQueryKeys.workspaces.all, 'skills', workspaceId] as const,
    searchSkills: (workspaceId: string, params: SearchSkillsParams) =>
      [
        ...mastraQueryKeys.workspaces.all,
        'searchSkills',
        workspaceId,
        params,
      ] as const,
  },
  sandbox: {
    all: ['mastra', 'sandbox'] as const,
    info: (workspaceId: string) =>
      [...mastraQueryKeys.sandbox.all, 'info', workspaceId] as const,
    files: (workspaceId: string, path: string, recursive: boolean) =>
      [...mastraQueryKeys.sandbox.all, 'files', workspaceId, path, recursive] as const,
    file: (workspaceId: string, path: string, encoding?: string) =>
      [...mastraQueryKeys.sandbox.all, 'file', workspaceId, path, encoding] as const,
    stat: (workspaceId: string, path: string) =>
      [...mastraQueryKeys.sandbox.all, 'stat', workspaceId, path] as const,
    search: (workspaceId: string, params: WorkspaceSearchParams) =>
      [...mastraQueryKeys.sandbox.all, 'search', workspaceId, params] as const,
  },
  mcp: {
    all: ['mastra', 'mcp'] as const,
    servers: (params?: unknown) =>
      [...mastraQueryKeys.mcp.all, 'servers', params] as const,
    serverDetails: (serverId: string, params?: unknown) =>
      [...mastraQueryKeys.mcp.all, 'serverDetails', serverId, params] as const,
    serverTools: (serverId: string) =>
      [...mastraQueryKeys.mcp.all, 'serverTools', serverId] as const,
    toolDetails: (serverId: string, toolId: string, params?: unknown) =>
      [
        ...mastraQueryKeys.mcp.all,
        'toolDetails',
        serverId,
        toolId,
        params,
      ] as const,
  },
  a2a: {
    all: ['mastra', 'a2a'] as const,
    card: (agentId: string) =>
      [...mastraQueryKeys.a2a.all, 'card', agentId] as const,
    task: (agentId: string, params: unknown) =>
      [...mastraQueryKeys.a2a.all, 'task', agentId, params] as const,
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

  const useWorkspaceInfo = (id: string) =>
    useQuery<WorkspaceInfoResponse, Error>({
      queryKey: mastraQueryKeys.workspaces.info(id),
      queryFn: () => mastraClient.getWorkspace(id).info(),
      enabled: !!id,
    })

  const useWorkspaceFiles = (
    workspaceId: string,
    path = '/',
    recursive = false
  ) =>
    useQuery<WorkspaceFsListResponse, Error>({
      queryKey: mastraQueryKeys.workspaces.files(workspaceId, path, recursive),
      queryFn: () => mastraClient.getWorkspace(workspaceId).listFiles(path, recursive),
      enabled: !!workspaceId,
    })

  const useWorkspaceReadFile = (
    workspaceId: string,
    path: string,
    encoding = 'utf-8'
  ) =>
    useQuery<WorkspaceFsReadResponse, Error>({
      queryKey: mastraQueryKeys.workspaces.file(workspaceId, path, encoding),
      queryFn: () => mastraClient.getWorkspace(workspaceId).readFile(path, encoding),
      enabled: !!workspaceId && !!path,
    })

  const useWorkspaceStat = (workspaceId: string, path: string) =>
    useQuery<WorkspaceFsStatResponse, Error>({
      queryKey: mastraQueryKeys.workspaces.stat(workspaceId, path),
      queryFn: () => mastraClient.getWorkspace(workspaceId).stat(path),
      enabled: !!workspaceId && !!path,
    })

  const useWorkspaceSearch = (workspaceId: string, params: WorkspaceSearchParams) =>
    useQuery<WorkspaceSearchResponse, Error>({
      queryKey: mastraQueryKeys.workspaces.search(workspaceId, params),
      queryFn: () => mastraClient.getWorkspace(workspaceId).search(params),
      enabled: !!workspaceId && !!params?.query,
    })

  const useWorkspaceSkills = (workspaceId: string) =>
    useQuery<ListSkillsResponse, Error>({
      queryKey: mastraQueryKeys.workspaces.skills(workspaceId),
      queryFn: () => mastraClient.getWorkspace(workspaceId).listSkills(),
      enabled: !!workspaceId,
    })

  const useWorkspaceSearchSkills = (
    workspaceId: string,
    params: SearchSkillsParams
  ) =>
    useQuery<SearchSkillsResponse, Error>({
      queryKey: mastraQueryKeys.workspaces.searchSkills(workspaceId, params),
      queryFn: () => mastraClient.getWorkspace(workspaceId).searchSkills(params),
      enabled: !!workspaceId,
    })

  // Workspace Mutations
  const useWorkspaceWriteFileMutation = (workspaceId: string) =>
    useMutation({
      mutationFn: (params: {
        path: string
        content: string
        options?: { encoding?: 'utf-8' | 'base64'; recursive?: boolean }
      }) =>
        mastraClient
          .getWorkspace(workspaceId)
          .writeFile(params.path, params.content, params.options),
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: mastraQueryKeys.workspaces.all,
        })
      },
    })

  const useWorkspaceDeleteMutation = (workspaceId: string) =>
    useMutation({
      mutationFn: (params: {
        path: string
        options?: { recursive?: boolean; force?: boolean }
      }) =>
        mastraClient
          .getWorkspace(workspaceId)
          .delete(params.path, params.options),
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: mastraQueryKeys.workspaces.all,
        })
      },
    })

  const useWorkspaceMkdirMutation = (workspaceId: string) =>
    useMutation({
      mutationFn: (params: { path: string; recursive?: boolean }) =>
        mastraClient
          .getWorkspace(workspaceId)
          .mkdir(params.path, params.recursive),
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: mastraQueryKeys.workspaces.all,
        })
      },
    })

  const useWorkspaceIndexMutation = (workspaceId: string) =>
    useMutation({
      mutationFn: (params: WorkspaceIndexParams) =>
        mastraClient.getWorkspace(workspaceId).index(params),
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: mastraQueryKeys.workspaces.all,
        })
      },
    })

  // --- SANDBOX (separate frontend hooks) ---

  const useSandboxInfo = (workspaceId: string) =>
    useQuery<WorkspaceInfoResponse, Error>({
      queryKey: mastraQueryKeys.sandbox.info(workspaceId),
      queryFn: () => mastraClient.getWorkspace(workspaceId).info(),
      enabled: !!workspaceId,
    })

  const useSandboxFiles = (
    workspaceId: string,
    path = '/',
    recursive = false
  ) =>
    useQuery<WorkspaceFsListResponse, Error>({
      queryKey: mastraQueryKeys.sandbox.files(workspaceId, path, recursive),
      queryFn: () => mastraClient.getWorkspace(workspaceId).listFiles(path, recursive),
      enabled: !!workspaceId,
    })

  const useSandboxReadFile = (
    workspaceId: string,
    path: string,
    encoding = 'utf-8'
  ) =>
    useQuery<WorkspaceFsReadResponse, Error>({
      queryKey: mastraQueryKeys.sandbox.file(workspaceId, path, encoding),
      queryFn: () => mastraClient.getWorkspace(workspaceId).readFile(path, encoding),
      enabled: !!workspaceId && !!path,
    })

  const useSandboxStat = (workspaceId: string, path: string) =>
    useQuery<WorkspaceFsStatResponse, Error>({
      queryKey: mastraQueryKeys.sandbox.stat(workspaceId, path),
      queryFn: () => mastraClient.getWorkspace(workspaceId).stat(path),
      enabled: !!workspaceId && !!path,
    })

  const useSandboxSearch = (workspaceId: string, params: WorkspaceSearchParams) =>
    useQuery<WorkspaceSearchResponse, Error>({
      queryKey: mastraQueryKeys.sandbox.search(workspaceId, params),
      queryFn: () => mastraClient.getWorkspace(workspaceId).search(params),
      enabled: !!workspaceId && !!params?.query,
    })

  const useSandboxWriteFileMutation = (workspaceId: string) =>
    useMutation({
      mutationFn: (params: {
        path: string
        content: string
        options?: { encoding?: 'utf-8' | 'base64'; recursive?: boolean }
      }) =>
        mastraClient
          .getWorkspace(workspaceId)
          .writeFile(params.path, params.content, params.options),
      onSuccess: async () => {
        await queryClient.invalidateQueries({ queryKey: mastraQueryKeys.sandbox.all })
      },
    })

  const useSandboxDeleteMutation = (workspaceId: string) =>
    useMutation({
      mutationFn: (params: {
        path: string
        options?: { recursive?: boolean; force?: boolean }
      }) =>
        mastraClient
          .getWorkspace(workspaceId)
          .delete(params.path, params.options),
      onSuccess: async () => {
        await queryClient.invalidateQueries({ queryKey: mastraQueryKeys.sandbox.all })
      },
    })

  const useSandboxMkdirMutation = (workspaceId: string) =>
    useMutation({
      mutationFn: (params: { path: string; recursive?: boolean }) =>
        mastraClient.getWorkspace(workspaceId).mkdir(params.path, params.recursive),
      onSuccess: async () => {
        await queryClient.invalidateQueries({ queryKey: mastraQueryKeys.sandbox.all })
      },
    })

  const useSandboxIndexMutation = (workspaceId: string) =>
    useMutation({
      mutationFn: (params: WorkspaceIndexParams) =>
        mastraClient.getWorkspace(workspaceId).index(params),
      onSuccess: async () => {
        await queryClient.invalidateQueries({ queryKey: mastraQueryKeys.sandbox.all })
      },
    })

  // --- MCP ---

  const useMcpServers = (params?: {
    page?: number
    perPage?: number
    offset?: number
    limit?: number
  }) =>
    useQuery<McpServerListResponse, Error>({
      queryKey: mastraQueryKeys.mcp.servers(params),
      queryFn: () => mastraClient.getMcpServers(params),
    })

  const useMcpServerDetails = (
    serverId: string,
    params?: { version?: string }
  ) =>
    useQuery<ServerDetailInfo, Error>({
      queryKey: mastraQueryKeys.mcp.serverDetails(serverId, params),
      queryFn: () => mastraClient.getMcpServerDetails(serverId, params),
      enabled: !!serverId,
    })

  const useMcpServerTools = (serverId: string) =>
    useQuery<McpServerToolListResponse, Error>({
      queryKey: mastraQueryKeys.mcp.serverTools(serverId),
      queryFn: () => mastraClient.getMcpServerTools(serverId),
      enabled: !!serverId,
    })

  const useMcpToolDetails = (
    serverId: string,
    toolId: string,
    requestContext?: RequestContext | RequestContextValue
  ) =>
    useQuery<unknown, Error>({
      queryKey: mastraQueryKeys.mcp.toolDetails(serverId, toolId, requestContext),
      queryFn: () =>
        mastraClient
          .getMcpServerTool(serverId, toolId)
          .details(requestContext as RequestContext),
      enabled: !!serverId && !!toolId,
    })

  const useMcpToolExecuteMutation = (serverId: string, toolId: string) =>
    useMutation({
      mutationFn: (params: { data?: unknown; requestContext?: RequestContext }) =>
        mastraClient
          .getMcpServerTool(serverId, toolId)
          .execute({
            data: params.data,
            requestContext: params.requestContext,
          }),
    })

  // --- A2A ---

  const useA2ACard = (agentId: string) =>
    useQuery<AgentCard, Error>({
      queryKey: mastraQueryKeys.a2a.card(agentId),
      queryFn: () => mastraClient.getA2A(agentId).getCard(),
      enabled: !!agentId,
    })

  const useA2ASendMessageMutation = (agentId: string) =>
    useMutation<SendMessageResponse, Error, MessageSendParams>({
      mutationFn: (params: MessageSendParams) =>
        mastraClient.getA2A(agentId).sendMessage(params),
    })

  const useA2AGetTask = (agentId: string, params: TaskQueryParams) =>
    useQuery<GetTaskResponse, Error>({
      queryKey: mastraQueryKeys.a2a.task(agentId, params),
      queryFn: () => mastraClient.getA2A(agentId).getTask(params),
      enabled: !!agentId && !!params?.id,
    })

  const useA2ACancelTaskMutation = (agentId: string) =>
    useMutation<Task, Error, TaskQueryParams>({
      mutationFn: (params: TaskQueryParams) =>
        mastraClient.getA2A(agentId).cancelTask(params),
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
    useWorkspaceInfo,
    useWorkspaceFiles,
    useWorkspaceReadFile,
    useWorkspaceStat,
    useWorkspaceSearch,
    useWorkspaceSkills,
    useWorkspaceSearchSkills,
    useSandboxInfo,
    useSandboxFiles,
    useSandboxReadFile,
    useSandboxStat,
    useSandboxSearch,
    useMcpServers,
    useMcpServerDetails,
    useMcpServerTools,
    useMcpToolDetails,
    useA2ACard,
    useA2AGetTask,
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
    useWorkspaceWriteFileMutation,
    useWorkspaceDeleteMutation,
    useWorkspaceMkdirMutation,
    useWorkspaceIndexMutation,
    useSandboxWriteFileMutation,
    useSandboxDeleteMutation,
    useSandboxMkdirMutation,
    useSandboxIndexMutation,
    useMcpToolExecuteMutation,
    useA2ASendMessageMutation,
    useA2ACancelTaskMutation,
    useScoreMutation,
  }

  return hooks as MastraQueryHooks
}
