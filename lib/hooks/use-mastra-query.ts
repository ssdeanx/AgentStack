'use client'

import { mastraClient } from '@/lib/mastra-client'
import type {
  Agent,
  ListAgentsModelProvidersResponse,
  LogEntry,
  MemoryStatus,
  MemoryThread,
  RequestContextValue,
  Tool,
  TracesResponse,
  VectorIndex,
  Workflow,
  WorkspaceItem,
} from '@/lib/types/mastra-api'
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
  DatasetExperimentResult,
  DatasetItem,
  DatasetItemVersionResponse,
  DatasetRecord,
  DatasetVersionResponse,
  ExecuteProcessorParams,
  GetLogsParams,
  GetMemoryConfigParams,
  GetSkillReferenceResponse,
  GetScorerResponse,
  ListSkillsResponse,
  ListSkillReferencesResponse,
  ListScoresResponse,
  ListMemoryThreadMessagesParams,
  ListStoredMCPClientsParams,
  ListStoredPromptBlocksParams,
  ListStoredScorersParams,
  ListStoredSkillsParams,
  ListToolProviderToolsParams,
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
  Skill,
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
  SendStreamingMessageResponse,
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
  useAgentModelProviders: () => UseQueryResult<ListAgentsModelProvidersResponse, Error>
  useAgentSpeakers: (
    agentId: string,
    requestContext?: RequestContext | RequestContextValue
  ) => UseQueryResult<Awaited<ReturnType<ReturnType<typeof mastraClient.getAgent>['voice']['getSpeakers']>>, Error>
  useAgentListener: (
    agentId: string,
    requestContext?: RequestContext | RequestContextValue
  ) => UseQueryResult<Awaited<ReturnType<ReturnType<typeof mastraClient.getAgent>['voice']['getListener']>>, Error>
  useTools: (
    requestContext?: RequestContext | RequestContextValue
  ) => UseQueryResult<Tool[], Error>
  useTool: (
    toolId: string,
    requestContext?: RequestContext | RequestContextValue
  ) => UseQueryResult<Tool, Error>
  useToolProviders: () => UseQueryResult<Awaited<ReturnType<typeof mastraClient.listToolProviders>>, Error>
  useToolProvider: (
    providerId: string
  ) => UseQueryResult<Awaited<ReturnType<ReturnType<typeof mastraClient.getToolProvider>['listToolkits']>>, Error>
  useToolProviderToolkits: (
    providerId: string
  ) => UseQueryResult<Awaited<ReturnType<ReturnType<typeof mastraClient.getToolProvider>['listToolkits']>>, Error>
  useToolProviderTools: (
    providerId: string,
    params?: ListToolProviderToolsParams
  ) => UseQueryResult<Awaited<ReturnType<ReturnType<typeof mastraClient.getToolProvider>['listTools']>>, Error>
  useToolProviderToolSchema: (
    providerId: string,
    toolSlug: string
  ) => UseQueryResult<Awaited<ReturnType<ReturnType<typeof mastraClient.getToolProvider>['getToolSchema']>>, Error>
  useProcessors: (
    requestContext?: RequestContext | RequestContextValue
  ) => UseQueryResult<Awaited<ReturnType<typeof mastraClient.listProcessors>>, Error>
  useProcessor: (
    processorId: string,
    requestContext?: RequestContext | RequestContextValue
  ) => UseQueryResult<Awaited<ReturnType<ReturnType<typeof mastraClient.getProcessor>['details']>>, Error>
  useProcessorProviders: () => UseQueryResult<Awaited<ReturnType<typeof mastraClient.getProcessorProviders>>, Error>
  useProcessorProvider: (
    providerId: string
  ) => UseQueryResult<Awaited<ReturnType<ReturnType<typeof mastraClient.getProcessorProvider>['details']>>, Error>
  useWorkflows: (
    requestContext?: RequestContext | RequestContextValue,
    partial?: boolean
  ) => UseQueryResult<Workflow[], Error>
  useWorkflow: (
    workflowId: string,
    requestContext?: RequestContext | RequestContextValue
  ) => UseQueryResult<Workflow, Error>
  useWorkflowRun: (
    workflowId: string,
    runId: string,
    options?: {
      requestContext?: RequestContext | Record<string, unknown>
      fields?: string[]
      withNestedWorkflows?: boolean
    }
  ) => UseQueryResult<Awaited<ReturnType<ReturnType<typeof mastraClient.getWorkflow>['runById']>>, Error>
  useWorkflowRuns: (
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
  ) => UseQueryResult<Awaited<ReturnType<ReturnType<typeof mastraClient.getWorkflow>['runs']>>, Error>
  useWorkflowSchema: (
    workflowId: string
  ) => UseQueryResult<Awaited<ReturnType<ReturnType<typeof mastraClient.getWorkflow>['getSchema']>>, Error>
  useScorers: (
    requestContext?: RequestContext | RequestContextValue
  ) => UseQueryResult<Record<string, GetScorerResponse>, Error>
  useScorer: (scorerId: string) => UseQueryResult<GetScorerResponse, Error>
  useTraces: (params?: ListTracesArgs) => UseQueryResult<TracesResponse, Error>
  useScoresByRun: (
    params?: ListScoresByRunIdParams
  ) => UseQueryResult<ListScoresResponse, Error>
  useScoresByScorer: (
    params?: ListScoresByScorerIdParams
  ) => UseQueryResult<ListScoresResponse, Error>
  useScoresByEntity: (
    params?: ListScoresByEntityIdParams
  ) => UseQueryResult<ListScoresResponse, Error>
  useThreads: (params?: {
    resourceId?: string
    agentId?: string
  }) => UseQueryResult<MemoryThread[], Error>
  useThread: (
    threadId: string,
    agentId?: string,
    requestContext?: RequestContext | RequestContextValue
  ) => UseQueryResult<Awaited<ReturnType<ReturnType<typeof mastraClient.getMemoryThread>['get']>>, Error>
  useThreadMessages: (
    threadId: string,
    opts?: {
      agentId?: string
      networkId?: string
      requestContext?: RequestContext | RequestContextValue
    }
  ) => UseQueryResult<Awaited<ReturnType<typeof mastraClient.listThreadMessages>>['messages'], Error>
  useThreadMessagesPaginated: (
    threadId: string,
    opts?: ListMemoryThreadMessagesParams & {
      agentId?: string
      requestContext?: RequestContext | RequestContextValue
    }
  ) => UseQueryResult<Awaited<ReturnType<ReturnType<typeof mastraClient.getMemoryThread>['listMessages']>>['messages'], Error>
  useWorkingMemory: (params: {
    agentId: string
    threadId: string
    resourceId?: string
    requestContext?: RequestContext | RequestContextValue
  }) => UseQueryResult<Awaited<ReturnType<typeof mastraClient.getWorkingMemory>>, Error>
  useMemorySearch: (params: {
    agentId: string
    resourceId: string
    threadId?: string
    searchQuery: string
    memoryConfig?: unknown
    requestContext?: RequestContext | RequestContextValue
  }) => UseQueryResult<Awaited<ReturnType<typeof mastraClient.searchMemory>>, Error>
  useDatasets: (pagination?: {
    page?: number
    perPage?: number
  }) => UseQueryResult<{
    datasets: DatasetRecord[]
    pagination: {
      total: number
      page: number
      perPage: number | false
      hasMore: boolean
    }
  }, Error>
  useDataset: (datasetId: string) => UseQueryResult<DatasetRecord, Error>
  useDatasetItems: (
    datasetId: string,
    params?: {
      page?: number
      perPage?: number
      search?: string
      version?: number | null
    }
  ) => UseQueryResult<{
    items: DatasetItem[]
    pagination: {
      total: number
      page: number
      perPage: number | false
      hasMore: boolean
    }
  }, Error>
  useDatasetItem: (
    datasetId: string,
    itemId: string
  ) => UseQueryResult<DatasetItem, Error>
  useDatasetItemHistory: (
    datasetId: string,
    itemId: string
  ) => UseQueryResult<{ history: DatasetItemVersionResponse[] }, Error>
  useDatasetItemVersion: (
    datasetId: string,
    itemId: string,
    datasetVersion: number
  ) => UseQueryResult<DatasetItemVersionResponse, Error>
  useDatasetVersions: (
    datasetId: string,
    pagination?: { page?: number; perPage?: number }
  ) => UseQueryResult<{
    versions: DatasetVersionResponse[]
    pagination: {
      total: number
      page: number
      perPage: number | false
      hasMore: boolean
    }
  }, Error>
  useDatasetExperiments: (
    datasetId: string,
    pagination?: { page?: number; perPage?: number }
  ) => UseQueryResult<{
    experiments: DatasetExperiment[]
    pagination: {
      total: number
      page: number
      perPage: number | false
      hasMore: boolean
    }
  }, Error>
  useDatasetExperiment: (
    datasetId: string,
    experimentId: string
  ) => UseQueryResult<DatasetExperiment, Error>
  useDatasetExperimentResults: (
    datasetId: string,
    experimentId: string,
    pagination?: { page?: number; perPage?: number }
  ) => UseQueryResult<{
    results: DatasetExperimentResult[]
    pagination: {
      total: number
      page: number
      perPage: number | false
      hasMore: boolean
    }
  }, Error>
  useCompareExperiments: (
    params?: CompareExperimentsParams
  ) => UseQueryResult<CompareExperimentsResponse, Error>
  useCreateDatasetMutation: () => UseMutationResult<
    DatasetRecord,
    Error,
    CreateDatasetParams,
    unknown
  >
  useUpdateDatasetMutation: () => UseMutationResult<
    DatasetRecord,
    Error,
    UpdateDatasetParams,
    unknown
  >
  useDeleteDatasetMutation: () => UseMutationResult<
    { success: boolean },
    Error,
    string,
    unknown
  >
  useAddDatasetItemMutation: () => UseMutationResult<
    DatasetItem,
    Error,
    AddDatasetItemParams,
    unknown
  >
  useUpdateDatasetItemMutation: () => UseMutationResult<
    DatasetItem,
    Error,
    UpdateDatasetItemParams,
    unknown
  >
  useDeleteDatasetItemMutation: () => UseMutationResult<
    { success: boolean },
    Error,
    { datasetId: string; itemId: string },
    unknown
  >
  useBatchInsertDatasetItemsMutation: () => UseMutationResult<
    { items: DatasetItem[]; count: number },
    Error,
    BatchInsertDatasetItemsParams,
    unknown
  >
  useBatchDeleteDatasetItemsMutation: () => UseMutationResult<
    { success: boolean; deletedCount: number },
    Error,
    BatchDeleteDatasetItemsParams,
    unknown
  >
  useTriggerDatasetExperimentMutation: () => UseMutationResult<
    Awaited<ReturnType<typeof mastraClient.triggerDatasetExperiment>>,
    Error,
    TriggerDatasetExperimentParams,
    unknown
  >
  useSaveScoreMutation: () => UseMutationResult<
    Awaited<ReturnType<typeof mastraClient.saveScore>>,
    Error,
    Parameters<typeof mastraClient.saveScore>[0],
    unknown
  >
  useVectorIndexes: (vectorName?: string) => UseQueryResult<VectorIndex[], Error>
  useLogs: (params: GetLogsParams) => UseQueryResult<LogEntry[], Error>
  useLogTransports: () => UseQueryResult<string[], Error>
  useMemoryStatus: (
    agentId: string,
    requestContext?: RequestContext | RequestContextValue,
    opts?: { resourceId?: string; threadId?: string }
  ) => UseQueryResult<MemoryStatus, Error>
  useMemoryConfig: (
    params: GetMemoryConfigParams
  ) => UseQueryResult<Awaited<ReturnType<typeof mastraClient.getMemoryConfig>>, Error>
  useObservationalMemory: (params: Parameters<typeof mastraClient.getObservationalMemory>[0]) => UseQueryResult<Awaited<ReturnType<typeof mastraClient.getObservationalMemory>>, Error>
  useAwaitBufferStatus: (params: Parameters<typeof mastraClient.awaitBufferStatus>[0]) => UseQueryResult<Awaited<ReturnType<typeof mastraClient.awaitBufferStatus>>, Error>
  useStoredAgents: (
    params?: ListStoredAgentsParams
  ) => UseQueryResult<Awaited<ReturnType<typeof mastraClient.listStoredAgents>>, Error>
  useStoredAgent: (
    id: string,
    requestContext?: RequestContext | RequestContextValue,
    options?: { status?: 'draft' | 'published' | 'archived' }
  ) => UseQueryResult<Awaited<ReturnType<ReturnType<typeof mastraClient.getStoredAgent>['details']>>, Error>
  useStoredAgentVersions: (
    storedAgentId: string,
    params?: Parameters<ReturnType<typeof mastraClient.getStoredAgent>['listVersions']>[0],
    requestContext?: RequestContext | RequestContextValue
  ) => UseQueryResult<Awaited<ReturnType<ReturnType<typeof mastraClient.getStoredAgent>['listVersions']>>, Error>
  useStoredAgentVersion: (
    storedAgentId: string,
    versionId: string,
    requestContext?: RequestContext | RequestContextValue
  ) => UseQueryResult<Awaited<ReturnType<ReturnType<typeof mastraClient.getStoredAgent>['getVersion']>>, Error>
  useCompareStoredAgentVersions: (
    storedAgentId: string,
    fromId: string,
    toId: string,
    requestContext?: RequestContext | RequestContextValue
  ) => UseQueryResult<Awaited<ReturnType<ReturnType<typeof mastraClient.getStoredAgent>['compareVersions']>>, Error>
  useStoredPromptBlocks: (
    params?: ListStoredPromptBlocksParams
  ) => UseQueryResult<Awaited<ReturnType<typeof mastraClient.listStoredPromptBlocks>>, Error>
  useStoredPromptBlock: (
    id: string,
    requestContext?: RequestContext | RequestContextValue,
    options?: { status?: 'draft' | 'published' | 'archived' }
  ) => UseQueryResult<Awaited<ReturnType<ReturnType<typeof mastraClient.getStoredPromptBlock>['details']>>, Error>
  useStoredPromptBlockVersions: (
    storedPromptBlockId: string,
    params?: Parameters<ReturnType<typeof mastraClient.getStoredPromptBlock>['listVersions']>[0],
    requestContext?: RequestContext | RequestContextValue
  ) => UseQueryResult<Awaited<ReturnType<ReturnType<typeof mastraClient.getStoredPromptBlock>['listVersions']>>, Error>
  useStoredPromptBlockVersion: (
    storedPromptBlockId: string,
    versionId: string,
    requestContext?: RequestContext | RequestContextValue
  ) => UseQueryResult<Awaited<ReturnType<ReturnType<typeof mastraClient.getStoredPromptBlock>['getVersion']>>, Error>
  useCompareStoredPromptBlockVersions: (
    storedPromptBlockId: string,
    fromId: string,
    toId: string,
    requestContext?: RequestContext | RequestContextValue
  ) => UseQueryResult<Awaited<ReturnType<ReturnType<typeof mastraClient.getStoredPromptBlock>['compareVersions']>>, Error>
  useStoredScorers: (
    params?: ListStoredScorersParams
  ) => UseQueryResult<Awaited<ReturnType<typeof mastraClient.listStoredScorers>>, Error>
  useStoredScorer: (
    id: string,
    requestContext?: RequestContext | RequestContextValue,
    options?: { status?: 'draft' | 'published' | 'archived' }
  ) => UseQueryResult<Awaited<ReturnType<ReturnType<typeof mastraClient.getStoredScorer>['details']>>, Error>
  useStoredScorerVersions: (
    storedScorerId: string,
    params?: Parameters<ReturnType<typeof mastraClient.getStoredScorer>['listVersions']>[0],
    requestContext?: RequestContext | RequestContextValue
  ) => UseQueryResult<Awaited<ReturnType<ReturnType<typeof mastraClient.getStoredScorer>['listVersions']>>, Error>
  useStoredScorerVersion: (
    storedScorerId: string,
    versionId: string,
    requestContext?: RequestContext | RequestContextValue
  ) => UseQueryResult<Awaited<ReturnType<ReturnType<typeof mastraClient.getStoredScorer>['getVersion']>>, Error>
  useCompareStoredScorerVersions: (
    storedScorerId: string,
    fromId: string,
    toId: string,
    requestContext?: RequestContext | RequestContextValue
  ) => UseQueryResult<Awaited<ReturnType<ReturnType<typeof mastraClient.getStoredScorer>['compareVersions']>>, Error>
  useStoredMcpClients: (
    params?: ListStoredMCPClientsParams
  ) => UseQueryResult<Awaited<ReturnType<typeof mastraClient.listStoredMCPClients>>, Error>
  useStoredMcpClient: (
    id: string,
    requestContext?: RequestContext | RequestContextValue
  ) => UseQueryResult<Awaited<ReturnType<ReturnType<typeof mastraClient.getStoredMCPClient>['details']>>, Error>
  useStoredSkills: (
    params?: ListStoredSkillsParams
  ) => UseQueryResult<Awaited<ReturnType<typeof mastraClient.listStoredSkills>>, Error>
  useStoredSkill: (
    id: string,
    requestContext?: RequestContext | RequestContextValue
  ) => UseQueryResult<Awaited<ReturnType<ReturnType<typeof mastraClient.getStoredSkill>['details']>>, Error>
  useAgentEnhanceInstructionsMutation: (
    agentId: string
  ) => UseMutationResult<
    { explanation: string; new_prompt: string },
    Error,
    { instructions: string; comment: string },
    unknown
  >
  useWorkspaces: () => UseQueryResult<{ workspaces: WorkspaceItem[] }, Error>
  useVectors: () => UseQueryResult<Awaited<ReturnType<typeof mastraClient.listVectors>>, Error>
  useEmbedders: () => UseQueryResult<Awaited<ReturnType<typeof mastraClient.listEmbedders>>, Error>
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
  useWorkspaceSkill: (
    workspaceId: string,
    skillName: string
  ) => UseQueryResult<Skill, Error>
  useWorkspaceSkillReferences: (
    workspaceId: string,
    skillName: string
  ) => UseQueryResult<ListSkillReferencesResponse, Error>
  useWorkspaceSkillReference: (
    workspaceId: string,
    skillName: string,
    referencePath: string
  ) => UseQueryResult<GetSkillReferenceResponse, Error>
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
  useA2ASendStreamingMessageMutation: (
    agentId: string
  ) => UseMutationResult<AsyncIterable<SendStreamingMessageResponse>, Error, MessageSendParams, unknown>
  useA2AGetTask: (
    agentId: string,
    params: TaskQueryParams
  ) => UseQueryResult<GetTaskResponse, Error>
  useA2ACancelTaskMutation: (
    agentId: string
  ) => UseMutationResult<Task, Error, TaskQueryParams, unknown>
  useAgentBuilderActions: () => UseQueryResult<Awaited<ReturnType<typeof mastraClient.getAgentBuilderActions>>, Error>
  useAgentBuilderAction: (
    actionId: string
  ) => UseQueryResult<Awaited<ReturnType<ReturnType<typeof mastraClient.getAgentBuilderAction>['details']>>, Error>
  useAgentBuilderRuns: (
    actionId: string,
    params?: Parameters<ReturnType<typeof mastraClient.getAgentBuilderAction>['runs']>[0]
  ) => UseQueryResult<Awaited<ReturnType<ReturnType<typeof mastraClient.getAgentBuilderAction>['runs']>>, Error>
  useAgentBuilderRun: (
    actionId: string,
    runId: string,
    options?: Parameters<ReturnType<typeof mastraClient.getAgentBuilderAction>['runById']>[1]
  ) => UseQueryResult<Awaited<ReturnType<ReturnType<typeof mastraClient.getAgentBuilderAction>['runById']>>, Error>
  useProcessorExecuteMutation: (
    processorId: string
  ) => UseMutationResult<Awaited<ReturnType<ReturnType<typeof mastraClient.getProcessor>['execute']>>, Error, ExecuteProcessorParams, unknown>
  useSaveMessageToMemoryMutation: () => UseMutationResult<Awaited<ReturnType<typeof mastraClient.saveMessageToMemory>>, Error, SaveMessageToMemoryParams, unknown>
  useDeleteThreadMessagesMutation: (
    threadId: string,
    agentId?: string
  ) => UseMutationResult<
    Awaited<ReturnType<ReturnType<typeof mastraClient.getMemoryThread>['deleteMessages']>>,
    Error,
    {
      messageIds: Parameters<ReturnType<typeof mastraClient.getMemoryThread>['deleteMessages']>[0]
      requestContext?: RequestContext | RequestContextValue
    },
    unknown
  >
  useCloneThreadMutation: (
    threadId: string,
    agentId?: string
  ) => UseMutationResult<Awaited<ReturnType<ReturnType<typeof mastraClient.getMemoryThread>['clone']>>, Error, CloneMemoryThreadParams | undefined, unknown>
  useWorkflowDeleteRunMutation: (
    workflowId: string
  ) => UseMutationResult<Awaited<ReturnType<ReturnType<typeof mastraClient.getWorkflow>['deleteRunById']>>, Error, string, unknown>
  useWorkflowResumeMutation: (
    workflowId: string
  ) => UseMutationResult<
    Awaited<ReturnType<Awaited<ReturnType<ReturnType<typeof mastraClient.getWorkflow>['createRun']>>['resume']>>,
    Error,
    {
      runId: string
      params: Parameters<Awaited<ReturnType<ReturnType<typeof mastraClient.getWorkflow>['createRun']>>['resume']>[0]
    },
    unknown
  >
  useWorkflowResumeAsyncMutation: (
    workflowId: string
  ) => UseMutationResult<
    Awaited<ReturnType<Awaited<ReturnType<ReturnType<typeof mastraClient.getWorkflow>['createRun']>>['resumeAsync']>>,
    Error,
    {
      runId: string
      params: Parameters<Awaited<ReturnType<ReturnType<typeof mastraClient.getWorkflow>['createRun']>>['resumeAsync']>[0]
    },
    unknown
  >
  useWorkflowCancelMutation: (
    workflowId: string
  ) => UseMutationResult<
    Awaited<ReturnType<Awaited<ReturnType<ReturnType<typeof mastraClient.getWorkflow>['createRun']>>['cancel']>>,
    Error,
    { runId: string },
    unknown
  >
  useWorkflowRestartMutation: (
    workflowId: string
  ) => UseMutationResult<
    Awaited<ReturnType<Awaited<ReturnType<ReturnType<typeof mastraClient.getWorkflow>['createRun']>>['restart']>>,
    Error,
    {
      runId: string
      params: Parameters<Awaited<ReturnType<ReturnType<typeof mastraClient.getWorkflow>['createRun']>>['restart']>[0]
    },
    unknown
  >
  useWorkflowRestartAsyncMutation: (
    workflowId: string
  ) => UseMutationResult<
    Awaited<ReturnType<Awaited<ReturnType<ReturnType<typeof mastraClient.getWorkflow>['createRun']>>['restartAsync']>>,
    Error,
    {
      runId: string
      params?: Parameters<Awaited<ReturnType<ReturnType<typeof mastraClient.getWorkflow>['createRun']>>['restartAsync']>[0]
    },
    unknown
  >
  useWorkflowTimeTravelMutation: (
    workflowId: string
  ) => UseMutationResult<
    Awaited<ReturnType<Awaited<ReturnType<ReturnType<typeof mastraClient.getWorkflow>['createRun']>>['timeTravel']>>,
    Error,
    {
      runId: string
      params: Parameters<Awaited<ReturnType<ReturnType<typeof mastraClient.getWorkflow>['createRun']>>['timeTravel']>[0]
    },
    unknown
  >
  useWorkflowTimeTravelAsyncMutation: (
    workflowId: string
  ) => UseMutationResult<
    Awaited<ReturnType<Awaited<ReturnType<ReturnType<typeof mastraClient.getWorkflow>['createRun']>>['timeTravelAsync']>>,
    Error,
    {
      runId: string
      params: Parameters<Awaited<ReturnType<ReturnType<typeof mastraClient.getWorkflow>['createRun']>>['timeTravelAsync']>[0]
    },
    unknown
  >
  useCreateStoredAgentMutation: () => UseMutationResult<Awaited<ReturnType<typeof mastraClient.createStoredAgent>>, Error, CreateStoredAgentParams, unknown>
  useUpdateStoredAgentMutation: (
    storedAgentId: string
  ) => UseMutationResult<Awaited<ReturnType<ReturnType<typeof mastraClient.getStoredAgent>['update']>>, Error, UpdateStoredAgentParams, unknown>
  useDeleteStoredAgentMutation: (
    storedAgentId: string
  ) => UseMutationResult<Awaited<ReturnType<ReturnType<typeof mastraClient.getStoredAgent>['delete']>>, Error, RequestContext | RequestContextValue | undefined, unknown>
  useCreateStoredAgentVersionMutation: (
    storedAgentId: string
  ) => UseMutationResult<Awaited<ReturnType<ReturnType<typeof mastraClient.getStoredAgent>['createVersion']>>, Error, {
    params?: Parameters<ReturnType<typeof mastraClient.getStoredAgent>['createVersion']>[0]
    requestContext?: RequestContext | RequestContextValue
  }, unknown>
  useActivateStoredAgentVersionMutation: (
    storedAgentId: string
  ) => UseMutationResult<Awaited<ReturnType<ReturnType<typeof mastraClient.getStoredAgent>['activateVersion']>>, Error, {
    versionId: string
    requestContext?: RequestContext | RequestContextValue
  }, unknown>
  useRestoreStoredAgentVersionMutation: (
    storedAgentId: string
  ) => UseMutationResult<Awaited<ReturnType<ReturnType<typeof mastraClient.getStoredAgent>['restoreVersion']>>, Error, {
    versionId: string
    requestContext?: RequestContext | RequestContextValue
  }, unknown>
  useDeleteStoredAgentVersionMutation: (
    storedAgentId: string
  ) => UseMutationResult<Awaited<ReturnType<ReturnType<typeof mastraClient.getStoredAgent>['deleteVersion']>>, Error, {
    versionId: string
    requestContext?: RequestContext | RequestContextValue
  }, unknown>
  useCreateStoredPromptBlockMutation: () => UseMutationResult<Awaited<ReturnType<typeof mastraClient.createStoredPromptBlock>>, Error, CreateStoredPromptBlockParams, unknown>
  useUpdateStoredPromptBlockMutation: (
    storedPromptBlockId: string
  ) => UseMutationResult<Awaited<ReturnType<ReturnType<typeof mastraClient.getStoredPromptBlock>['update']>>, Error, UpdateStoredPromptBlockParams, unknown>
  useDeleteStoredPromptBlockMutation: (
    storedPromptBlockId: string
  ) => UseMutationResult<Awaited<ReturnType<ReturnType<typeof mastraClient.getStoredPromptBlock>['delete']>>, Error, RequestContext | RequestContextValue | undefined, unknown>
  useCreateStoredPromptBlockVersionMutation: (
    storedPromptBlockId: string
  ) => UseMutationResult<Awaited<ReturnType<ReturnType<typeof mastraClient.getStoredPromptBlock>['createVersion']>>, Error, {
    params?: Parameters<ReturnType<typeof mastraClient.getStoredPromptBlock>['createVersion']>[0]
    requestContext?: RequestContext | RequestContextValue
  }, unknown>
  useActivateStoredPromptBlockVersionMutation: (
    storedPromptBlockId: string
  ) => UseMutationResult<Awaited<ReturnType<ReturnType<typeof mastraClient.getStoredPromptBlock>['activateVersion']>>, Error, {
    versionId: string
    requestContext?: RequestContext | RequestContextValue
  }, unknown>
  useRestoreStoredPromptBlockVersionMutation: (
    storedPromptBlockId: string
  ) => UseMutationResult<Awaited<ReturnType<ReturnType<typeof mastraClient.getStoredPromptBlock>['restoreVersion']>>, Error, {
    versionId: string
    requestContext?: RequestContext | RequestContextValue
  }, unknown>
  useDeleteStoredPromptBlockVersionMutation: (
    storedPromptBlockId: string
  ) => UseMutationResult<Awaited<ReturnType<ReturnType<typeof mastraClient.getStoredPromptBlock>['deleteVersion']>>, Error, {
    versionId: string
    requestContext?: RequestContext | RequestContextValue
  }, unknown>
  useCreateStoredScorerMutation: () => UseMutationResult<Awaited<ReturnType<typeof mastraClient.createStoredScorer>>, Error, CreateStoredScorerParams, unknown>
  useUpdateStoredScorerMutation: (
    storedScorerId: string
  ) => UseMutationResult<Awaited<ReturnType<ReturnType<typeof mastraClient.getStoredScorer>['update']>>, Error, UpdateStoredScorerParams, unknown>
  useDeleteStoredScorerMutation: (
    storedScorerId: string
  ) => UseMutationResult<Awaited<ReturnType<ReturnType<typeof mastraClient.getStoredScorer>['delete']>>, Error, RequestContext | RequestContextValue | undefined, unknown>
  useCreateStoredScorerVersionMutation: (
    storedScorerId: string
  ) => UseMutationResult<Awaited<ReturnType<ReturnType<typeof mastraClient.getStoredScorer>['createVersion']>>, Error, {
    params?: Parameters<ReturnType<typeof mastraClient.getStoredScorer>['createVersion']>[0]
    requestContext?: RequestContext | RequestContextValue
  }, unknown>
  useActivateStoredScorerVersionMutation: (
    storedScorerId: string
  ) => UseMutationResult<Awaited<ReturnType<ReturnType<typeof mastraClient.getStoredScorer>['activateVersion']>>, Error, {
    versionId: string
    requestContext?: RequestContext | RequestContextValue
  }, unknown>
  useRestoreStoredScorerVersionMutation: (
    storedScorerId: string
  ) => UseMutationResult<Awaited<ReturnType<ReturnType<typeof mastraClient.getStoredScorer>['restoreVersion']>>, Error, {
    versionId: string
    requestContext?: RequestContext | RequestContextValue
  }, unknown>
  useDeleteStoredScorerVersionMutation: (
    storedScorerId: string
  ) => UseMutationResult<Awaited<ReturnType<ReturnType<typeof mastraClient.getStoredScorer>['deleteVersion']>>, Error, {
    versionId: string
    requestContext?: RequestContext | RequestContextValue
  }, unknown>
  useCreateStoredMcpClientMutation: () => UseMutationResult<Awaited<ReturnType<typeof mastraClient.createStoredMCPClient>>, Error, CreateStoredMCPClientParams, unknown>
  useUpdateStoredMcpClientMutation: (
    storedMcpClientId: string
  ) => UseMutationResult<Awaited<ReturnType<ReturnType<typeof mastraClient.getStoredMCPClient>['update']>>, Error, UpdateStoredMCPClientParams, unknown>
  useDeleteStoredMcpClientMutation: (
    storedMcpClientId: string
  ) => UseMutationResult<Awaited<ReturnType<ReturnType<typeof mastraClient.getStoredMCPClient>['delete']>>, Error, RequestContext | RequestContextValue | undefined, unknown>
  useCreateStoredSkillMutation: () => UseMutationResult<Awaited<ReturnType<typeof mastraClient.createStoredSkill>>, Error, CreateStoredSkillParams, unknown>
  useUpdateStoredSkillMutation: (
    storedSkillId: string
  ) => UseMutationResult<Awaited<ReturnType<ReturnType<typeof mastraClient.getStoredSkill>['update']>>, Error, UpdateStoredSkillParams, unknown>
  useDeleteStoredSkillMutation: (
    storedSkillId: string
  ) => UseMutationResult<Awaited<ReturnType<ReturnType<typeof mastraClient.getStoredSkill>['delete']>>, Error, RequestContext | RequestContextValue | undefined, unknown>
  useAgentBuilderCreateRunMutation: (
    actionId: string
  ) => UseMutationResult<Awaited<ReturnType<ReturnType<typeof mastraClient.getAgentBuilderAction>['createRun']>>, Error, Parameters<ReturnType<typeof mastraClient.getAgentBuilderAction>['createRun']>[0] | undefined, unknown>
  useAgentBuilderStartAsyncMutation: (
    actionId: string
  ) => UseMutationResult<Awaited<ReturnType<ReturnType<typeof mastraClient.getAgentBuilderAction>['startAsync']>>, Error, {
    params: Parameters<ReturnType<typeof mastraClient.getAgentBuilderAction>['startAsync']>[0]
    runId?: string
  }, unknown>
  useAgentBuilderStartRunMutation: (
    actionId: string
  ) => UseMutationResult<Awaited<ReturnType<ReturnType<typeof mastraClient.getAgentBuilderAction>['startActionRun']>>, Error, {
    params: Parameters<ReturnType<typeof mastraClient.getAgentBuilderAction>['startActionRun']>[0]
    runId: string
  }, unknown>
  useAgentBuilderResumeMutation: (
    actionId: string
  ) => UseMutationResult<Awaited<ReturnType<ReturnType<typeof mastraClient.getAgentBuilderAction>['resume']>>, Error, {
    params: Parameters<ReturnType<typeof mastraClient.getAgentBuilderAction>['resume']>[0]
    runId: string
  }, unknown>
  useAgentBuilderResumeAsyncMutation: (
    actionId: string
  ) => UseMutationResult<Awaited<ReturnType<ReturnType<typeof mastraClient.getAgentBuilderAction>['resumeAsync']>>, Error, {
    params: Parameters<ReturnType<typeof mastraClient.getAgentBuilderAction>['resumeAsync']>[0]
    runId: string
  }, unknown>
  useAgentBuilderCancelRunMutation: (
    actionId: string
  ) => UseMutationResult<Awaited<ReturnType<ReturnType<typeof mastraClient.getAgentBuilderAction>['cancelRun']>>, Error, string, unknown>
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
      queryFn: () => mastraClient.listStoredAgents(params),
    })

  const useStoredAgent = (
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

  const useStoredAgentVersions = (
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

  const useStoredAgentVersion = (
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

  const useCompareStoredAgentVersions = (
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

  const useStoredPromptBlocks = (params?: ListStoredPromptBlocksParams) =>
    useQuery({
      queryKey: mastraQueryKeys.storedPromptBlocks.list(params),
      queryFn: () => mastraClient.listStoredPromptBlocks(params),
    })

  const useStoredPromptBlock = (
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

  const useStoredPromptBlockVersions = (
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

  const useStoredPromptBlockVersion = (
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

  const useCompareStoredPromptBlockVersions = (
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

  const useStoredScorers = (params?: ListStoredScorersParams) =>
    useQuery({
      queryKey: mastraQueryKeys.storedScorers.list(params),
      queryFn: () => mastraClient.listStoredScorers(params),
    })

  const useStoredScorer = (
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

  const useStoredScorerVersions = (
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

  const useStoredScorerVersion = (
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

  const useCompareStoredScorerVersions = (
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

  const useStoredMcpClients = (params?: ListStoredMCPClientsParams) =>
    useQuery({
      queryKey: mastraQueryKeys.storedMcpClients.list(params),
      queryFn: () => mastraClient.listStoredMCPClients(params),
    })

  const useStoredMcpClient = (
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

  const useStoredSkills = (params?: ListStoredSkillsParams) =>
    useQuery({
      queryKey: mastraQueryKeys.storedSkills.list(params),
      queryFn: () => mastraClient.listStoredSkills(params),
    })

  const useStoredSkill = (
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

  const useScorers = (
    requestContext?: RequestContext | RequestContextValue
  ) =>
    useQuery<Record<string, GetScorerResponse>, Error>({
      queryKey: [...mastraQueryKeys.observability.all, 'scorers', requestContext] as const,
      queryFn: () => mastraClient.listScorers(requestContext as RequestContext),
    })

  const useScorer = (scorerId: string) =>
    useQuery<GetScorerResponse, Error>({
      queryKey: [...mastraQueryKeys.observability.all, 'scorer', scorerId] as const,
      queryFn: () => mastraClient.getScorer(scorerId),
      enabled: !!scorerId,
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

  const useWorkflowSchema = (workflowId: string) =>
    useQuery({
      queryKey: mastraQueryKeys.workflows.schema(workflowId),
      queryFn: () => mastraClient.getWorkflow(workflowId).getSchema(),
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

  const useToolProviders = () =>
    useQuery({
      queryKey: mastraQueryKeys.tools.providers(),
      queryFn: () => mastraClient.listToolProviders(),
    })

  const useToolProvider = (providerId: string) =>
    useQuery({
      queryKey: mastraQueryKeys.tools.provider(providerId),
      queryFn: () => mastraClient.getToolProvider(providerId).listToolkits(),
      enabled: !!providerId,
    })

  const useToolProviderToolkits = (providerId: string) =>
    useQuery({
      queryKey: mastraQueryKeys.tools.providerToolkits(providerId),
      queryFn: () => mastraClient.getToolProvider(providerId).listToolkits(),
      enabled: !!providerId,
    })

  const useToolProviderTools = (
    providerId: string,
    params?: ListToolProviderToolsParams
  ) =>
    useQuery({
      queryKey: mastraQueryKeys.tools.providerTools(providerId, params),
      queryFn: () => mastraClient.getToolProvider(providerId).listTools(params),
      enabled: !!providerId,
    })

  const useToolProviderToolSchema = (providerId: string, toolSlug: string) =>
    useQuery({
      queryKey: mastraQueryKeys.tools.providerToolSchema(providerId, toolSlug),
      queryFn: () => mastraClient.getToolProvider(providerId).getToolSchema(toolSlug),
      enabled: !!providerId && !!toolSlug,
    })

  const useProcessors = (
    requestContext?: RequestContext | RequestContextValue
  ) =>
    useQuery({
      queryKey: mastraQueryKeys.processors.list(requestContext),
      queryFn: () => mastraClient.listProcessors(requestContext as RequestContext),
    })

  const useProcessor = (
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

  const useProcessorProviders = () =>
    useQuery({
      queryKey: mastraQueryKeys.processors.providers(),
      queryFn: () => mastraClient.getProcessorProviders(),
    })

  const useProcessorProvider = (providerId: string) =>
    useQuery({
      queryKey: mastraQueryKeys.processors.provider(providerId),
      queryFn: () => mastraClient.getProcessorProvider(providerId).details(),
      enabled: !!providerId,
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

  const useThread = (
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

  const useWorkingMemory = (params: {
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

  const useMemorySearch = (params: {
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

  const useObservationalMemory = (
    params: Parameters<typeof mastraClient.getObservationalMemory>[0]
  ) =>
    useQuery({
      queryKey: mastraQueryKeys.memory.om(params),
      queryFn: () => mastraClient.getObservationalMemory(params),
      enabled: !!params.agentId,
    })

  const useAwaitBufferStatus = (
    params: Parameters<typeof mastraClient.awaitBufferStatus>[0]
  ) =>
    useQuery({
      queryKey: mastraQueryKeys.memory.buffer(params),
      queryFn: () => mastraClient.awaitBufferStatus(params),
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

  const useDatasets = (pagination?: { page?: number; perPage?: number }) =>
    useQuery({
      queryKey: mastraQueryKeys.datasets.list(pagination),
      queryFn: () => mastraClient.listDatasets(pagination),
    })

  const useDataset = (datasetId: string) =>
    useQuery<DatasetRecord, Error>({
      queryKey: mastraQueryKeys.datasets.details(datasetId),
      queryFn: () => mastraClient.getDataset(datasetId),
      enabled: !!datasetId,
    })

  const useDatasetItems = (
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

  const useDatasetItem = (datasetId: string, itemId: string) =>
    useQuery<DatasetItem, Error>({
      queryKey: mastraQueryKeys.datasets.item(datasetId, itemId),
      queryFn: () => mastraClient.getDatasetItem(datasetId, itemId),
      enabled: !!datasetId && !!itemId,
    })

  const useDatasetItemHistory = (datasetId: string, itemId: string) =>
    useQuery<{ history: DatasetItemVersionResponse[] }, Error>({
      queryKey: mastraQueryKeys.datasets.itemHistory(datasetId, itemId),
      queryFn: () => mastraClient.getItemHistory(datasetId, itemId),
      enabled: !!datasetId && !!itemId,
    })

  const useDatasetItemVersion = (
    datasetId: string,
    itemId: string,
    datasetVersion: number
  ) =>
    useQuery<DatasetItemVersionResponse, Error>({
      queryKey: mastraQueryKeys.datasets.itemVersion(datasetId, itemId, datasetVersion),
      queryFn: () =>
        mastraClient.getDatasetItemVersion(datasetId, itemId, datasetVersion),
      enabled: !!datasetId && !!itemId,
    })

  const useDatasetVersions = (
    datasetId: string,
    pagination?: { page?: number; perPage?: number }
  ) =>
    useQuery({
      queryKey: mastraQueryKeys.datasets.versions(datasetId, pagination),
      queryFn: () => mastraClient.listDatasetVersions(datasetId, pagination),
      enabled: !!datasetId,
    })

  const useDatasetExperiments = (
    datasetId: string,
    pagination?: { page?: number; perPage?: number }
  ) =>
    useQuery({
      queryKey: mastraQueryKeys.datasets.experiments(datasetId, pagination),
      queryFn: () => mastraClient.listDatasetExperiments(datasetId, pagination),
      enabled: !!datasetId,
    })

  const useDatasetExperiment = (datasetId: string, experimentId: string) =>
    useQuery<DatasetExperiment, Error>({
      queryKey: mastraQueryKeys.datasets.experiment(datasetId, experimentId),
      queryFn: () => mastraClient.getDatasetExperiment(datasetId, experimentId),
      enabled: !!datasetId && !!experimentId,
    })

  const useDatasetExperimentResults = (
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

  const useCompareExperiments = (params?: CompareExperimentsParams) =>
    useQuery<CompareExperimentsResponse, Error>({
      queryKey: mastraQueryKeys.datasets.compare(params),
      queryFn: () =>
        mastraClient.compareExperiments(params as CompareExperimentsParams),
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

  const useVectors = () =>
    useQuery({
      queryKey: mastraQueryKeys.vectors.list(),
      queryFn: () => mastraClient.listVectors(),
    })

  const useEmbedders = () =>
    useQuery({
      queryKey: mastraQueryKeys.embedders.list(),
      queryFn: () => mastraClient.listEmbedders(),
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

  const useWorkspaceSkill = (workspaceId: string, skillName: string) =>
    useQuery({
      queryKey: mastraQueryKeys.workspaces.skill(workspaceId, skillName),
      queryFn: () => mastraClient.getWorkspace(workspaceId).getSkill(skillName).details(),
      enabled: !!workspaceId && !!skillName,
    })

  const useWorkspaceSkillReferences = (workspaceId: string, skillName: string) =>
    useQuery({
      queryKey: mastraQueryKeys.workspaces.skillReferences(workspaceId, skillName),
      queryFn: () =>
        mastraClient.getWorkspace(workspaceId).getSkill(skillName).listReferences(),
      enabled: !!workspaceId && !!skillName,
    })

  const useWorkspaceSkillReference = (
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

  const useA2ASendStreamingMessageMutation = (agentId: string) =>
    useMutation<AsyncIterable<SendStreamingMessageResponse>, Error, MessageSendParams>({
      mutationFn: (params: MessageSendParams) =>
        mastraClient.getA2A(agentId).sendStreamingMessage(params),
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

  const useAgentBuilderActions = () =>
    useQuery({
      queryKey: mastraQueryKeys.agents.builder.actions(),
      queryFn: () => mastraClient.getAgentBuilderActions(),
    })

  const useAgentBuilderAction = (actionId: string) =>
    useQuery({
      queryKey: mastraQueryKeys.agents.builder.action(actionId),
      queryFn: () => mastraClient.getAgentBuilderAction(actionId).details(),
      enabled: !!actionId,
    })

  const useAgentBuilderRuns = (
    actionId: string,
    params?: Parameters<ReturnType<typeof mastraClient.getAgentBuilderAction>['runs']>[0]
  ) =>
    useQuery({
      queryKey: [...mastraQueryKeys.agents.builder.action(actionId), 'runs', params] as const,
      queryFn: () => mastraClient.getAgentBuilderAction(actionId).runs(params),
      enabled: !!actionId,
    })

  const useAgentBuilderRun = (
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

  const useWorkflowDeleteRunMutation = (workflowId: string) =>
    useMutation({
      mutationFn: (runId: string) =>
        mastraClient.getWorkflow(workflowId).deleteRunById(runId),
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: mastraQueryKeys.workflows.all,
        })
      },
    })

  const useWorkflowResumeMutation = (workflowId: string) =>
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

  const useWorkflowResumeAsyncMutation = (workflowId: string) =>
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

  const useWorkflowCancelMutation = (workflowId: string) =>
    useMutation({
      mutationFn: async ({ runId }: { runId: string }) => {
        const run = await mastraClient.getWorkflow(workflowId).createRun({ runId })
        return run.cancel()
      },
    })

  const useWorkflowRestartMutation = (workflowId: string) =>
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

  const useWorkflowRestartAsyncMutation = (workflowId: string) =>
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

  const useWorkflowTimeTravelMutation = (workflowId: string) =>
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

  const useWorkflowTimeTravelAsyncMutation = (workflowId: string) =>
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

  const useSaveMessageToMemoryMutation = () =>
    useMutation({
      mutationFn: (params: SaveMessageToMemoryParams) =>
        mastraClient.saveMessageToMemory(params),
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: mastraQueryKeys.memory.all,
        })
      },
    })

  const useDeleteThreadMessagesMutation = (
    threadId: string,
    agentId?: string
  ) =>
    useMutation({
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

  const useCloneThreadMutation = (threadId: string, agentId?: string) =>
    useMutation({
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

  const useCreateDatasetMutation = () =>
    useMutation({
      mutationFn: (params: CreateDatasetParams) => mastraClient.createDataset(params),
      onSuccess: async () => {
        await queryClient.invalidateQueries({ queryKey: mastraQueryKeys.datasets.all })
      },
    })

  const useUpdateDatasetMutation = () =>
    useMutation({
      mutationFn: (params: UpdateDatasetParams) => mastraClient.updateDataset(params),
      onSuccess: async (_, variables) => {
        await queryClient.invalidateQueries({ queryKey: mastraQueryKeys.datasets.all })
        await queryClient.invalidateQueries({ queryKey: mastraQueryKeys.datasets.details(variables.datasetId) })
      },
    })

  const useDeleteDatasetMutation = () =>
    useMutation({
      mutationFn: (datasetId: string) => mastraClient.deleteDataset(datasetId),
      onSuccess: async () => {
        await queryClient.invalidateQueries({ queryKey: mastraQueryKeys.datasets.all })
      },
    })

  const useAddDatasetItemMutation = () =>
    useMutation({
      mutationFn: (params: AddDatasetItemParams) => mastraClient.addDatasetItem(params),
      onSuccess: async (_, variables) => {
        await queryClient.invalidateQueries({ queryKey: mastraQueryKeys.datasets.items(variables.datasetId) })
      },
    })

  const useUpdateDatasetItemMutation = () =>
    useMutation({
      mutationFn: (params: UpdateDatasetItemParams) => mastraClient.updateDatasetItem(params),
      onSuccess: async (_, variables) => {
        await queryClient.invalidateQueries({ queryKey: mastraQueryKeys.datasets.items(variables.datasetId) })
        await queryClient.invalidateQueries({ queryKey: mastraQueryKeys.datasets.item(variables.datasetId, variables.itemId) })
      },
    })

  const useDeleteDatasetItemMutation = () =>
    useMutation({
      mutationFn: ({ datasetId, itemId }: { datasetId: string; itemId: string }) =>
        mastraClient.deleteDatasetItem(datasetId, itemId),
      onSuccess: async (_, variables) => {
        await queryClient.invalidateQueries({ queryKey: mastraQueryKeys.datasets.items(variables.datasetId) })
      },
    })

  const useBatchInsertDatasetItemsMutation = () =>
    useMutation({
      mutationFn: (params: BatchInsertDatasetItemsParams) =>
        mastraClient.batchInsertDatasetItems(params),
      onSuccess: async (_, variables) => {
        await queryClient.invalidateQueries({ queryKey: mastraQueryKeys.datasets.items(variables.datasetId) })
      },
    })

  const useBatchDeleteDatasetItemsMutation = () =>
    useMutation({
      mutationFn: (params: BatchDeleteDatasetItemsParams) =>
        mastraClient.batchDeleteDatasetItems(params),
      onSuccess: async (_, variables) => {
        await queryClient.invalidateQueries({ queryKey: mastraQueryKeys.datasets.items(variables.datasetId) })
      },
    })

  const useTriggerDatasetExperimentMutation = () =>
    useMutation({
      mutationFn: (params: TriggerDatasetExperimentParams) =>
        mastraClient.triggerDatasetExperiment(params),
      onSuccess: async (_, variables) => {
        await queryClient.invalidateQueries({ queryKey: mastraQueryKeys.datasets.experiments(variables.datasetId) })
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

  const useProcessorExecuteMutation = (processorId: string) =>
    useMutation({
      mutationFn: (params: ExecuteProcessorParams) =>
        mastraClient.getProcessor(processorId).execute(params),
    })

  // Observability Mutations
  const useScoreMutation = () =>
    useMutation({
      mutationFn: (params: {
        scorerName: string
        targets: Array<{ traceId: string; spanId?: string }>
      }) => mastraClient.score(params),
    })

  const useSaveScoreMutation = () =>
    useMutation({
      mutationFn: (params: Parameters<typeof mastraClient.saveScore>[0]) =>
        mastraClient.saveScore(params),
    })

  const useCreateStoredAgentMutation = () =>
    useMutation({
      mutationFn: (params: CreateStoredAgentParams) =>
        mastraClient.createStoredAgent(params),
    })

  const useUpdateStoredAgentMutation = (storedAgentId: string) =>
    useMutation({
      mutationFn: (params: UpdateStoredAgentParams) =>
        mastraClient.getStoredAgent(storedAgentId).update(params),
    })

  const useDeleteStoredAgentMutation = (storedAgentId: string) =>
    useMutation({
      mutationFn: (requestContext?: RequestContext | RequestContextValue) =>
        mastraClient.getStoredAgent(storedAgentId).delete(requestContext as RequestContext),
    })

  const useCreateStoredAgentVersionMutation = (storedAgentId: string) =>
    useMutation({
      mutationFn: (variables: {
        params?: Parameters<ReturnType<typeof mastraClient.getStoredAgent>['createVersion']>[0]
        requestContext?: RequestContext | RequestContextValue
      }) =>
        mastraClient
          .getStoredAgent(storedAgentId)
          .createVersion(variables.params, variables.requestContext as RequestContext),
    })

  const useActivateStoredAgentVersionMutation = (storedAgentId: string) =>
    useMutation({
      mutationFn: (variables: {
        versionId: string
        requestContext?: RequestContext | RequestContextValue
      }) =>
        mastraClient
          .getStoredAgent(storedAgentId)
          .activateVersion(variables.versionId, variables.requestContext as RequestContext),
    })

  const useRestoreStoredAgentVersionMutation = (storedAgentId: string) =>
    useMutation({
      mutationFn: (variables: {
        versionId: string
        requestContext?: RequestContext | RequestContextValue
      }) =>
        mastraClient
          .getStoredAgent(storedAgentId)
          .restoreVersion(variables.versionId, variables.requestContext as RequestContext),
    })

  const useDeleteStoredAgentVersionMutation = (storedAgentId: string) =>
    useMutation({
      mutationFn: (variables: {
        versionId: string
        requestContext?: RequestContext | RequestContextValue
      }) =>
        mastraClient
          .getStoredAgent(storedAgentId)
          .deleteVersion(variables.versionId, variables.requestContext as RequestContext),
    })

  const useCreateStoredPromptBlockMutation = () =>
    useMutation({
      mutationFn: (params: CreateStoredPromptBlockParams) =>
        mastraClient.createStoredPromptBlock(params),
    })

  const useUpdateStoredPromptBlockMutation = (storedPromptBlockId: string) =>
    useMutation({
      mutationFn: (params: UpdateStoredPromptBlockParams) =>
        mastraClient.getStoredPromptBlock(storedPromptBlockId).update(params),
    })

  const useDeleteStoredPromptBlockMutation = (storedPromptBlockId: string) =>
    useMutation({
      mutationFn: (requestContext?: RequestContext | RequestContextValue) =>
        mastraClient
          .getStoredPromptBlock(storedPromptBlockId)
          .delete(requestContext as RequestContext),
    })

  const useCreateStoredPromptBlockVersionMutation = (storedPromptBlockId: string) =>
    useMutation({
      mutationFn: (variables: {
        params?: Parameters<ReturnType<typeof mastraClient.getStoredPromptBlock>['createVersion']>[0]
        requestContext?: RequestContext | RequestContextValue
      }) =>
        mastraClient
          .getStoredPromptBlock(storedPromptBlockId)
          .createVersion(variables.params, variables.requestContext as RequestContext),
    })

  const useActivateStoredPromptBlockVersionMutation = (storedPromptBlockId: string) =>
    useMutation({
      mutationFn: (variables: {
        versionId: string
        requestContext?: RequestContext | RequestContextValue
      }) =>
        mastraClient
          .getStoredPromptBlock(storedPromptBlockId)
          .activateVersion(variables.versionId, variables.requestContext as RequestContext),
    })

  const useRestoreStoredPromptBlockVersionMutation = (storedPromptBlockId: string) =>
    useMutation({
      mutationFn: (variables: {
        versionId: string
        requestContext?: RequestContext | RequestContextValue
      }) =>
        mastraClient
          .getStoredPromptBlock(storedPromptBlockId)
          .restoreVersion(variables.versionId, variables.requestContext as RequestContext),
    })

  const useDeleteStoredPromptBlockVersionMutation = (storedPromptBlockId: string) =>
    useMutation({
      mutationFn: (variables: {
        versionId: string
        requestContext?: RequestContext | RequestContextValue
      }) =>
        mastraClient
          .getStoredPromptBlock(storedPromptBlockId)
          .deleteVersion(variables.versionId, variables.requestContext as RequestContext),
    })

  const useCreateStoredScorerMutation = () =>
    useMutation({
      mutationFn: (params: CreateStoredScorerParams) =>
        mastraClient.createStoredScorer(params),
    })

  const useUpdateStoredScorerMutation = (storedScorerId: string) =>
    useMutation({
      mutationFn: (params: UpdateStoredScorerParams) =>
        mastraClient.getStoredScorer(storedScorerId).update(params),
    })

  const useDeleteStoredScorerMutation = (storedScorerId: string) =>
    useMutation({
      mutationFn: (requestContext?: RequestContext | RequestContextValue) =>
        mastraClient.getStoredScorer(storedScorerId).delete(requestContext as RequestContext),
    })

  const useCreateStoredScorerVersionMutation = (storedScorerId: string) =>
    useMutation({
      mutationFn: (variables: {
        params?: Parameters<ReturnType<typeof mastraClient.getStoredScorer>['createVersion']>[0]
        requestContext?: RequestContext | RequestContextValue
      }) =>
        mastraClient
          .getStoredScorer(storedScorerId)
          .createVersion(variables.params, variables.requestContext as RequestContext),
    })

  const useActivateStoredScorerVersionMutation = (storedScorerId: string) =>
    useMutation({
      mutationFn: (variables: {
        versionId: string
        requestContext?: RequestContext | RequestContextValue
      }) =>
        mastraClient
          .getStoredScorer(storedScorerId)
          .activateVersion(variables.versionId, variables.requestContext as RequestContext),
    })

  const useRestoreStoredScorerVersionMutation = (storedScorerId: string) =>
    useMutation({
      mutationFn: (variables: {
        versionId: string
        requestContext?: RequestContext | RequestContextValue
      }) =>
        mastraClient
          .getStoredScorer(storedScorerId)
          .restoreVersion(variables.versionId, variables.requestContext as RequestContext),
    })

  const useDeleteStoredScorerVersionMutation = (storedScorerId: string) =>
    useMutation({
      mutationFn: (variables: {
        versionId: string
        requestContext?: RequestContext | RequestContextValue
      }) =>
        mastraClient
          .getStoredScorer(storedScorerId)
          .deleteVersion(variables.versionId, variables.requestContext as RequestContext),
    })

  const useCreateStoredMcpClientMutation = () =>
    useMutation({
      mutationFn: (params: CreateStoredMCPClientParams) =>
        mastraClient.createStoredMCPClient(params),
    })

  const useUpdateStoredMcpClientMutation = (storedMcpClientId: string) =>
    useMutation({
      mutationFn: (params: UpdateStoredMCPClientParams) =>
        mastraClient.getStoredMCPClient(storedMcpClientId).update(params),
    })

  const useDeleteStoredMcpClientMutation = (storedMcpClientId: string) =>
    useMutation({
      mutationFn: (requestContext?: RequestContext | RequestContextValue) =>
        mastraClient
          .getStoredMCPClient(storedMcpClientId)
          .delete(requestContext as RequestContext),
    })

  const useCreateStoredSkillMutation = () =>
    useMutation({
      mutationFn: (params: CreateStoredSkillParams) =>
        mastraClient.createStoredSkill(params),
    })

  const useUpdateStoredSkillMutation = (storedSkillId: string) =>
    useMutation({
      mutationFn: (params: UpdateStoredSkillParams) =>
        mastraClient.getStoredSkill(storedSkillId).update(params),
    })

  const useDeleteStoredSkillMutation = (storedSkillId: string) =>
    useMutation({
      mutationFn: (requestContext?: RequestContext | RequestContextValue) =>
        mastraClient.getStoredSkill(storedSkillId).delete(requestContext as RequestContext),
    })

  const useAgentBuilderCreateRunMutation = (actionId: string) =>
    useMutation({
      mutationFn: (
        params?: Parameters<ReturnType<typeof mastraClient.getAgentBuilderAction>['createRun']>[0]
      ) => mastraClient.getAgentBuilderAction(actionId).createRun(params),
    })

  const useAgentBuilderStartAsyncMutation = (actionId: string) =>
    useMutation({
      mutationFn: ({
        params,
        runId,
      }: {
        params: Parameters<ReturnType<typeof mastraClient.getAgentBuilderAction>['startAsync']>[0]
        runId?: string
      }) => mastraClient.getAgentBuilderAction(actionId).startAsync(params, runId),
    })

  const useAgentBuilderStartRunMutation = (actionId: string) =>
    useMutation({
      mutationFn: ({
        params,
        runId,
      }: {
        params: Parameters<ReturnType<typeof mastraClient.getAgentBuilderAction>['startActionRun']>[0]
        runId: string
      }) => mastraClient.getAgentBuilderAction(actionId).startActionRun(params, runId),
    })

  const useAgentBuilderResumeMutation = (actionId: string) =>
    useMutation({
      mutationFn: ({
        params,
        runId,
      }: {
        params: Parameters<ReturnType<typeof mastraClient.getAgentBuilderAction>['resume']>[0]
        runId: string
      }) => mastraClient.getAgentBuilderAction(actionId).resume(params, runId),
    })

  const useAgentBuilderResumeAsyncMutation = (actionId: string) =>
    useMutation({
      mutationFn: ({
        params,
        runId,
      }: {
        params: Parameters<ReturnType<typeof mastraClient.getAgentBuilderAction>['resumeAsync']>[0]
        runId: string
      }) => mastraClient.getAgentBuilderAction(actionId).resumeAsync(params, runId),
    })

  const useAgentBuilderCancelRunMutation = (actionId: string) =>
    useMutation({
      mutationFn: (runId: string) =>
        mastraClient.getAgentBuilderAction(actionId).cancelRun(runId),
    })

  const hooks = {
    // Queries
    useAgents,
    useAgent,
    useAgentModelProviders,
    useAgentSpeakers,
    useAgentListener,
    useToolProviders,
    useToolProvider,
    useToolProviderToolkits,
    useToolProviderTools,
    useToolProviderToolSchema,
    useProcessors,
    useProcessor,
    useProcessorProviders,
    useProcessorProvider,
    useStoredAgents,
    useStoredAgent,
    useStoredAgentVersions,
    useStoredAgentVersion,
    useCompareStoredAgentVersions,
    useStoredPromptBlocks,
    useStoredPromptBlock,
    useStoredPromptBlockVersions,
    useStoredPromptBlockVersion,
    useCompareStoredPromptBlockVersions,
    useStoredScorers,
    useStoredScorer,
    useStoredScorerVersions,
    useStoredScorerVersion,
    useCompareStoredScorerVersions,
    useStoredMcpClients,
    useStoredMcpClient,
    useStoredSkills,
    useStoredSkill,
    useWorkflows,
    useWorkflow,
    useWorkflowRun,
    useWorkflowRuns,
    useWorkflowSchema,
    useScorers,
    useScorer,
    useTools,
    useTool,
    useThreads,
    useThread,
    useThreadMessages,
    useThreadMessagesPaginated,
    useWorkingMemory,
    useMemorySearch,
    useMemoryStatus,
    useMemoryConfig,
    useObservationalMemory,
    useAwaitBufferStatus,
    useScoresByRun,
    useScoresByScorer,
    useScoresByEntity,
    useDatasets,
    useDataset,
    useDatasetItems,
    useDatasetItem,
    useDatasetItemHistory,
    useDatasetItemVersion,
    useDatasetVersions,
    useDatasetExperiments,
    useDatasetExperiment,
    useDatasetExperimentResults,
    useCompareExperiments,
    useTraces,
    useTrace,
    useLogs,
    useRunLogs,
    useLogTransports,
    useVectorIndexes,
    useVectorDetails,
    useVectors,
    useEmbedders,
    useWorkspaces,
    useWorkspace,
    useWorkspaceInfo,
    useWorkspaceFiles,
    useWorkspaceReadFile,
    useWorkspaceStat,
    useWorkspaceSearch,
    useWorkspaceSkills,
    useWorkspaceSearchSkills,
    useWorkspaceSkill,
    useWorkspaceSkillReferences,
    useWorkspaceSkillReference,
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
    useAgentBuilderActions,
    useAgentBuilderAction,
    useAgentBuilderRuns,
    useAgentBuilderRun,
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
    useWorkflowDeleteRunMutation,
    useWorkflowResumeMutation,
    useWorkflowResumeAsyncMutation,
    useWorkflowCancelMutation,
    useWorkflowRestartMutation,
    useWorkflowRestartAsyncMutation,
    useWorkflowTimeTravelMutation,
    useWorkflowTimeTravelAsyncMutation,
    useCreateThreadMutation,
    useDeleteThreadMutation,
    useUpdateMemoryThreadMutation,
    useUpdateWorkingMemoryMutation,
    useSaveMessageToMemoryMutation,
    useDeleteThreadMessagesMutation,
    useCloneThreadMutation,
    useCreateDatasetMutation,
    useUpdateDatasetMutation,
    useDeleteDatasetMutation,
    useAddDatasetItemMutation,
    useUpdateDatasetItemMutation,
    useDeleteDatasetItemMutation,
    useBatchInsertDatasetItemsMutation,
    useBatchDeleteDatasetItemsMutation,
    useTriggerDatasetExperimentMutation,
    useVectorQueryMutation,
    useVectorUpsertMutation,
    useProcessorExecuteMutation,
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
    useA2ASendStreamingMessageMutation,
    useA2ACancelTaskMutation,
    useScoreMutation,
    useSaveScoreMutation,
    useCreateStoredAgentMutation,
    useUpdateStoredAgentMutation,
    useDeleteStoredAgentMutation,
    useCreateStoredAgentVersionMutation,
    useActivateStoredAgentVersionMutation,
    useRestoreStoredAgentVersionMutation,
    useDeleteStoredAgentVersionMutation,
    useCreateStoredPromptBlockMutation,
    useUpdateStoredPromptBlockMutation,
    useDeleteStoredPromptBlockMutation,
    useCreateStoredPromptBlockVersionMutation,
    useActivateStoredPromptBlockVersionMutation,
    useRestoreStoredPromptBlockVersionMutation,
    useDeleteStoredPromptBlockVersionMutation,
    useCreateStoredScorerMutation,
    useUpdateStoredScorerMutation,
    useDeleteStoredScorerMutation,
    useCreateStoredScorerVersionMutation,
    useActivateStoredScorerVersionMutation,
    useRestoreStoredScorerVersionMutation,
    useDeleteStoredScorerVersionMutation,
    useCreateStoredMcpClientMutation,
    useUpdateStoredMcpClientMutation,
    useDeleteStoredMcpClientMutation,
    useCreateStoredSkillMutation,
    useUpdateStoredSkillMutation,
    useDeleteStoredSkillMutation,
    useAgentBuilderCreateRunMutation,
    useAgentBuilderStartAsyncMutation,
    useAgentBuilderStartRunMutation,
    useAgentBuilderResumeMutation,
    useAgentBuilderResumeAsyncMutation,
    useAgentBuilderCancelRunMutation,
  }

  return hooks as MastraQueryHooks
}
