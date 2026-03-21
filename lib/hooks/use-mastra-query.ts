'use client'

import { mastraClient } from '@/lib/mastra-client'


import type {
  AddDatasetItemParams,
  BatchDeleteDatasetItemsParams,
  BatchInsertDatasetItemsParams,
  CompareExperimentsParams,
  CompareExperimentsResponse,
  CloneAgentParams,
  CloneMemoryThreadParams,
  CreateDatasetParams,
  CreateMemoryThreadParams,
  CreateStoredAgentParams,
  CreateStoredMCPClientParams,
  CreateStoredPromptBlockParams,
  CreateStoredScorerParams,
  CreateStoredSkillParams,
  DatasetExperiment,
  DatasetItem,
  DatasetItemVersionResponse,
  DatasetRecord,
  ExecuteProcessorParams,
  GetAgentResponse,
  GetLogsParams,
  GetMemoryConfigParams,
  GetMemoryStatusResponse,
  GetScorerResponse,
  GetToolResponse,
  GetVectorIndexResponse,
  GetWorkflowResponse,
  ListSkillsResponse,
  ListMemoryThreadMessagesParams,
  ListStoredMCPClientsParams,
  ListStoredPromptBlocksParams,
  ListStoredScorersParams,
  ListStoredSkillsParams,
  ListToolProviderToolsParams,
  ListAgentsModelProvidersResponse,
  McpServerListResponse,
  McpServerToolListResponse,
  ListScoresByEntityIdParams,
  ListScoresByRunIdParams,
  ListScoresByScorerIdParams,
  ListStoredAgentsParams,
  QueryVectorParams,
  SaveMessageToMemoryParams,
  SearchSkillsParams,
  SearchSkillsResponse,
  StreamParams,
  TriggerDatasetExperimentParams,
  UpdateDatasetItemParams,
  UpdateDatasetParams,
  UpdateMemoryThreadParams,
  UpdateModelParams,
  UpdateStoredAgentParams,
  UpdateStoredMCPClientParams,
  UpdateStoredPromptBlockParams,
  UpdateStoredScorerParams,
  UpdateStoredSkillParams,
  WorkspaceFsListResponse,
  WorkspaceFsReadResponse,
  WorkspaceFsStatResponse,
  WorkspaceIndexParams,
  WorkspaceInfoResponse,
  WorkspaceSearchParams,
  WorkspaceSearchResponse,
  WorkspaceItem,
} from '@mastra/client-js'
import type { TracingOptions } from '@mastra/core/observability'
import { RequestContext } from '@mastra/core/request-context'
import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'

import type { UseQueryResult } from '@tanstack/react-query'

