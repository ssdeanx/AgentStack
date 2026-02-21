'use server'

import { MastraClient } from '@mastra/client-js'

const mastraClient = new MastraClient({
    baseUrl: process.env.NEXT_PUBLIC_MASTRA_API_URL || 'http://localhost:4111',
})

export interface SidebarAgent {
    id: string
    name: string
    description?: string
    model?: string
}

export interface SidebarTool {
    id: string
    name: string
    description?: string
}

export interface SidebarWorkflow {
    id: string
    name: string
    description?: string
    status?: string
}

export interface SidebarTrace {
    id: string
    name: string
    timestamp: string
    status?: string
    duration?: number
}

export interface SidebarThread {
    id: string
    title?: string
    resourceId?: string
    createdAt?: string
}

export interface SidebarVectorIndex {
    name: string
    dimension?: number
    count?: number
}

export interface SidebarLogEntry {
    message: string
    level: string
    timestamp: string
    [key: string]: unknown
}

export interface SidebarMemoryStatus {
    result: boolean
    provider?: string
    threadCount?: number
    observationalMemory?: {
        enabled: boolean
        hasRecord?: boolean
    }
}

export async function fetchAgents(): Promise<SidebarAgent[]> {
    try {
        const agents = await mastraClient.listAgents()
        return Object.entries(agents).map(([id, agent]) => {
            const rec = agent as unknown as Record<string, unknown>
            let model: string | undefined
            if (typeof rec.modelId === 'string') model = rec.modelId
            else if (typeof rec.model === 'string') model = rec.model
            else if (
                typeof rec.model === 'object' &&
                rec.model !== null &&
                typeof (rec.model as Record<string, unknown>).name === 'string'
            )
                model = (rec.model as Record<string, unknown>).name as string
            return {
                id,
                name: (rec.name as string) ?? id,
                description: rec.description as string | undefined,
                model,
            }
        })
    } catch (error) {
        console.error('fetchAgents error:', error)
        return []
    }
}

export async function fetchTools(): Promise<SidebarTool[]> {
    try {
        const tools = await mastraClient.listTools()
        return Object.entries(tools).map(([id, tool]) => ({
            id,
            name: tool.id ?? id,
            description: tool.description,
        }))
    } catch (error) {
        console.error('fetchTools error:', error)
        return []
    }
}

export async function fetchWorkflows(): Promise<SidebarWorkflow[]> {
    try {
        const workflows = await mastraClient.listWorkflows()
        return Object.entries(workflows).map(([id, wf]) => ({
            id,
            name: wf.name ?? id,
            description: wf.description,
        }))
    } catch (error) {
        console.error('fetchWorkflows error:', error)
        return []
    }
}

export async function fetchTraces(limit = 20): Promise<SidebarTrace[]> {
    try {
        const result = await mastraClient.getTraces({
            pagination: {
                page: 1,
                perPage: limit,
            },
        })
        return result.spans.map((span) => ({
            id: span.traceId ?? span.id ?? '',
            name: span.name ?? 'unnamed',
            timestamp: span.startTime ? String(span.startTime) : new Date().toISOString(),
            status: span.statusCode as string | undefined,
            duration: typeof span.duration === 'number' ? span.duration : undefined,
        }))
    } catch (error) {
        console.error('fetchTraces error:', error)
        return []
    }
}

export async function fetchThreads(
    resourceId?: string
): Promise<SidebarThread[]> {
    try {
        const result = await mastraClient.listMemoryThreads(
            resourceId ? { resourceId } : undefined
        )
        return result.threads.map((t) => ({
            id: t.id ?? '',
            title: t.title ?? undefined,
            resourceId: t.resourceId ?? undefined,
            createdAt: t.createdAt ? String(t.createdAt) : undefined,
        }))
    } catch (error) {
        console.error('fetchThreads error:', error)
        return []
    }
}

export async function fetchVectors(
    vectorName = 'pgVector'
): Promise<SidebarVectorIndex[]> {
    try {
        const vector = mastraClient.getVector(vectorName)
        const result = await vector.getIndexes()
        const rec = result as unknown as Record<string, unknown>
        const indexes: unknown[] = Array.isArray(result)
            ? result
            : ((rec.indexes as unknown[]) ?? [])
        return indexes.map((idx) => {
            const entry = idx as Record<string, unknown>
            return {
                name:
                    (entry.name as string) ??
                    (entry.indexName as string) ??
                    'default',
                dimension: entry.dimension as number | undefined,
                count: (entry.count as number) ??
                    (entry.vectorCount as number) ??
                    undefined,
            }
        })
    } catch (error) {
        console.error('fetchVectors error:', error)
        return []
    }
}

export async function fetchLogs(
    transportId?: string
): Promise<SidebarLogEntry[]> {
    try {
        const logs = await mastraClient.listLogs({
            transportId: 'MastraLogger',
        })
        if (!Array.isArray(logs)) {
            const rec = logs as Record<string, unknown>
            const arr = (rec.logs ?? rec.data ?? []) as unknown[]
            return arr.map((l) => {
                const entry = l as Record<string, unknown>
                return {
                    message: (entry.message as string) ?? '',
                    level: (entry.level as string) ?? 'info',
                    timestamp:
                        (entry.timestamp as string) ??
                        new Date().toISOString(),
                }
            })
        }
        return logs.map((l) => {
            const entry = l as Record<string, unknown>
            return {
                message: (entry.message as string) ?? '',
                level: (entry.level as string) ?? 'info',
                timestamp:
                    (entry.timestamp as string) ?? new Date().toISOString(),
            }
        })
    } catch (error) {
        console.error('fetchLogs error:', error)
        return []
    }
}

export async function fetchLogTransports(): Promise<string[]> {
    try {
        const transports = await mastraClient.listLogTransports()
        if (Array.isArray(transports)) return transports as string[]
        const rec = transports as Record<string, unknown>
        return (rec.transports ?? []) as string[]
    } catch (error) {
        console.error('fetchLogTransports error:', error)
        return []
    }
}

export async function fetchMemoryStatus(
    agentId: string
): Promise<SidebarMemoryStatus | null> {
    try {
        const status = await mastraClient.getMemoryStatus(agentId)
        return {
            result: status.result,
            observationalMemory: status.observationalMemory
                ? {
                    enabled: status.observationalMemory.enabled,
                    hasRecord: status.observationalMemory.hasRecord,
                }
                : undefined,
        }
    } catch (error) {
        console.error('fetchMemoryStatus error:', error)
        return null
    }
}
