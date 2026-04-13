'use client'

import { useMutation, useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query'

export type HarnessSerializedMessageContent =
    | { type: 'text'; text: string }
    | { type: 'thinking'; thinking: string }
    | { type: 'tool_call'; id: string; name: string; args: unknown }
    | { type: 'tool_result'; id: string; name: string; result: unknown; isError: boolean }
    | { type: 'image'; data: string; mimeType: string }
    | { type: 'file'; data: string; mediaType: string; filename?: string }
    | {
          type: 'om_observation_start'
          tokensToObserve: number
          operationType?: 'observation' | 'reflection'
      }
    | {
          type: 'om_observation_end'
          tokensObserved: number
          observationTokens: number
          durationMs: number
          operationType?: 'observation' | 'reflection'
          observations?: string
          currentTask?: string
          suggestedResponse?: string
      }
    | {
          type: 'om_observation_failed'
          error: string
          tokensAttempted?: number
          operationType?: 'observation' | 'reflection'
      }
    | {
          type: 'om_thread_title_updated'
          threadId: string
          oldTitle?: string
          newTitle: string
      }

export interface HarnessSerializedThread {
    id: string
    resourceId: string
    title?: string
    createdAt: string
    updatedAt: string
    tokenUsage?: {
        promptTokens: number
        completionTokens: number
        totalTokens: number
    }
    metadata?: Record<string, unknown>
}

export interface HarnessSerializedMode {
    id: string
    name?: string
    default?: boolean
    defaultModelId?: string
    color?: string
}

export interface HarnessSerializedMessage {
    id: string
    role: 'user' | 'assistant' | 'system'
    content: HarnessSerializedMessageContent[]
    createdAt: string
    stopReason?: 'complete' | 'tool_use' | 'aborted' | 'error'
    errorMessage?: string
}

export interface HarnessDashboardResponse {
    resourceId: string
    session: {
        currentThreadId: string | null
        currentModeId: string
        threads: HarnessSerializedThread[]
    }
    activeThreadId: string | null
    activeThread: HarnessSerializedThread | null
    modes: HarnessSerializedMode[]
    state: Record<string, unknown>
    displayState: {
        isRunning: boolean
        currentMessage: HarnessSerializedMessage | null
        tokenUsage: {
            promptTokens: number
            completionTokens: number
            totalTokens: number
        }
        activeTools: Array<{
            id: string
            name: string
            args: unknown
            status: 'streaming_input' | 'running' | 'completed' | 'error'
            partialResult?: string
            result?: unknown
            isError?: boolean
            shellOutput?: string
        }>
        toolInputBuffers: Array<{
            id: string
            text: string
            toolName: string
        }>
        pendingApproval: {
            toolCallId: string
            toolName: string
            args: unknown
        } | null
        pendingSuspension: {
            toolCallId: string
            toolName: string
            args: unknown
            suspendPayload: unknown
            resumeSchema?: string
        } | null
        pendingQuestion: {
            questionId: string
            question: string
            options?: Array<{
                label: string
                description?: string
            }>
        } | null
        pendingPlanApproval: {
            planId: string
            title?: string
            plan: string
        } | null
        activeSubagents: Array<{
            id: string
            agentType: string
            task: string
            modelId?: string
            toolCalls: Array<{
                name: string
                isError: boolean
            }>
            textDelta: string
            status: 'running' | 'completed' | 'error'
            durationMs?: number
            result?: string
        }>
        omProgress: {
            status: 'idle' | 'observing' | 'reflecting'
            pendingTokens: number
            threshold: number
            thresholdPercent: number
            observationTokens: number
            reflectionThreshold: number
            reflectionThresholdPercent: number
            buffered: {
                observations: {
                    status: 'idle' | 'running' | 'complete'
                    chunks: number
                    messageTokens: number
                    projectedMessageRemoval: number
                    observationTokens: number
                }
                reflection: {
                    status: 'idle' | 'running' | 'complete'
                    inputObservationTokens: number
                    observationTokens: number
                }
            }
            generationCount: number
            stepNumber: number
            cycleId?: string
            startTime?: number
            preReflectionTokens: number
        }
        bufferingMessages: boolean
        bufferingObservations: boolean
        modifiedFiles: Array<{
            path: string
            operations: string[]
            firstModified: string
        }>
        tasks: Array<{
            content: string
            status: 'pending' | 'in_progress' | 'completed'
            activeForm: string
        }>
        previousTasks: Array<{
            content: string
            status: 'pending' | 'in_progress' | 'completed'
            activeForm: string
        }>
    }
    messages: HarnessSerializedMessage[]
    currentModel: {
        id: string
        fullId: string
        name: string
        hasModelSelected: boolean
        authStatus: {
            hasAuth: boolean
            apiKeyEnvVar?: string
        }
    }
    workspace: {
        hasWorkspace: boolean
        ready: boolean
        repoRoot: string
        files: Array<{
            path: string
            name: string
            content: string
            size: number
        }>
        packageInfo: {
            name: string
            version: string
            description?: string
            dependencies: Array<{
                name: string
                version: string
            }>
        }
        git: {
            branch: string
            hash: string
            message: string
            author: string
            timestamp: string
            files: Array<{
                path: string
                status: 'modified' | 'added' | 'deleted' | 'renamed' | 'untracked'
            }>
        }
        env: Array<{
            name: string
            value: string
        }>
        terminalOutput: string
        previewUrl: string
    }
    permissions: {
        grants: {
            categories: string[]
            tools: string[]
        }
        rules: Record<string, unknown>
    }
}

export type HarnessDashboardQueryParams = {
    limit?: number
}

export type HarnessActionRequest =
    | {
          action: 'sendMessage'
          content: string
          files?: Array<{
              data: string
              mediaType: string
              filename?: string
          }>
      }
    | {
          action: 'createThread'
          title?: string
      }
    | {
          action: 'switchThread'
          threadId: string
      }
    | {
          action: 'switchMode'
          modeId: string
      }
    | {
          action: 'renameThread'
          title: string
      }
    | {
          action: 'cloneThread'
          sourceThreadId?: string
          title?: string
          resourceId?: string
      }
    | {
          action: 'setState'
          updates: Record<string, unknown>
      }
    | {
          action: 'steer'
          content: string
      }
    | {
          action: 'followUp'
          content: string
      }
    | {
          action: 'abort'
      }
    | {
          action: 'setResourceId'
          resourceId: string
      }
    | {
          action: 'respondToQuestion'
          questionId: string
          answer: string
      }
    | {
          action: 'respondToPlanApproval'
          planId: string
          response: {
              action: 'approved' | 'rejected'
              feedback?: string
          }
      }
    | {
          action: 'respondToToolApproval'
          decision: 'approve' | 'decline' | 'always_allow_category'
      }

export const harnessQueryKeys = {
    all: ['harness'] as const,
    dashboard: (params?: HarnessDashboardQueryParams) =>
        [...harnessQueryKeys.all, 'dashboard', params ?? {}] as const,
}

/**
 * Fetch a JSON payload from the harness API route.
 */
async function fetchHarnessJson<T>(
    url: string,
    init?: Parameters<typeof fetch>[1]
): Promise<T> {
    const headers = new Headers(init?.headers)
    headers.set('Content-Type', 'application/json')

    const response = await fetch(url, {
        ...init,
        headers,
    })

    const payload: unknown = await response.json().catch(() => null)
    if (!response.ok) {
        const message =
            payload && typeof payload === 'object' && 'error' in payload
                ? String((payload as { error?: unknown }).error ?? 'Request failed')
                : 'Request failed'
        throw new Error(message)
    }

    return payload as T
}

/**
 * Load the current harness dashboard state.
 */
export function useHarnessDashboardQuery(
    params: HarnessDashboardQueryParams = {}
): UseQueryResult<HarnessDashboardResponse> {
    const limit = params.limit ?? 50

    return useQuery<HarnessDashboardResponse>({
        queryKey: harnessQueryKeys.dashboard({ limit }),
        queryFn: async () =>
            fetchHarnessJson<HarnessDashboardResponse>(`/api/chat/harness?limit=${limit}`),
        refetchInterval: 1500,
        refetchIntervalInBackground: true,
    })
}

/**
 * Execute a harness action and refresh the cached dashboard state.
 */
export function useHarnessActionMutation(params: HarnessDashboardQueryParams = {}) {
    const queryClient = useQueryClient()
    const queryKey = harnessQueryKeys.dashboard({ limit: params.limit ?? 50 })

    return useMutation({
        mutationFn: async (action: HarnessActionRequest) =>
            fetchHarnessJson<HarnessDashboardResponse>('/api/chat/harness', {
                method: 'POST',
                body: JSON.stringify(action),
            }),
        onSuccess: async (dashboard) => {
            queryClient.setQueryData(queryKey, dashboard)
            await queryClient.invalidateQueries({ queryKey: harnessQueryKeys.all })
        },
    })
}