type Agent = GetAgentResponse
type Tool = GetToolResponse
type Workflow = GetWorkflowResponse
type MemoryThread = Awaited<ReturnType<typeof mastraClient.listMemoryThreads>>['threads'][number]
type MemoryStatus = GetMemoryStatusResponse
type LogEntry = Awaited<ReturnType<typeof mastraClient.listLogs>>['logs'][number]
type TracesResponse = Awaited<ReturnType<typeof mastraClient.listTraces>>
type VectorIndex = GetVectorIndexResponse & { name: string }
type RequestContextValue = Record<string, unknown>
type ListTracesArgs = Parameters<typeof mastraClient.listTraces>[0]
type ServerDetailInfo = Awaited<ReturnType<typeof mastraClient.getMcpServerDetails>>
type AgentCard = Awaited<ReturnType<ReturnType<typeof mastraClient.getA2A>['getCard']>>
type GetTaskResponse = Awaited<ReturnType<ReturnType<typeof mastraClient.getA2A>['getTask']>>
type MessageSendParams = Parameters<ReturnType<typeof mastraClient.getA2A>['sendMessage']>[0]
type SendMessageResponse = Awaited<ReturnType<ReturnType<typeof mastraClient.getA2A>['sendMessage']>>
type Task = Awaited<ReturnType<ReturnType<typeof mastraClient.getA2A>['cancelTask']>>
type TaskQueryParams = Parameters<ReturnType<typeof mastraClient.getA2A>['getTask']>[0]
type A2AStreamingResponseStream = Awaited<ReturnType<ReturnType<typeof mastraClient.getA2A>['sendStreamingMessage']>>
type SendStreamingMessageResponse =
  A2AStreamingResponseStream extends AsyncIterable<infer T> ? T : never

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
  storedPromptBlocks: {
    all: ['mastra', 'storedPromptBlocks'] as const,
    list: (params?: unknown) =>
      [...mastraQueryKeys.storedPromptBlocks.all, 'list', params] as const,
    details: (id: string, params?: unknown) =>
      [...mastraQueryKeys.storedPromptBlocks.all, 'details', id, params] as const,
  },
  storedScorers: {
    all: ['mastra', 'storedScorers'] as const,
    list: (params?: unknown) =>
      [...mastraQueryKeys.storedScorers.all, 'list', params] as const,
    details: (id: string, params?: unknown) =>
      [...mastraQueryKeys.storedScorers.all, 'details', id, params] as const,
  },
  storedMcpClients: {
    all: ['mastra', 'storedMcpClients'] as const,
    list: (params?: unknown) =>
      [...mastraQueryKeys.storedMcpClients.all, 'list', params] as const,
    details: (id: string, params?: unknown) =>
      [...mastraQueryKeys.storedMcpClients.all, 'details', id, params] as const,
  },
  storedSkills: {
    all: ['mastra', 'storedSkills'] as const,
    list: (params?: unknown) =>
      [...mastraQueryKeys.storedSkills.all, 'list', params] as const,
    details: (id: string, params?: unknown) =>
      [...mastraQueryKeys.storedSkills.all, 'details', id, params] as const,
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
    provider: (providerId: string) =>
      [...mastraQueryKeys.tools.all, 'provider', providerId] as const,
    providerToolkits: (providerId: string) =>
      [...mastraQueryKeys.tools.all, 'providerToolkits', providerId] as const,
    providerTools: (providerId: string, params?: unknown) =>
      [...mastraQueryKeys.tools.all, 'providerTools', providerId, params] as const,
    providerToolSchema: (providerId: string, toolSlug: string) =>
      [
        ...mastraQueryKeys.tools.all,
        'providerToolSchema',
        providerId,
        toolSlug,
      ] as const,
  },
  processors: {
    all: ['mastra', 'processors'] as const,
    list: (params?: unknown) =>
      [...mastraQueryKeys.processors.all, 'list', params] as const,
    details: (id: string, params?: unknown) =>
      [...mastraQueryKeys.processors.all, 'details', id, params] as const,
    providers: () => [...mastraQueryKeys.processors.all, 'providers'] as const,
    provider: (providerId: string) =>
      [...mastraQueryKeys.processors.all, 'provider', providerId] as const,
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
    search: (params: unknown) =>
      [...mastraQueryKeys.memory.all, 'search', params] as const,
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
  embedders: {
    all: ['mastra', 'embedders'] as const,
    list: () => [...mastraQueryKeys.embedders.all, 'list'] as const,
  },
  datasets: {
    all: ['mastra', 'datasets'] as const,
    list: (params?: unknown) =>
      [...mastraQueryKeys.datasets.all, 'list', params] as const,
    details: (datasetId: string) =>
      [...mastraQueryKeys.datasets.all, 'details', datasetId] as const,
    items: (datasetId: string, params?: unknown) =>
      [...mastraQueryKeys.datasets.all, 'items', datasetId, params] as const,
    item: (datasetId: string, itemId: string) =>
      [...mastraQueryKeys.datasets.all, 'item', datasetId, itemId] as const,
    itemHistory: (datasetId: string, itemId: string) =>
      [...mastraQueryKeys.datasets.all, 'itemHistory', datasetId, itemId] as const,
    itemVersion: (
      datasetId: string,
      itemId: string,
      datasetVersion: number
    ) =>
      [
        ...mastraQueryKeys.datasets.all,
        'itemVersion',
        datasetId,
        itemId,
        datasetVersion,
      ] as const,
    versions: (datasetId: string, params?: unknown) =>
      [...mastraQueryKeys.datasets.all, 'versions', datasetId, params] as const,
    experiments: (datasetId: string, params?: unknown) =>
      [...mastraQueryKeys.datasets.all, 'experiments', datasetId, params] as const,
    experiment: (datasetId: string, experimentId: string) =>
      [...mastraQueryKeys.datasets.all, 'experiment', datasetId, experimentId] as const,
    experimentResults: (
      datasetId: string,
      experimentId: string,
      params?: unknown
    ) =>
      [
        ...mastraQueryKeys.datasets.all,
        'experimentResults',
        datasetId,
        experimentId,
        params,
      ] as const,
    compare: (params?: unknown) =>
      [...mastraQueryKeys.datasets.all, 'compare', params] as const,
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
    skill: (workspaceId: string, skillName: string) =>
      [...mastraQueryKeys.workspaces.all, 'skill', workspaceId, skillName] as const,
    skillReferences: (workspaceId: string, skillName: string) =>
      [
        ...mastraQueryKeys.workspaces.all,
        'skillReferences',
        workspaceId,
        skillName,
      ] as const,
    skillReference: (
      workspaceId: string,
      skillName: string,
      referencePath: string
    ) =>
      [
        ...mastraQueryKeys.workspaces.all,
        'skillReference',
        workspaceId,
        skillName,
        referencePath,
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


// --- AGENTS ---

export const useAgents: (
  requestContext?: RequestContext | RequestContextValue,
  partial?: boolean
) => UseQueryResult<Agent[]> = (
  requestContext?: RequestContext | RequestContextValue,
  partial?: boolean
) =>
  useQuery<Agent[]>({
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

export const useAgent: (
  agentId: string,
  requestContext?: RequestContext | RequestContextValue
) => UseQueryResult<Agent> = (
  agentId: string,
  requestContext?: RequestContext | RequestContextValue
) =>
  useQuery<Agent>({
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

export const useAgentModelProviders: () =>
  UseQueryResult<ListAgentsModelProvidersResponse> = () =>
  useQuery<ListAgentsModelProvidersResponse>({
    queryKey: mastraQueryKeys.agents.providers(),
    queryFn: () => mastraClient.listAgentsModelProviders(),
  })

export const useAgentSpeakers = (
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

export const useAgentListener = (
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

export const useStoredAgents = (params?: ListStoredAgentsParams) =>
  useQuery({
    queryKey: mastraQueryKeys.storedAgents.list(params),
    queryFn: () => mastraClient.listStoredAgents(params),
  })

export const useStoredAgent = (
  id: string,
  requestContext?: RequestContext | RequestContextValue,
  options?: { status?: 'draft' | 'published' | 'archived' }
) =>
  useQuery({
    queryKey: mastraQueryKeys.storedAgents.details(id),
    queryFn: () =>
      mastraClient
        .getStoredAgent(id)
        .details(requestContext as RequestContext, options),
    enabled: !!id,
  })

export const useStoredAgentVersions = (
  storedAgentId: string,
  params?: Parameters<ReturnType<typeof mastraClient.getStoredAgent>['listVersions']>[0],
  requestContext?: RequestContext | RequestContextValue
) =>
  useQuery({
    queryKey: [...mastraQueryKeys.storedAgents.all, 'versions', storedAgentId, params, requestContext] as const,
    queryFn: () =>
      mastraClient
        .getStoredAgent(storedAgentId)
        .listVersions(params, requestContext as RequestContext),
    enabled: !!storedAgentId,
  })

export const useStoredAgentVersion = (
  storedAgentId: string,
  versionId: string,
  requestContext?: RequestContext | RequestContextValue
) =>
  useQuery({
    queryKey: [...mastraQueryKeys.storedAgents.all, 'version', storedAgentId, versionId, requestContext] as const,
    queryFn: () =>
      mastraClient
        .getStoredAgent(storedAgentId)
        .getVersion(versionId, requestContext as RequestContext),
    enabled: !!storedAgentId && !!versionId,
  })

export const useCompareStoredAgentVersions = (
  storedAgentId: string,
  fromId: string,
  toId: string,
  requestContext?: RequestContext | RequestContextValue
) =>
  useQuery({
    queryKey: [...mastraQueryKeys.storedAgents.all, 'compare', storedAgentId, fromId, toId, requestContext] as const,
    queryFn: () =>
      mastraClient
        .getStoredAgent(storedAgentId)
        .compareVersions(fromId, toId, requestContext as RequestContext),
    enabled: !!storedAgentId && !!fromId && !!toId,
  })

export const useStoredPromptBlocks = (params?: ListStoredPromptBlocksParams) =>
  useQuery({
    queryKey: mastraQueryKeys.storedPromptBlocks.list(params),
    queryFn: () => mastraClient.listStoredPromptBlocks(params),
  })

export const useStoredPromptBlock = (
  id: string,
  requestContext?: RequestContext | RequestContextValue,
  options?: { status?: 'draft' | 'published' | 'archived' }
) =>
  useQuery({
    queryKey: mastraQueryKeys.storedPromptBlocks.details(id, { requestContext, options }),
    queryFn: () =>
      mastraClient
        .getStoredPromptBlock(id)
        .details(requestContext as RequestContext, options),
    enabled: !!id,
  })

export const useStoredPromptBlockVersions = (
  storedPromptBlockId: string,
  params?: Parameters<ReturnType<typeof mastraClient.getStoredPromptBlock>['listVersions']>[0],
  requestContext?: RequestContext | RequestContextValue
) =>
  useQuery({
    queryKey: [...mastraQueryKeys.storedPromptBlocks.all, 'versions', storedPromptBlockId, params, requestContext] as const,
    queryFn: () =>
      mastraClient
        .getStoredPromptBlock(storedPromptBlockId)
        .listVersions(params, requestContext as RequestContext),
    enabled: !!storedPromptBlockId,
  })

export const useStoredPromptBlockVersion = (
  storedPromptBlockId: string,
  versionId: string,
  requestContext?: RequestContext | RequestContextValue
) =>
  useQuery({
    queryKey: [...mastraQueryKeys.storedPromptBlocks.all, 'version', storedPromptBlockId, versionId, requestContext] as const,
    queryFn: () =>
      mastraClient
        .getStoredPromptBlock(storedPromptBlockId)
        .getVersion(versionId, requestContext as RequestContext),
    enabled: !!storedPromptBlockId && !!versionId,
  })

export const useCompareStoredPromptBlockVersions = (
  storedPromptBlockId: string,
  fromId: string,
  toId: string,
  requestContext?: RequestContext | RequestContextValue
) =>
  useQuery({
    queryKey: [...mastraQueryKeys.storedPromptBlocks.all, 'compare', storedPromptBlockId, fromId, toId, requestContext] as const,
    queryFn: () =>
      mastraClient
        .getStoredPromptBlock(storedPromptBlockId)
        .compareVersions(fromId, toId, requestContext as RequestContext),
    enabled: !!storedPromptBlockId && !!fromId && !!toId,
  })

export const useStoredScorers = (params?: ListStoredScorersParams) =>
  useQuery({
    queryKey: mastraQueryKeys.storedScorers.list(params),
    queryFn: () => mastraClient.listStoredScorers(params),
  })

export const useStoredScorer = (
  id: string,
  requestContext?: RequestContext | RequestContextValue,
  options?: { status?: 'draft' | 'published' | 'archived' }
) =>
  useQuery({
    queryKey: mastraQueryKeys.storedScorers.details(id, { requestContext, options }),
    queryFn: () =>
      mastraClient
        .getStoredScorer(id)
        .details(requestContext as RequestContext, options),
    enabled: !!id,
  })

export const useStoredScorerVersions = (
  storedScorerId: string,
  params?: Parameters<ReturnType<typeof mastraClient.getStoredScorer>['listVersions']>[0],
  requestContext?: RequestContext | RequestContextValue
) =>
  useQuery({
    queryKey: [...mastraQueryKeys.storedScorers.all, 'versions', storedScorerId, params, requestContext] as const,
    queryFn: () =>
      mastraClient
        .getStoredScorer(storedScorerId)
        .listVersions(params, requestContext as RequestContext),
    enabled: !!storedScorerId,
  })

export const useStoredScorerVersion = (
  storedScorerId: string,
  versionId: string,
  requestContext?: RequestContext | RequestContextValue
) =>
  useQuery({
    queryKey: [...mastraQueryKeys.storedScorers.all, 'version', storedScorerId, versionId, requestContext] as const,
    queryFn: () =>
      mastraClient
        .getStoredScorer(storedScorerId)
        .getVersion(versionId, requestContext as RequestContext),
    enabled: !!storedScorerId && !!versionId,
  })

export const useCompareStoredScorerVersions = (
  storedScorerId: string,
  fromId: string,
  toId: string,
  requestContext?: RequestContext | RequestContextValue
) =>
  useQuery({
    queryKey: [...mastraQueryKeys.storedScorers.all, 'compare', storedScorerId, fromId, toId, requestContext] as const,
    queryFn: () =>
      mastraClient
        .getStoredScorer(storedScorerId)
        .compareVersions(fromId, toId, requestContext as RequestContext),
    enabled: !!storedScorerId && !!fromId && !!toId,
  })

export const useStoredMcpClients = (params?: ListStoredMCPClientsParams) =>
  useQuery({
    queryKey: mastraQueryKeys.storedMcpClients.list(params),
    queryFn: () => mastraClient.listStoredMCPClients(params),
  })

export const useStoredMcpClient = (
  id: string,
  requestContext?: RequestContext | RequestContextValue
) =>
  useQuery({
    queryKey: mastraQueryKeys.storedMcpClients.details(id, requestContext),
    queryFn: () =>
      mastraClient
        .getStoredMCPClient(id)
        .details(requestContext as RequestContext),
    enabled: !!id,
  })

export const useStoredSkills = (params?: ListStoredSkillsParams) =>
  useQuery({
    queryKey: mastraQueryKeys.storedSkills.list(params),
    queryFn: () => mastraClient.listStoredSkills(params),
  })

export const useStoredSkill = (
  id: string,
  requestContext?: RequestContext | RequestContextValue
) =>
  useQuery({
    queryKey: mastraQueryKeys.storedSkills.details(id, requestContext),
    queryFn: () =>
      mastraClient
        .getStoredSkill(id)
        .details(requestContext as RequestContext),
    enabled: !!id,
  })

// --- WORKFLOWS ---

export const useWorkflows: (
  requestContext?: RequestContext | RequestContextValue,
  partial?: boolean
) => UseQueryResult<Workflow[]> = (
  requestContext?: RequestContext | RequestContextValue,
  partial?: boolean
) =>
  useQuery<Workflow[]>({
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

export const useWorkflow = (
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

export const useScorers = (
  requestContext?: RequestContext | RequestContextValue
) =>
  useQuery<Record<string, GetScorerResponse>>({
    queryKey: [...mastraQueryKeys.observability.all, 'scorers', requestContext] as const,
    queryFn: () => mastraClient.listScorers(requestContext as RequestContext),
  })

export const useScorer = (scorerId: string) =>
  useQuery<GetScorerResponse>({
    queryKey: [...mastraQueryKeys.observability.all, 'scorer', scorerId] as const,
    queryFn: () => mastraClient.getScorer(scorerId),
    enabled: !!scorerId,
  })

export const useWorkflowRun = (
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

export const useWorkflowRuns = (
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

export const useWorkflowSchema = (workflowId: string) =>
  useQuery({
    queryKey: mastraQueryKeys.workflows.schema(workflowId),
    queryFn: () => mastraClient.getWorkflow(workflowId).getSchema(),
    enabled: !!workflowId,
  })

// --- TOOLS ---

export const useTools: (
  requestContext?: RequestContext | RequestContextValue
) => UseQueryResult<Tool[]> = (
  requestContext?: RequestContext | RequestContextValue
) =>
  useQuery<Tool[]>({
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

export const useTool = (
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

export const useToolProviders = () =>
  useQuery({
    queryKey: mastraQueryKeys.tools.providers(),
    queryFn: () => mastraClient.listToolProviders(),
  })

export const useToolProvider = (providerId: string) =>
  useQuery({
    queryKey: mastraQueryKeys.tools.provider(providerId),
    queryFn: () => mastraClient.getToolProvider(providerId).listToolkits(),
    enabled: !!providerId,
  })

export const useToolProviderToolkits = (providerId: string) =>
  useQuery({
    queryKey: mastraQueryKeys.tools.providerToolkits(providerId),
    queryFn: () => mastraClient.getToolProvider(providerId).listToolkits(),
    enabled: !!providerId,
  })

export const useToolProviderTools = (
  providerId: string,
  params?: ListToolProviderToolsParams
) =>
  useQuery({
    queryKey: mastraQueryKeys.tools.providerTools(providerId, params),
    queryFn: () => mastraClient.getToolProvider(providerId).listTools(params),
    enabled: !!providerId,
  })

export const useToolProviderToolSchema = (providerId: string, toolSlug: string) =>
  useQuery({
    queryKey: mastraQueryKeys.tools.providerToolSchema(providerId, toolSlug),
    queryFn: () => mastraClient.getToolProvider(providerId).getToolSchema(toolSlug),
    enabled: !!providerId && !!toolSlug,
  })

export const useProcessors = (
  requestContext?: RequestContext | RequestContextValue
) =>
  useQuery({
    queryKey: mastraQueryKeys.processors.list(requestContext),
    queryFn: () => mastraClient.listProcessors(requestContext as RequestContext),
  })

export const useProcessor = (
  processorId: string,
  requestContext?: RequestContext | RequestContextValue
) =>
  useQuery({
    queryKey: mastraQueryKeys.processors.details(processorId, requestContext),
    queryFn: () =>
      mastraClient
        .getProcessor(processorId)
        .details(requestContext as RequestContext),
    enabled: !!processorId,
  })

export const useProcessorProviders = () =>
  useQuery({
    queryKey: mastraQueryKeys.processors.providers(),
    queryFn: () => mastraClient.getProcessorProviders(),
  })

export const useProcessorProvider = (providerId: string) =>
  useQuery({
    queryKey: mastraQueryKeys.processors.provider(providerId),
    queryFn: () => mastraClient.getProcessorProvider(providerId).details(),
    enabled: !!providerId,
  })

// --- MEMORY ---

export const useThreads: (params?: {
  resourceId?: string
  agentId?: string
}) => UseQueryResult<MemoryThread[]> = (
  params: {
    resourceId?: string
    agentId?: string
  } = {}
) =>
  useQuery<MemoryThread[]>({
    queryKey: mastraQueryKeys.memory.threads(params),
    queryFn: async () => {
      const res = await mastraClient.listMemoryThreads(params)
      return res.threads
    },
  })

export const useThread = (
  threadId: string,
  agentId?: string,
  requestContext?: RequestContext | RequestContextValue
) =>
  useQuery({
    queryKey: mastraQueryKeys.memory.thread(threadId),
    queryFn: () =>
      mastraClient
        .getMemoryThread({ threadId, agentId })
        .get(requestContext as RequestContext),
    enabled: !!threadId,
  })

export const useThreadMessages = (
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

export const useThreadMessagesPaginated = (
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

export const useMemoryStatus: (
  agentId: string,
  requestContext?: RequestContext | RequestContextValue,
  opts?: {
    resourceId?: string
    threadId?: string
  }
) => UseQueryResult<MemoryStatus> = (
  agentId: string,
  requestContext?: RequestContext | RequestContextValue,
  opts?: {
    resourceId?: string
    threadId?: string
  }
) =>
  useQuery<MemoryStatus>({
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

export const useMemoryConfig = (params: GetMemoryConfigParams) =>
  useQuery({
    queryKey: mastraQueryKeys.memory.config(params),
    queryFn: () =>
      mastraClient.getMemoryConfig(
        params
      ),
    enabled: !!params.agentId,
  })

export const useWorkingMemory = (params: {
  agentId: string
  threadId: string
  resourceId?: string
  requestContext?: RequestContext | RequestContextValue
}) =>
  useQuery({
    queryKey: mastraQueryKeys.memory.working(params),
    queryFn: () => mastraClient.getWorkingMemory(params),
    enabled: !!params.agentId && !!params.threadId,
  })

export const useMemorySearch = (params: {
  agentId: string
  resourceId: string
  threadId?: string
  searchQuery: string
  memoryConfig?: unknown
  requestContext?: RequestContext | RequestContextValue
}) =>
  useQuery({
    queryKey: mastraQueryKeys.memory.search(params),
    queryFn: () => mastraClient.searchMemory(params),
    enabled: !!params.agentId && !!params.resourceId && !!params.searchQuery,
  })

export const useObservationalMemory = (
  params: Parameters<typeof mastraClient.getObservationalMemory>[0]
) =>
  useQuery({
    queryKey: mastraQueryKeys.memory.om(params),
    queryFn: () => mastraClient.getObservationalMemory(params),
    enabled: !!params.agentId,
  })

export const useAwaitBufferStatus = (
  params: Parameters<typeof mastraClient.awaitBufferStatus>[0]
) =>
  useQuery({
    queryKey: mastraQueryKeys.memory.buffer(params),
    queryFn: () => mastraClient.awaitBufferStatus(params),
    enabled: !!params.agentId,
  })

// --- OBSERVABILITY ---

export const useTraces: (
  params?: ListTracesArgs
) => UseQueryResult<TracesResponse> = (params?: ListTracesArgs) =>
  useQuery<TracesResponse>({
    queryKey: mastraQueryKeys.observability.traces(params),
    queryFn: () => mastraClient.listTraces(params),
  })

export const useTrace = (traceId: string) =>
  useQuery({
    queryKey: mastraQueryKeys.observability.trace(traceId),
    queryFn: () => mastraClient.getTrace(traceId),
    enabled: !!traceId,
  })

// --- Additional score endpoints (use imported SDK types)
export const useScoresByRun = (params?: ListScoresByRunIdParams) =>
  useQuery({
    queryKey: [...mastraQueryKeys.observability.all, 'scores', 'byRun', params] as const,
    queryFn: () => {
      if (params === undefined) {
        throw new Error('Scores-by-run params are required')
      }

      return mastraClient.listScoresByRunId(params)
    },
    enabled: !!params,
  })

export const useScoresByScorer = (params?: ListScoresByScorerIdParams) =>
  useQuery({
    queryKey: [...mastraQueryKeys.observability.all, 'scores', 'byScorer', params] as const,
    queryFn: () => {
      if (params === undefined) {
        throw new Error('Scores-by-scorer params are required')
      }

      return mastraClient.listScoresByScorerId(params)
    },
    enabled: !!params,
  })

export const useScoresByEntity = (params?: ListScoresByEntityIdParams) =>
  useQuery({
    queryKey: [...mastraQueryKeys.observability.all, 'scores', 'byEntity', params] as const,
    queryFn: () => {
      if (params === undefined) {
        throw new Error('Scores-by-entity params are required')
      }

      return mastraClient.listScoresByEntityId(params)
    },
    enabled: !!params,
  })

export const useDatasets = (pagination?: { page?: number; perPage?: number }) =>
  useQuery({
    queryKey: mastraQueryKeys.datasets.list(pagination),
    queryFn: () => mastraClient.listDatasets(pagination),
  })

export const useDataset = (datasetId: string) =>
  useQuery<DatasetRecord>({
    queryKey: mastraQueryKeys.datasets.details(datasetId),
    queryFn: () => mastraClient.getDataset(datasetId),
    enabled: !!datasetId,
  })

export const useDatasetItems = (
  datasetId: string,
  params?: {
    page?: number
    perPage?: number
    search?: string
    version?: number | null
  }
) =>
  useQuery({
    queryKey: mastraQueryKeys.datasets.items(datasetId, params),
    queryFn: () => mastraClient.listDatasetItems(datasetId, params),
    enabled: !!datasetId,
  })

export const useDatasetItem = (datasetId: string, itemId: string) =>
  useQuery<DatasetItem>({
    queryKey: mastraQueryKeys.datasets.item(datasetId, itemId),
    queryFn: () => mastraClient.getDatasetItem(datasetId, itemId),
    enabled: !!datasetId && !!itemId,
  })

export const useDatasetItemHistory = (datasetId: string, itemId: string) =>
  useQuery<{ history: DatasetItemVersionResponse[] }>({
    queryKey: mastraQueryKeys.datasets.itemHistory(datasetId, itemId),
    queryFn: () => mastraClient.getItemHistory(datasetId, itemId),
    enabled: !!datasetId && !!itemId,
  })

export const useDatasetItemVersion = (
  datasetId: string,
  itemId: string,
  datasetVersion: number
) =>
  useQuery<DatasetItemVersionResponse>({
    queryKey: mastraQueryKeys.datasets.itemVersion(datasetId, itemId, datasetVersion),
    queryFn: () =>
      mastraClient.getDatasetItemVersion(datasetId, itemId, datasetVersion),
    enabled: !!datasetId && !!itemId,
  })

export const useDatasetVersions = (
  datasetId: string,
  pagination?: { page?: number; perPage?: number }
) =>
  useQuery({
    queryKey: mastraQueryKeys.datasets.versions(datasetId, pagination),
    queryFn: () => mastraClient.listDatasetVersions(datasetId, pagination),
    enabled: !!datasetId,
  })

export const useDatasetExperiments = (
  datasetId: string,
  pagination?: { page?: number; perPage?: number }
) =>
  useQuery({
    queryKey: mastraQueryKeys.datasets.experiments(datasetId, pagination),
    queryFn: () => mastraClient.listDatasetExperiments(datasetId, pagination),
    enabled: !!datasetId,
  })

export const useDatasetExperiment = (datasetId: string, experimentId: string) =>
  useQuery<DatasetExperiment>({
    queryKey: mastraQueryKeys.datasets.experiment(datasetId, experimentId),
    queryFn: () => mastraClient.getDatasetExperiment(datasetId, experimentId),
    enabled: !!datasetId && !!experimentId,
  })

export const useDatasetExperimentResults = (
  datasetId: string,
  experimentId: string,
  pagination?: { page?: number; perPage?: number }
) =>
  useQuery({
    queryKey: mastraQueryKeys.datasets.experimentResults(
      datasetId,
      experimentId,
      pagination
    ),
    queryFn: () =>
      mastraClient.listDatasetExperimentResults(
        datasetId,
        experimentId,
        pagination
      ),
    enabled: !!datasetId && !!experimentId,
  })

export const useCompareExperiments = (params?: CompareExperimentsParams) =>
  useQuery<CompareExperimentsResponse>({
    queryKey: mastraQueryKeys.datasets.compare(params),
    queryFn: () => {
      if (params === undefined) {
        throw new Error('Compare-experiments params are required')
      }

      return mastraClient.compareExperiments(params)
    },
    enabled: !!params,
  })

// --- LOGS ---

export const useLogs: (params: GetLogsParams) =>
  UseQueryResult<LogEntry[]> = (params: GetLogsParams) =>
  useQuery<LogEntry[]>({
    queryKey: mastraQueryKeys.logs.list(params),
    queryFn: async () => {
      const res = await mastraClient.listLogs(params)
      return res.logs
    },
  })

export const useRunLogs = (params: { runId: string; transportId: string }) =>
  useQuery({
    queryKey: mastraQueryKeys.logs.run(params),
    queryFn: () => mastraClient.getLogForRun(params),
    enabled: !!params.runId,
  })

export const useLogTransports: () => UseQueryResult<string[]> = () =>
  useQuery<string[]>({
    queryKey: mastraQueryKeys.logs.transports(),
    queryFn: async () => {
      const res = await mastraClient.listLogTransports()
      return res.transports
    },
  })

// --- VECTORS ---

export const useVectorIndexes: (
  vectorName?: string
) => UseQueryResult<VectorIndex[]> = (vectorName = 'pgVector') =>
  useQuery<VectorIndex[]>({
    queryKey: mastraQueryKeys.vectors.indexes(vectorName),
    queryFn: async () => {
      const vector = mastraClient.getVector(vectorName)
      const res = await vector.getIndexes()
      return res as unknown as VectorIndex[]
    },
  })

export const useVectorDetails = (vectorName: string, indexName: string) =>
  useQuery({
    queryKey: mastraQueryKeys.vectors.details(vectorName, indexName),
    queryFn: () =>
      mastraClient.getVector(vectorName).details(indexName),
    enabled: !!vectorName && !!indexName,
  })

export const useVectors = () =>
  useQuery({
    queryKey: mastraQueryKeys.vectors.list(),
    queryFn: () => mastraClient.listVectors(),
  })

export const useEmbedders = () =>
  useQuery({
    queryKey: mastraQueryKeys.embedders.list(),
    queryFn: () => mastraClient.listEmbedders(),
  })

// --- WORKSPACES ---

export const useWorkspaces = () =>
  useQuery({
    queryKey: mastraQueryKeys.workspaces.list(),
    queryFn: () =>
      mastraClient.listWorkspaces() as Promise<{
        workspaces: WorkspaceItem[]
      }>,
  })

export const useWorkspace = (id: string) =>
  useQuery({
    queryKey: mastraQueryKeys.workspaces.details(id),
    queryFn: () => mastraClient.getWorkspace(id).info(),
    enabled: !!id,
  })

export const useWorkspaceInfo = (id: string) =>
  useQuery<WorkspaceInfoResponse>({
    queryKey: mastraQueryKeys.workspaces.info(id),
    queryFn: () => mastraClient.getWorkspace(id).info(),
    enabled: !!id,
  })

export const useWorkspaceFiles = (
  workspaceId: string,
  path = '/',
  recursive = false
) =>
  useQuery<WorkspaceFsListResponse>({
    queryKey: mastraQueryKeys.workspaces.files(workspaceId, path, recursive),
    queryFn: () => mastraClient.getWorkspace(workspaceId).listFiles(path, recursive),
    enabled: !!workspaceId,
  })

export const useWorkspaceReadFile = (
  workspaceId: string,
  path: string,
  encoding = 'utf-8'
) =>
  useQuery<WorkspaceFsReadResponse>({
    queryKey: mastraQueryKeys.workspaces.file(workspaceId, path, encoding),
    queryFn: () => mastraClient.getWorkspace(workspaceId).readFile(path, encoding),
    enabled: !!workspaceId && !!path,
  })

export const useWorkspaceStat = (workspaceId: string, path: string) =>
  useQuery<WorkspaceFsStatResponse>({
    queryKey: mastraQueryKeys.workspaces.stat(workspaceId, path),
    queryFn: () => mastraClient.getWorkspace(workspaceId).stat(path),
    enabled: !!workspaceId && !!path,
  })

export const useWorkspaceSearch = (workspaceId: string, params: WorkspaceSearchParams) =>
  useQuery<WorkspaceSearchResponse>({
    queryKey: mastraQueryKeys.workspaces.search(workspaceId, params),
    queryFn: () => mastraClient.getWorkspace(workspaceId).search(params),
    enabled: !!workspaceId && !!params.query,
  })

export const useWorkspaceSkills = (workspaceId: string) =>
  useQuery<ListSkillsResponse>({
    queryKey: mastraQueryKeys.workspaces.skills(workspaceId),
    queryFn: () => mastraClient.getWorkspace(workspaceId).listSkills(),
    enabled: !!workspaceId,
  })

export const useWorkspaceSearchSkills = (
  workspaceId: string,
  params: SearchSkillsParams
) =>
  useQuery<SearchSkillsResponse>({
    queryKey: mastraQueryKeys.workspaces.searchSkills(workspaceId, params),
    queryFn: () => mastraClient.getWorkspace(workspaceId).searchSkills(params),
    enabled: !!workspaceId,
  })

export const useWorkspaceSkill = (workspaceId: string, skillName: string) =>
  useQuery({
    queryKey: mastraQueryKeys.workspaces.skill(workspaceId, skillName),
    queryFn: () => mastraClient.getWorkspace(workspaceId).getSkill(skillName).details(),
    enabled: !!workspaceId && !!skillName,
  })

export const useWorkspaceSkillReferences = (workspaceId: string, skillName: string) =>
  useQuery({
    queryKey: mastraQueryKeys.workspaces.skillReferences(workspaceId, skillName),
    queryFn: () =>
      mastraClient.getWorkspace(workspaceId).getSkill(skillName).listReferences(),
    enabled: !!workspaceId && !!skillName,
  })

export const useWorkspaceSkillReference = (
  workspaceId: string,
  skillName: string,
  referencePath: string
) =>
  useQuery({
    queryKey: mastraQueryKeys.workspaces.skillReference(
      workspaceId,
      skillName,
      referencePath
    ),
    queryFn: () =>
      mastraClient
        .getWorkspace(workspaceId)
        .getSkill(skillName)
        .getReference(referencePath),
    enabled: !!workspaceId && !!skillName && !!referencePath,
  })

// Workspace Mutations
export const useWorkspaceWriteFileMutation = (workspaceId: string) => {
  const queryClient = useQueryClient()
  return useMutation({
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
}

export const useWorkspaceDeleteMutation = (workspaceId: string) => {
  const queryClient = useQueryClient()
  return useMutation({
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
}

export const useWorkspaceMkdirMutation = (workspaceId: string) => {
  const queryClient = useQueryClient()
  return useMutation({
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
}

export const useWorkspaceIndexMutation = (workspaceId: string) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (params: WorkspaceIndexParams) =>
      mastraClient.getWorkspace(workspaceId).index(params),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: mastraQueryKeys.workspaces.all,
      })
    },
  })
}

// --- SANDBOX (separate frontend hooks) ---

export const useSandboxInfo = (workspaceId: string) =>
  useQuery<WorkspaceInfoResponse>({
    queryKey: mastraQueryKeys.sandbox.info(workspaceId),
    queryFn: () => mastraClient.getWorkspace(workspaceId).info(),
    enabled: !!workspaceId,
  })

export const useSandboxFiles = (
  workspaceId: string,
  path = '/',
  recursive = false
) =>
  useQuery<WorkspaceFsListResponse>({
    queryKey: mastraQueryKeys.sandbox.files(workspaceId, path, recursive),
    queryFn: () => mastraClient.getWorkspace(workspaceId).listFiles(path, recursive),
    enabled: !!workspaceId,
  })

export const useSandboxReadFile = (
  workspaceId: string,
  path: string,
  encoding = 'utf-8'
) =>
  useQuery<WorkspaceFsReadResponse>({
    queryKey: mastraQueryKeys.sandbox.file(workspaceId, path, encoding),
    queryFn: () => mastraClient.getWorkspace(workspaceId).readFile(path, encoding),
    enabled: !!workspaceId && !!path,
  })

export const useSandboxStat = (workspaceId: string, path: string) =>
  useQuery<WorkspaceFsStatResponse>({
    queryKey: mastraQueryKeys.sandbox.stat(workspaceId, path),
    queryFn: () => mastraClient.getWorkspace(workspaceId).stat(path),
    enabled: !!workspaceId && !!path,
  })

export const useSandboxSearch = (workspaceId: string, params: WorkspaceSearchParams) =>
  useQuery<WorkspaceSearchResponse>({
    queryKey: mastraQueryKeys.sandbox.search(workspaceId, params),
    queryFn: () => mastraClient.getWorkspace(workspaceId).search(params),
    enabled: !!workspaceId && !!params.query,
  })

export const useSandboxWriteFileMutation = (workspaceId: string) => {
  const queryClient = useQueryClient()
  return useMutation({
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
}

export const useSandboxDeleteMutation = (workspaceId: string) => {
  const queryClient = useQueryClient()
  return useMutation({
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
}

export const useSandboxMkdirMutation = (workspaceId: string) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (params: { path: string; recursive?: boolean }) =>
      mastraClient.getWorkspace(workspaceId).mkdir(params.path, params.recursive),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: mastraQueryKeys.sandbox.all })
    },
  })
}

export const useSandboxIndexMutation = (workspaceId: string) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (params: WorkspaceIndexParams) =>
      mastraClient.getWorkspace(workspaceId).index(params),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: mastraQueryKeys.sandbox.all })
    },
  })
}

// --- MCP ---

export const useMcpServers = (params?: {
  page?: number
  perPage?: number
  offset?: number
  limit?: number
}) =>
  useQuery<McpServerListResponse>({
    queryKey: mastraQueryKeys.mcp.servers(params),
    queryFn: () => mastraClient.getMcpServers(params),
  })

export const useMcpServerDetails = (
  serverId: string,
  params?: { version?: string }
) =>
  useQuery<ServerDetailInfo>({
    queryKey: mastraQueryKeys.mcp.serverDetails(serverId, params),
    queryFn: () => mastraClient.getMcpServerDetails(serverId, params),
    enabled: !!serverId,
  })

export const useMcpServerTools = (serverId: string) =>
  useQuery<McpServerToolListResponse>({
    queryKey: mastraQueryKeys.mcp.serverTools(serverId),
    queryFn: () => mastraClient.getMcpServerTools(serverId),
    enabled: !!serverId,
  })

export const useMcpToolDetails = (
  serverId: string,
  toolId: string,
  requestContext?: RequestContext | RequestContextValue
) =>
  useQuery({
    queryKey: mastraQueryKeys.mcp.toolDetails(serverId, toolId, requestContext),
    queryFn: () =>
      mastraClient
        .getMcpServerTool(serverId, toolId)
        .details(requestContext as RequestContext),
    enabled: !!serverId && !!toolId,
  })

export const useMcpToolExecuteMutation = (serverId: string, toolId: string) =>
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

export const useA2ACard = (agentId: string) =>
  useQuery<AgentCard>({
    queryKey: mastraQueryKeys.a2a.card(agentId),
    queryFn: () => mastraClient.getA2A(agentId).getCard(),
    enabled: !!agentId,
  })

export const useA2ASendMessageMutation = (agentId: string) =>
  useMutation<SendMessageResponse, Error, MessageSendParams>({
    mutationFn: (params: MessageSendParams) =>
      mastraClient.getA2A(agentId).sendMessage(params),
  })

export const useA2ASendStreamingMessageMutation = (agentId: string) =>
  useMutation<AsyncIterable<SendStreamingMessageResponse>, Error, MessageSendParams>({
    mutationFn: (params: MessageSendParams) =>
      mastraClient.getA2A(agentId).sendStreamingMessage(params),
  })

export const useA2AGetTask = (agentId: string, params: TaskQueryParams) =>
  useQuery<GetTaskResponse>({
    queryKey: mastraQueryKeys.a2a.task(agentId, params),
    queryFn: () => mastraClient.getA2A(agentId).getTask(params),
    enabled: !!agentId && !!params.id,
  })

export const useA2ACancelTaskMutation = (agentId: string) =>
  useMutation<Task, Error, TaskQueryParams>({
    mutationFn: (params: TaskQueryParams) =>
      mastraClient.getA2A(agentId).cancelTask(params),
  })

export const useAgentBuilderActions = () =>
  useQuery({
    queryKey: mastraQueryKeys.agents.builder.actions(),
    queryFn: () => mastraClient.getAgentBuilderActions(),
  })

export const useAgentBuilderAction = (actionId: string) =>
  useQuery({
    queryKey: mastraQueryKeys.agents.builder.action(actionId),
    queryFn: () => mastraClient.getAgentBuilderAction(actionId).details(),
    enabled: !!actionId,
  })

export const useAgentBuilderRuns = (
  actionId: string,
  params?: Parameters<ReturnType<typeof mastraClient.getAgentBuilderAction>['runs']>[0]
) =>
  useQuery({
    queryKey: [...mastraQueryKeys.agents.builder.action(actionId), 'runs', params] as const,
    queryFn: () => mastraClient.getAgentBuilderAction(actionId).runs(params),
    enabled: !!actionId,
  })

export const useAgentBuilderRun = (
  actionId: string,
  runId: string,
  options?: Parameters<ReturnType<typeof mastraClient.getAgentBuilderAction>['runById']>[1]
) =>
  useQuery({
    queryKey: [...mastraQueryKeys.agents.builder.action(actionId), 'run', runId, options] as const,
    queryFn: () => mastraClient.getAgentBuilderAction(actionId).runById(runId, options),
    enabled: !!actionId && !!runId,
  })

// --- SYSTEM ---

export const useSystemPackages = () =>
  useQuery({
    queryKey: ['mastra', 'system', 'packages'],
    queryFn: () => mastraClient.getSystemPackages(),
  })

// --- MUTATIONS ---

// Agent Mutations
export const useAgentGenerateMutation = (agentId: string) =>
  useMutation({
    mutationFn: (params: StreamParams) =>
      mastraClient.getAgent(agentId).generate(params.messages, params),
  })

export const useAgentEnhanceInstructionsMutation = (agentId: string) =>
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

export const useAgentCloneMutation = (agentId: string) =>
  useMutation({
    mutationFn: (params?: CloneAgentParams) =>
      mastraClient.getAgent(agentId).clone(params),
  })

export const useAgentVoiceSpeakMutation = (agentId: string) =>
  useMutation({
    mutationFn: (params: {
      text: string
      options?: { speaker?: string }
    }) =>
      mastraClient
        .getAgent(agentId)
        .voice.speak(params.text, params.options),
  })

export const useAgentVoiceListenMutation = (agentId: string) =>
  useMutation({
    mutationFn: (params: {
      audio: Blob
      options?: Record<string, unknown>
    }) => mastraClient.getAgent(agentId).voice.listen(params.audio, params.options),
  })

export const useAgentUpdateModelMutation = (agentId: string) =>
  useMutation({
    mutationFn: (params: UpdateModelParams) =>
      mastraClient.getAgent(agentId).updateModel(params),
  })

export const useAgentResetModelMutation = (agentId: string) =>
  useMutation({
    mutationFn: () => mastraClient.getAgent(agentId).resetModel(),
  })

export const useApproveToolCallMutation = (agentId: string) =>
  useMutation({
    mutationFn: (params: { runId: string; toolCallId: string }) =>
      mastraClient.getAgent(agentId).approveToolCall(params),
  })

export const useDeclineToolCallMutation = (agentId: string) =>
  useMutation({
    mutationFn: (params: { runId: string; toolCallId: string }) =>
      mastraClient.getAgent(agentId).declineToolCall(params),
  })

export const useExecuteToolMutation = () =>
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
export const useWorkflowStartMutation = (workflowId: string) => {
  const queryClient = useQueryClient()
  return useMutation({
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
}

export const useWorkflowStartAsyncMutation = (workflowId: string) => {
  const queryClient = useQueryClient()
  return useMutation({
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
}

export const useWorkflowDeleteRunMutation = (workflowId: string) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (runId: string) =>
      mastraClient.getWorkflow(workflowId).deleteRunById(runId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: mastraQueryKeys.workflows.all,
      })
    },
  })
}

export const useWorkflowResumeMutation = (workflowId: string) =>
  useMutation({
    mutationFn: async ({
      runId,
      params,
    }: {
      runId: string
      params: Parameters<Awaited<ReturnType<ReturnType<typeof mastraClient.getWorkflow>['createRun']>>['resume']>[0]
    }) => {
      const run = await mastraClient.getWorkflow(workflowId).createRun({ runId })
      return run.resume(params)
    },
  })

export const useWorkflowResumeAsyncMutation = (workflowId: string) =>
  useMutation({
    mutationFn: async ({
      runId,
      params,
    }: {
      runId: string
      params: Parameters<Awaited<ReturnType<ReturnType<typeof mastraClient.getWorkflow>['createRun']>>['resumeAsync']>[0]
    }) => {
      const run = await mastraClient.getWorkflow(workflowId).createRun({ runId })
      return run.resumeAsync(params)
    },
  })

export const useWorkflowCancelMutation = (workflowId: string) =>
  useMutation({
    mutationFn: async ({ runId }: { runId: string }) => {
      const run = await mastraClient.getWorkflow(workflowId).createRun({ runId })
      return run.cancel()
    },
  })

export const useWorkflowRestartMutation = (workflowId: string) =>
  useMutation({
    mutationFn: async ({
      runId,
      params,
    }: {
      runId: string
      params: Parameters<Awaited<ReturnType<ReturnType<typeof mastraClient.getWorkflow>['createRun']>>['restart']>[0]
    }) => {
      const run = await mastraClient.getWorkflow(workflowId).createRun({ runId })
      return run.restart(params)
    },
  })

export const useWorkflowRestartAsyncMutation = (workflowId: string) =>
  useMutation({
    mutationFn: async ({
      runId,
      params,
    }: {
      runId: string
      params?: Parameters<Awaited<ReturnType<ReturnType<typeof mastraClient.getWorkflow>['createRun']>>['restartAsync']>[0]
    }) => {
      const run = await mastraClient.getWorkflow(workflowId).createRun({ runId })
      return run.restartAsync(params)
    },
  })

export const useWorkflowTimeTravelMutation = (workflowId: string) =>
  useMutation({
    mutationFn: async ({
      runId,
      params,
    }: {
      runId: string
      params: Parameters<Awaited<ReturnType<ReturnType<typeof mastraClient.getWorkflow>['createRun']>>['timeTravel']>[0]
    }) => {
      const run = await mastraClient.getWorkflow(workflowId).createRun({ runId })
      return run.timeTravel(params)
    },
  })

export const useWorkflowTimeTravelAsyncMutation = (workflowId: string) =>
  useMutation({
    mutationFn: async ({
      runId,
      params,
    }: {
      runId: string
      params: Parameters<Awaited<ReturnType<ReturnType<typeof mastraClient.getWorkflow>['createRun']>>['timeTravelAsync']>[0]
    }) => {
      const run = await mastraClient.getWorkflow(workflowId).createRun({ runId })
      return run.timeTravelAsync(params)
    },
  })

// Memory Mutations
export const useCreateThreadMutation = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (params: CreateMemoryThreadParams) =>
      mastraClient.createMemoryThread(params),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: mastraQueryKeys.memory.all,
      })
    },
  })
}

export const useDeleteThreadMutation = (agentId?: string) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (threadId: string) =>
      mastraClient.getMemoryThread({ threadId, agentId }).delete(),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: mastraQueryKeys.memory.all,
      })
    },
  })
}

