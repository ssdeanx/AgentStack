import { z } from 'zod'
import type {
    GetAgentResponse,
    GetToolResponse,
    GetWorkflowResponse,
    GetScorerResponse,
    GetObservationalMemoryResponse,
    GetMemoryConfigResponseExtended,
    GetProcessorDetailResponse,
    GetProcessorProviderResponse,
    GetProcessorResponse,
    GetScorersResponse,
    GetSkillReferenceResponse,
    GetWorkflowRunByIdResponse,
    GetToolProviderToolSchemaResponse,
    GetVectorIndexResponse,
    GetVNextNetworkResponse,
    StoredAgentResponse,
    ListMemoryThreadsResponse,
    ListMemoryThreadMessagesResponse,
    GetMemoryStatusResponse,
    GetLogsResponse,
    WorkspaceItem,
    Provider,
    ListStoredAgentsResponse,
    GetMemoryConfigResponse,
    ListAgentsModelProvidersResponse,
    GetSystemPackagesResponse,
    MastraClientError,
    DatasetRecord,
    DatasetItem,
    DatasetExperiment,
    DatasetExperimentResult,
    CompareExperimentsResponse,
    ListToolProvidersResponse,
    GetProcessorProvidersResponse,
    DatasetItemVersionResponse,
    DatasetVersionResponse,
    DeleteAgentVersionResponse,
    DeleteScorerVersionResponse,
    DeleteStoredAgentResponse,
    DefaultOptions,
    DeleteStoredMCPClientResponse,
    DeleteStoredScorerResponse,
    DeleteStoredSkillResponse,
    ActivateAgentVersionResponse,
    ActivateScorerVersionResponse,
    AgentVersionResponse,
    AwaitBufferStatusResponse,
    CloneMemoryThreadResponse,
    SaveMessageToMemoryResponse,
    SaveScoreResponse,
    SearchSkillsResponse,
    StoredScorerResponse,
    MemorySearchResponse,
    McpServerListResponse,
    MemorySearchResult,
    McpServerToolListResponse
} from '@mastra/client-js'
import type { TraceRecord, ListTracesResponse,
    TraceStatus, TraceEntry, traceSpanSchema, TraceSpan
 } from '@mastra/core/storage'
import type { BaseLogMessage } from '@mastra/core/logger'





// --- CORE TYPES ---

/**
 * Model configuration representation
 */
export const ModelSchema = z.object({
    provider: z.string(),
    name: z.string(),
})
export type Model = z.infer<typeof ModelSchema>

/**
 * RequestContext-like structure for the frontend
 * Use `unknown` instead of `any` to force explicit narrowing at call sites.
 */
export type RequestContextValue = Record<string, unknown>

// --- RE-EXPORTED SDK TYPES ---

// Direct re-exports to maintain absolute SDK parity
export type {
    GetAgentResponse,
    GetToolResponse,
    GetWorkflowResponse,
    StoredAgentResponse,
    ListMemoryThreadsResponse,
    ListMemoryThreadMessagesResponse,
    GetMemoryStatusResponse,
    GetLogsResponse,
    WorkspaceItem,
    Provider,
    ListStoredAgentsResponse,
    GetMemoryConfigResponse,
    ListAgentsModelProvidersResponse,
    GetSystemPackagesResponse,
    MastraClientError,
    DatasetRecord,
    DatasetItem,
    DatasetExperiment,
    DatasetExperimentResult,
    CompareExperimentsResponse,
    ListToolProvidersResponse,
    GetProcessorProvidersResponse,
    BaseLogMessage,
    TraceRecord,
    ListTracesResponse,
}

// Convenience Aliases for the app
export interface Agent {
    id: string;
    name: string;
    description?: string;
    instructions?: any; // SystemMessage
    tools?: Record<string, any>; // GetToolResponse
    workflows?: Record<string, any>; // GetWorkflowResponse
    agents?: Record<string, { id: string; name: string }>;
    skills?: any[]; // SkillMetadata[]
    workspaceTools?: string[];
    workspaceId?: string;
    provider?: string;
    modelId?: string;
    modelVersion?: string;
    modelList?: Array<{
        id: string;
        enabled: boolean;
        maxRetries: number;
        model: {
            modelId: string;
            provider: string;
            modelVersion: string;
        };
    }>;
    inputProcessors?: Array<{ id: string; name: string }>;
    outputProcessors?: Array<{ id: string; name: string }>;
    defaultOptions?: any;
    defaultGenerateOptionsLegacy?: any;
    defaultStreamOptionsLegacy?: any;
    requestContextSchema?: string;
    source?: "code" | "stored";
    status?: "draft" | "published" | "archived";
    activeVersionId?: string;
    hasDraft?: boolean;
}
export type Tool = GetToolResponse
export type Workflow = GetWorkflowResponse
export type StoredAgent = StoredAgentResponse
export type MemoryThread = ListMemoryThreadsResponse['threads'][number]
export type Message = ListMemoryThreadMessagesResponse['messages'][number]
export type MemoryStatus = GetMemoryStatusResponse
export type LogEntry = BaseLogMessage
export type ModelProvider = Provider
export type TracesResponse = ListTracesResponse
export type Trace = ListTracesResponse['spans'][number]

// --- CHAT DATA STRUCTURES (as per README requirements) ---

export interface AgentExecutionData {
    text: string
    usage: unknown
    toolResults: unknown[]
}

export interface WorkflowStepData {
    status: string
    input: unknown
    output: unknown
    suspendPayload: unknown
}

export interface WorkflowExecutionData {
    name: string
    status: string
    steps: Record<string, WorkflowStepData>
    output: unknown
}

export interface NetworkStep {
    name: string
    status: string
    input: unknown
    output: unknown
}

export interface NetworkUsage {
    inputTokens: number
    outputTokens: number
    totalTokens: number
}

export interface NetworkExecutionData {
    name: string
    status: string
    steps: NetworkStep[]
    usage: NetworkUsage
    output: unknown
}

// --- ZOD SCHEMAS FOR VALIDATION (Subset of SDK types used in UI logic) ---

export const AgentSchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().optional(),
    modelId: z.string().optional(),
})

export const StoredAgentSchema = z.object({
    id: z.string(),
    name: z.string(),
    createdAt: z.string(),
    updatedAt: z.string(),
})

// --- CUSTOM EXTENSIONS ---

export interface VectorIndex {
    dimension: number
    metric: 'cosine' | 'euclidean' | 'dotproduct'
    count: number
    name: string
}

export type AISpanType =
    | 'agent'
    | 'workflow'
    | 'tool'
    | 'llm'
    | 'embedding'
    | 'retrieval'
    | 'reranking'