export const useUpdateMemoryThreadMutation = (
  threadId: string,
  agentId?: string
) => {
  const queryClient = useQueryClient()
  return useMutation({
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
}

export const useUpdateWorkingMemoryMutation = () => {
  const queryClient = useQueryClient()
  return useMutation({
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
}

export const useSaveMessageToMemoryMutation = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (params: SaveMessageToMemoryParams) =>
      mastraClient.saveMessageToMemory(params),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: mastraQueryKeys.memory.all,
      })
    },
  })
}

export const useDeleteThreadMessagesMutation = (
  threadId: string,
  agentId?: string
) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (params: {
      messageIds: Parameters<ReturnType<typeof mastraClient.getMemoryThread>['deleteMessages']>[0]
      requestContext?: RequestContext | RequestContextValue
    }) =>
      mastraClient
        .getMemoryThread({ threadId, agentId })
        .deleteMessages(params.messageIds, params.requestContext as RequestContext),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: mastraQueryKeys.memory.messages(threadId),
      })
    },
  })
}

export const useCloneThreadMutation = (threadId: string, agentId?: string) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (params?: CloneMemoryThreadParams) =>
      mastraClient
        .getMemoryThread({ threadId, agentId })
        .clone(params),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: mastraQueryKeys.memory.all,
      })
    },
  })
}

export const useCreateDatasetMutation = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (params: CreateDatasetParams) => mastraClient.createDataset(params),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: mastraQueryKeys.datasets.all })
    },
  })
}

export const useUpdateDatasetMutation = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (params: UpdateDatasetParams) => mastraClient.updateDataset(params),
    onSuccess: async (_, variables) => {
      await queryClient.invalidateQueries({ queryKey: mastraQueryKeys.datasets.all })
      await queryClient.invalidateQueries({ queryKey: mastraQueryKeys.datasets.details(variables.datasetId) })
    },
  })
}

export const useDeleteDatasetMutation = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (datasetId: string) => mastraClient.deleteDataset(datasetId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: mastraQueryKeys.datasets.all })
    },
  })
}

export const useAddDatasetItemMutation = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (params: AddDatasetItemParams) => mastraClient.addDatasetItem(params),
    onSuccess: async (_, variables) => {
      await queryClient.invalidateQueries({ queryKey: mastraQueryKeys.datasets.items(variables.datasetId) })
    },
  })
}

export const useUpdateDatasetItemMutation = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (params: UpdateDatasetItemParams) => mastraClient.updateDatasetItem(params),
    onSuccess: async (_, variables) => {
      await queryClient.invalidateQueries({ queryKey: mastraQueryKeys.datasets.items(variables.datasetId) })
      await queryClient.invalidateQueries({ queryKey: mastraQueryKeys.datasets.item(variables.datasetId, variables.itemId) })
    },
  })
}

export const useDeleteDatasetItemMutation = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ datasetId, itemId }: { datasetId: string; itemId: string }) =>
      mastraClient.deleteDatasetItem(datasetId, itemId),
    onSuccess: async (_, variables) => {
      await queryClient.invalidateQueries({ queryKey: mastraQueryKeys.datasets.items(variables.datasetId) })
    },
  })
}

export const useBatchInsertDatasetItemsMutation = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (params: BatchInsertDatasetItemsParams) =>
      mastraClient.batchInsertDatasetItems(params),
    onSuccess: async (_, variables) => {
      await queryClient.invalidateQueries({ queryKey: mastraQueryKeys.datasets.items(variables.datasetId) })
    },
  })
}

export const useBatchDeleteDatasetItemsMutation = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (params: BatchDeleteDatasetItemsParams) =>
      mastraClient.batchDeleteDatasetItems(params),
    onSuccess: async (_, variables) => {
      await queryClient.invalidateQueries({ queryKey: mastraQueryKeys.datasets.items(variables.datasetId) })
    },
  })
}

export const useTriggerDatasetExperimentMutation = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (params: TriggerDatasetExperimentParams) =>
      mastraClient.triggerDatasetExperiment(params),
    onSuccess: async (_, variables) => {
      await queryClient.invalidateQueries({ queryKey: mastraQueryKeys.datasets.experiments(variables.datasetId) })
    },
  })
}

// Vector Mutations
export const useVectorQueryMutation = (vectorName: string) =>
  useMutation({
    mutationFn: (params: QueryVectorParams) =>
      mastraClient.getVector(vectorName).query(params),
  })

export const useVectorUpsertMutation = (vectorName: string) =>
  useMutation({
    mutationFn: (params: {
      indexName: string
      vectors: number[][]
      metadata?: Array<Record<string, unknown>>
      ids?: string[]
    }) => mastraClient.getVector(vectorName).upsert(params),
  })

export const useProcessorExecuteMutation = (processorId: string) =>
  useMutation({
    mutationFn: (params: ExecuteProcessorParams) =>
      mastraClient.getProcessor(processorId).execute(params),
  })

// Observability Mutations
export const useScoreMutation = () =>
  useMutation({
    mutationFn: (params: {
      scorerName: string
      targets: Array<{ traceId: string; spanId?: string }>
    }) => mastraClient.score(params),
  })

export const useSaveScoreMutation = () =>
  useMutation({
    mutationFn: (params: Parameters<typeof mastraClient.saveScore>[0]) =>
      mastraClient.saveScore(params),
  })

export const useCreateStoredAgentMutation = () =>
  useMutation({
    mutationFn: (params: CreateStoredAgentParams) =>
      mastraClient.createStoredAgent(params),
  })

export const useUpdateStoredAgentMutation = (storedAgentId: string) =>
  useMutation({
    mutationFn: (params: UpdateStoredAgentParams) =>
      mastraClient.getStoredAgent(storedAgentId).update(params),
  })

export const useDeleteStoredAgentMutation = (storedAgentId: string) =>
  useMutation({
    mutationFn: (requestContext?: RequestContext | RequestContextValue) =>
      mastraClient.getStoredAgent(storedAgentId).delete(requestContext as RequestContext),
  })

export const useCreateStoredAgentVersionMutation = (storedAgentId: string) =>
  useMutation({
    mutationFn: (variables: {
      params?: Parameters<ReturnType<typeof mastraClient.getStoredAgent>['createVersion']>[0]
      requestContext?: RequestContext | RequestContextValue
    }) =>
      mastraClient
        .getStoredAgent(storedAgentId)
        .createVersion(variables.params, variables.requestContext as RequestContext),
  })

export const useActivateStoredAgentVersionMutation = (storedAgentId: string) =>
  useMutation({
    mutationFn: (variables: {
      versionId: string
      requestContext?: RequestContext | RequestContextValue
    }) =>
      mastraClient
        .getStoredAgent(storedAgentId)
        .activateVersion(variables.versionId, variables.requestContext as RequestContext),
  })

export const useRestoreStoredAgentVersionMutation = (storedAgentId: string) =>
  useMutation({
    mutationFn: (variables: {
      versionId: string
      requestContext?: RequestContext | RequestContextValue
    }) =>
      mastraClient
        .getStoredAgent(storedAgentId)
        .restoreVersion(variables.versionId, variables.requestContext as RequestContext),
  })

export const useDeleteStoredAgentVersionMutation = (storedAgentId: string) =>
  useMutation({
    mutationFn: (variables: {
      versionId: string
      requestContext?: RequestContext | RequestContextValue
    }) =>
      mastraClient
        .getStoredAgent(storedAgentId)
        .deleteVersion(variables.versionId, variables.requestContext as RequestContext),
  })

export const useCreateStoredPromptBlockMutation = () =>
  useMutation({
    mutationFn: (params: CreateStoredPromptBlockParams) =>
      mastraClient.createStoredPromptBlock(params),
  })

export const useUpdateStoredPromptBlockMutation = (storedPromptBlockId: string) =>
  useMutation({
    mutationFn: (params: UpdateStoredPromptBlockParams) =>
      mastraClient.getStoredPromptBlock(storedPromptBlockId).update(params),
  })

export const useDeleteStoredPromptBlockMutation = (storedPromptBlockId: string) =>
  useMutation({
    mutationFn: (requestContext?: RequestContext | RequestContextValue) =>
      mastraClient
        .getStoredPromptBlock(storedPromptBlockId)
        .delete(requestContext as RequestContext),
  })

export const useCreateStoredPromptBlockVersionMutation = (storedPromptBlockId: string) =>
  useMutation({
    mutationFn: (variables: {
      params?: Parameters<ReturnType<typeof mastraClient.getStoredPromptBlock>['createVersion']>[0]
      requestContext?: RequestContext | RequestContextValue
    }) =>
      mastraClient
        .getStoredPromptBlock(storedPromptBlockId)
        .createVersion(variables.params, variables.requestContext as RequestContext),
  })

export const useActivateStoredPromptBlockVersionMutation = (storedPromptBlockId: string) =>
  useMutation({
    mutationFn: (variables: {
      versionId: string
      requestContext?: RequestContext | RequestContextValue
    }) =>
      mastraClient
        .getStoredPromptBlock(storedPromptBlockId)
        .activateVersion(variables.versionId, variables.requestContext as RequestContext),
  })

export const useRestoreStoredPromptBlockVersionMutation = (storedPromptBlockId: string) =>
  useMutation({
    mutationFn: (variables: {
      versionId: string
      requestContext?: RequestContext | RequestContextValue
    }) =>
      mastraClient
        .getStoredPromptBlock(storedPromptBlockId)
        .restoreVersion(variables.versionId, variables.requestContext as RequestContext),
  })

export const useDeleteStoredPromptBlockVersionMutation = (storedPromptBlockId: string) =>
  useMutation({
    mutationFn: (variables: {
      versionId: string
      requestContext?: RequestContext | RequestContextValue
    }) =>
      mastraClient
        .getStoredPromptBlock(storedPromptBlockId)
        .deleteVersion(variables.versionId, variables.requestContext as RequestContext),
  })

export const useCreateStoredScorerMutation = () =>
  useMutation({
    mutationFn: (params: CreateStoredScorerParams) =>
      mastraClient.createStoredScorer(params),
  })

export const useUpdateStoredScorerMutation = (storedScorerId: string) =>
  useMutation({
    mutationFn: (params: UpdateStoredScorerParams) =>
      mastraClient.getStoredScorer(storedScorerId).update(params),
  })

export const useDeleteStoredScorerMutation = (storedScorerId: string) =>
  useMutation({
    mutationFn: (requestContext?: RequestContext | RequestContextValue) =>
      mastraClient.getStoredScorer(storedScorerId).delete(requestContext as RequestContext),
  })

export const useCreateStoredScorerVersionMutation = (storedScorerId: string) =>
  useMutation({
    mutationFn: (variables: {
      params?: Parameters<ReturnType<typeof mastraClient.getStoredScorer>['createVersion']>[0]
      requestContext?: RequestContext | RequestContextValue
    }) =>
      mastraClient
        .getStoredScorer(storedScorerId)
        .createVersion(variables.params, variables.requestContext as RequestContext),
  })

export const useActivateStoredScorerVersionMutation = (storedScorerId: string) =>
  useMutation({
    mutationFn: (variables: {
      versionId: string
      requestContext?: RequestContext | RequestContextValue
    }) =>
      mastraClient
        .getStoredScorer(storedScorerId)
        .activateVersion(variables.versionId, variables.requestContext as RequestContext),
  })

export const useRestoreStoredScorerVersionMutation = (storedScorerId: string) =>
  useMutation({
    mutationFn: (variables: {
      versionId: string
      requestContext?: RequestContext | RequestContextValue
    }) =>
      mastraClient
        .getStoredScorer(storedScorerId)
        .restoreVersion(variables.versionId, variables.requestContext as RequestContext),
  })

export const useDeleteStoredScorerVersionMutation = (storedScorerId: string) =>
  useMutation({
    mutationFn: (variables: {
      versionId: string
      requestContext?: RequestContext | RequestContextValue
    }) =>
      mastraClient
        .getStoredScorer(storedScorerId)
        .deleteVersion(variables.versionId, variables.requestContext as RequestContext),
  })

export const useCreateStoredMcpClientMutation = () =>
  useMutation({
    mutationFn: (params: CreateStoredMCPClientParams) =>
      mastraClient.createStoredMCPClient(params),
  })

export const useUpdateStoredMcpClientMutation = (storedMcpClientId: string) =>
  useMutation({
    mutationFn: (params: UpdateStoredMCPClientParams) =>
      mastraClient.getStoredMCPClient(storedMcpClientId).update(params),
  })

export const useDeleteStoredMcpClientMutation = (storedMcpClientId: string) =>
  useMutation({
    mutationFn: (requestContext?: RequestContext | RequestContextValue) =>
      mastraClient
        .getStoredMCPClient(storedMcpClientId)
        .delete(requestContext as RequestContext),
  })

export const useCreateStoredSkillMutation = () =>
  useMutation({
    mutationFn: (params: CreateStoredSkillParams) =>
      mastraClient.createStoredSkill(params),
  })

export const useUpdateStoredSkillMutation = (storedSkillId: string) =>
  useMutation({
    mutationFn: (params: UpdateStoredSkillParams) =>
      mastraClient.getStoredSkill(storedSkillId).update(params),
  })

export const useDeleteStoredSkillMutation = (storedSkillId: string) =>
  useMutation({
    mutationFn: (requestContext?: RequestContext | RequestContextValue) =>
      mastraClient.getStoredSkill(storedSkillId).delete(requestContext as RequestContext),
  })

export const useAgentBuilderCreateRunMutation = (actionId: string) =>
  useMutation({
    mutationFn: (
      params?: Parameters<ReturnType<typeof mastraClient.getAgentBuilderAction>['createRun']>[0]
    ) => mastraClient.getAgentBuilderAction(actionId).createRun(params),
  })

export const useAgentBuilderStartAsyncMutation = (actionId: string) =>
  useMutation({
    mutationFn: ({
      params,
      runId,
    }: {
      params: Parameters<ReturnType<typeof mastraClient.getAgentBuilderAction>['startAsync']>[0]
      runId?: string
    }) => mastraClient.getAgentBuilderAction(actionId).startAsync(params, runId),
  })

export const useAgentBuilderStartRunMutation = (actionId: string) =>
  useMutation({
    mutationFn: ({
      params,
      runId,
    }: {
      params: Parameters<ReturnType<typeof mastraClient.getAgentBuilderAction>['startActionRun']>[0]
      runId: string
    }) => mastraClient.getAgentBuilderAction(actionId).startActionRun(params, runId),
  })

export const useAgentBuilderResumeMutation = (actionId: string) =>
  useMutation({
    mutationFn: ({
      params,
      runId,
    }: {
      params: Parameters<ReturnType<typeof mastraClient.getAgentBuilderAction>['resume']>[0]
      runId: string
    }) => mastraClient.getAgentBuilderAction(actionId).resume(params, runId),
  })

export const useAgentBuilderResumeAsyncMutation = (actionId: string) =>
  useMutation({
    mutationFn: ({
      params,
      runId,
    }: {
      params: Parameters<ReturnType<typeof mastraClient.getAgentBuilderAction>['resumeAsync']>[0]
      runId: string
    }) => mastraClient.getAgentBuilderAction(actionId).resumeAsync(params, runId),
  })

export const useAgentBuilderCancelRunMutation = (actionId: string) =>
  useMutation({
    mutationFn: (runId: string) =>
      mastraClient.getAgentBuilderAction(actionId).cancelRun(runId),
  })
