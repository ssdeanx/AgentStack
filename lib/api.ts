import { mastraClient } from "./mastra-client"
import type {
  Agent,
  Workflow,
  Tool,
  TracesResponse,
  MemoryThread,
} from "./types/mastra-api"

export interface ApiHealth {
  ok: boolean
  checks: {
    agents?: { ok: boolean; error?: string }
    tools?: { ok: boolean; error?: string }
    workflows?: { ok: boolean; error?: string }
    memory?: { ok: boolean; error?: string }
    logs?: { ok: boolean; error?: string }
  }
}

function normalizeError(err: unknown): string {
  if (!err) {return "unknown error"}
  try {
    if (err instanceof Error) {return err.message}
    if (typeof err === "string") {return err}
    return JSON.stringify(err)
  } catch (e) {
    return String(err)
  }
}

function buildQueryString(params: Record<string, unknown> = {}) {
  const qs = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null) {return}
    if (typeof v === "object") {qs.set(k, JSON.stringify(v))}
    else {qs.set(k, String(v))}
  })
  const s = qs.toString()
  return s ? `?${s}` : ""
}

export async function listAgentsTyped(opts?: {
  page?: number
  perPage?: number
  orderBy?: { field: string; direction?: "ASC" | "DESC" }
}): Promise<Record<string, Agent> | { agents: Record<string, Agent>; pagination?: unknown }> {
  const base = process.env.NEXT_PUBLIC_MASTRA_API_URL ?? "http://localhost:4111"
  const qs = buildQueryString({ page: opts?.page, perPage: opts?.perPage, orderBy: opts?.orderBy })
  try {
    const res = await fetch(`${base.replace(/\/$/, "")}/api/agents${qs}`, {
      credentials: "include",
      headers: { Accept: "application/json" },
    })
    if (!res.ok) {
      throw new Error(`Status ${res.status}`)
    }

    const data = await res.json()
    // Some servers return { agents: { id: {...} } } or a raw record
    if (data && typeof data === "object" && data !== null && Object.prototype.hasOwnProperty.call(data, "agents")) {
      return data as { agents: Record<string, Agent>; pagination?: unknown }
    }

    return data as Record<string, Agent>
  } catch (err) {
    // Fallback to SDK
    try {
      const sdk = await mastraClient.listAgents()
      return sdk as Record<string, Agent>
    } catch (fallbackErr) {
      throw new Error("listAgents failed: " + normalizeError(err ?? fallbackErr))
    }
  }
}


export async function getMcpServersTyped(): Promise<Record<string, unknown>> {
  // Use the configured base URL to call the server routes directly
  const base = process.env.NEXT_PUBLIC_MASTRA_API_URL ?? "http://localhost:4111"
  try {
    const res = await fetch(`${base.replace(/\/$/, "")}/api/mcp/servers`, {
      credentials: "include",
      headers: { "Accept": "application/json" },
    })
    if (!res.ok) {
      throw new Error(`Status ${res.status}`)
    }
    return (await res.json()) as Record<string, unknown>
  } catch (err) {
    throw new Error("getMcpServers failed: " + normalizeError(err))
  }
}

export async function getMcpServerToolsTyped(serverId: string): Promise<Record<string, unknown>> {
  const base = process.env.NEXT_PUBLIC_MASTRA_API_URL ?? "http://localhost:4111"
  try {
    const res = await fetch(`${base.replace(/\/$/, "")}/api/mcp/servers/${encodeURIComponent(serverId)}/tools`, {
      credentials: "include",
      headers: { "Accept": "application/json" },
    })
    if (!res.ok) {
      throw new Error(`Status ${res.status}`)
    }
    const data = await res.json()
    return data as Record<string, unknown>
  } catch (err) {
    // Fallback: return empty object
    return {}
  }
}

// Agents - generate and execute tool wrappers
export async function agentGenerateTyped(agentId: string, body: Record<string, unknown>) {
  const base = process.env.NEXT_PUBLIC_MASTRA_API_URL ?? "http://localhost:4111"
  try {
    const res = await fetch(`${base.replace(/\/$/, "")}/api/agents/${encodeURIComponent(agentId)}/generate`, {
      method: "POST",
      credentials: "include",
      headers: { "Accept": "application/json", "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
    if (!res.ok) {throw new Error(`Status ${res.status}`)}
    return await res.json()
  } catch (err) {
    // fallback to SDK
    try {
      const agent = mastraClient.getAgent(agentId)
      return await agent.generate(body as any)
    } catch (fallbackErr) {
      throw new Error("agentGenerate failed: " + normalizeError(err ?? fallbackErr))
    }
  }
}

export async function agentExecuteToolTyped(agentId: string, toolId: string, data: Record<string, unknown>, opts?: { threadId?: string; resourceId?: string; runId?: string }) {
  const base = process.env.NEXT_PUBLIC_MASTRA_API_URL ?? "http://localhost:4111"
  try {
    const res = await fetch(`${base.replace(/\/$/, "")}/api/agents/${encodeURIComponent(agentId)}/tools/${encodeURIComponent(toolId)}/execute`, {
      method: "POST",
      credentials: "include",
      headers: { "Accept": "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({ data, ...opts }),
    })
    if (!res.ok) { throw new Error(`Status ${res.status}`) }
    return await res.json()
  } catch (err) {
    // fallback to SDK
    try {
      const agent = mastraClient.getAgent(agentId)
      return await agent.executeTool(toolId, { data, ...opts } as any)
    } catch (fallbackErr) {
      throw new Error("agentExecuteTool failed: " + normalizeError(err ?? fallbackErr))
    }
  }
}

// Memory wrappers
export async function createMemoryThreadTyped(params: { title: string; resourceId: string; agentId: string; metadata?: Record<string, unknown> }) {
  try {
    return await mastraClient.createMemoryThread(params)
  } catch (err) {
    // fallback to HTTP
    const base = process.env.NEXT_PUBLIC_MASTRA_API_URL ?? "http://localhost:4111"
    const res = await fetch(`${base.replace(/\/$/, "")}/api/memory/threads`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(params),
    })
    if (!res.ok) {throw new Error(`Status ${res.status}`)}
    return await res.json()
  }
}

export async function deleteMemoryThreadTyped(threadId: string) {
  const base = process.env.NEXT_PUBLIC_MASTRA_API_URL ?? "http://localhost:4111"
  const res = await fetch(`${base.replace(/\/$/, "")}/api/memory/threads/${encodeURIComponent(threadId)}`, {
    method: "DELETE",
    credentials: "include",
  })
  if (!res.ok) {throw new Error(`Status ${res.status}`)}
  return await res.json()
}

export async function saveMessagesToMemoryTyped(messages: unknown[], agentId?: string) {
  try {
    // mastraClient expects a specific message type; construct payload and call SDK
    const payload: Record<string, unknown> = { messages: messages as any }
    if (agentId !== undefined && agentId !== null && agentId !== "") { payload.agentId = agentId }
    return await mastraClient.saveMessageToMemory(payload as any)
  } catch (err) {
    const base = process.env.NEXT_PUBLIC_MASTRA_API_URL ?? "http://localhost:4111"
    const res = await fetch(`${base.replace(/\/$/, "")}/api/memory/threads/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ messages, agentId }),
    })
    if (!res.ok) {throw new Error(`Status ${res.status}`)}
    return await res.json()
  }
}

export async function getWorkingMemoryTyped(agentId: string, threadId: string, resourceId?: string) {
  try {
    return await mastraClient.getWorkingMemory({ agentId, threadId, resourceId })
  } catch (err) {
    const base = process.env.NEXT_PUBLIC_MASTRA_API_URL ?? "http://localhost:4111"
    const qs = buildQueryString({ agentId, threadId, resourceId })
    const res = await fetch(`${base.replace(/\/$/, "")}/api/memory/working${qs}`, { credentials: "include", headers: { Accept: "application/json" } })
    if (!res.ok) {throw new Error(`Status ${res.status}`)}
    return await res.json()
  }
}

export async function updateWorkingMemoryTyped(params: { agentId: string; threadId: string; workingMemory: string; resourceId?: string }) {
  try {
    return await mastraClient.updateWorkingMemory(params)
  } catch (err) {
    const base = process.env.NEXT_PUBLIC_MASTRA_API_URL ?? "http://localhost:4111"
    const res = await fetch(`${base.replace(/\/$/, "")}/api/memory/working`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(params),
    })
    if (!res.ok) {throw new Error(`Status ${res.status}`)}
    return await res.json()
  }
}

export async function listToolsTyped(opts?: { page?: number; perPage?: number }): Promise<Record<string, Tool> | { tools: Record<string, Tool>; pagination?: unknown }> {
  const base = process.env.NEXT_PUBLIC_MASTRA_API_URL ?? "http://localhost:4111"
  try {
    const qs = buildQueryString({ page: opts?.page, perPage: opts?.perPage })
    const res = await fetch(`${base.replace(/\/$/, "")}/api/tools${qs}`, {
      credentials: "include",
      headers: { Accept: "application/json" },
    })
    if (!res.ok) {
      throw new Error(`Status ${res.status}`)
    }
    const data = await res.json()
    if (data && typeof data === "object" && data !== null && Object.prototype.hasOwnProperty.call(data, "tools")) {
      return data as { tools: Record<string, Tool>; pagination?: unknown }
    }
    return data as unknown as Record<string, Tool>
  } catch (err) {
    // Fallback to SDK
    try {
      const sdk = await mastraClient.listTools()
      return sdk as unknown as Record<string, Tool>
    } catch (fallbackErr) {
      throw new Error("listTools failed: " + normalizeError(err ?? fallbackErr))
    }
  }
}

export async function getToolDetailsTyped(toolId: string): Promise<Tool> {
  try {
    const tool = mastraClient.getTool(toolId)
    const details = await tool.details()
    return details as unknown as Tool
  } catch (err) {
    throw new Error("getToolDetails failed: " + normalizeError(err))
  }
}

export async function listWorkflowsTyped(opts?: { page?: number; perPage?: number }): Promise<Record<string, Workflow> | { workflows: Record<string, Workflow>; pagination?: unknown }> {
  const base = process.env.NEXT_PUBLIC_MASTRA_API_URL ?? "http://localhost:4111"
  try {
    const qs = buildQueryString({ page: opts?.page, perPage: opts?.perPage })
    const res = await fetch(`${base.replace(/\/$/, "")}/api/workflows${qs}`, {
      credentials: "include",
      headers: { Accept: "application/json" },
    })
    if (!res.ok) {throw new Error(`Status ${res.status}`)}
    const data = await res.json()
    if (data && typeof data === "object" && data !== null && Object.prototype.hasOwnProperty.call(data, "workflows")) {
      return data as { workflows: Record<string, Workflow>; pagination?: unknown }
    }
    return data as unknown as Record<string, Workflow>
  } catch (err) {
    try {
      const sdk = await mastraClient.listWorkflows()
      return sdk as unknown as Record<string, Workflow>
    } catch (fallbackErr) {
      throw new Error("listWorkflows failed: " + normalizeError(err ?? fallbackErr))
    }
  }
}

export async function getTracesTyped(params?: { page?: number; perPage?: number; filters?: Record<string, unknown>; dateRange?: { start?: Date; end?: Date } }): Promise<TracesResponse> {
  // Prefer SDK which has typed API
  try {
    const sdkRes = await mastraClient.getTraces({
      pagination: {
        page: params?.page ?? 1,
        perPage: params?.perPage ?? 20,
        dateRange: params?.dateRange,
      },
      filters: params?.filters as unknown as Record<string, unknown>,
    })
    return sdkRes as unknown as TracesResponse
  } catch (err) {
    // Fallback to fetch
    const base = process.env.NEXT_PUBLIC_MASTRA_API_URL ?? "http://localhost:4111"
    try {
      const qs = buildQueryString({ page: params?.page, perPage: params?.perPage, filters: params?.filters, dateRange: params?.dateRange })
      const res = await fetch(`${base.replace(/\/$/, "")}/api/telemetry/traces${qs}`, { credentials: "include", headers: { Accept: "application/json" } })
      if (!res.ok) {throw new Error(`Status ${res.status}`)}
      const data = await res.json()
      return data as unknown as TracesResponse
    } catch (fallbackErr) {
      throw new Error("getTraces failed: " + normalizeError(err ?? fallbackErr))
    }
  }
}

export async function listMemoryThreadsTyped(resourceId?: string, agentId?: string, opts?: { page?: number; perPage?: number }): Promise<MemoryThread[]> {
  try {
    const qs = buildQueryString({ page: opts?.page, perPage: opts?.perPage, resourceId, agentId })
    const base = process.env.NEXT_PUBLIC_MASTRA_API_URL ?? "http://localhost:4111"
    const res = await fetch(`${base.replace(/\/$/, "")}/api/memory/threads${qs}`, { credentials: "include", headers: { Accept: "application/json" } })
    if (!res.ok) {throw new Error(`Status ${res.status}`)}
    const data = await res.json()
    if (Array.isArray(data)) {return data as MemoryThread[]}
    if (Array.isArray(data.threads)) {return data.threads as MemoryThread[]}
    // Fallback to client SDK
    const sdkRes = await mastraClient.listMemoryThreads({ resourceId: resourceId ?? "", agentId: agentId ?? "" })
    return Array.isArray(sdkRes) ? (sdkRes as MemoryThread[]) : []
  } catch (err) {
    throw new Error("listMemoryThreads failed: " + normalizeError(err))
  }
}

export async function getThreadMessagesTyped(threadId: string, opts?: { page?: number; perPage?: number }) {
  try {
    const qs = buildQueryString({ page: opts?.page ?? 1, perPage: opts?.perPage ?? 50 })
    const base = process.env.NEXT_PUBLIC_MASTRA_API_URL ?? "http://localhost:4111"
    const res = await fetch(`${base.replace(/\/$/, "")}/api/memory/threads/${encodeURIComponent(threadId)}/messages${qs}`, { credentials: "include", headers: { Accept: "application/json" } })
    if (!res.ok) {throw new Error(`Status ${res.status}`)}
    const data = await res.json()
    return data
  } catch (err) {
    // fallback: client SDK
    try {
      const thread = mastraClient.getMemoryThread({ threadId, agentId: "" })
      return await thread.listMessages({ page: opts?.page ?? 1, perPage: opts?.perPage ?? 50 })
    } catch (fallbackErr) {
      throw new Error("getThreadMessages failed: " + normalizeError(err ?? fallbackErr))
    }
  }
}

export async function listLogTransportsTyped() {
  try {
    const res = await mastraClient.listLogTransports()
    return res as unknown
  } catch (err) {
    throw new Error("listLogTransports failed: " + normalizeError(err))
  }
}

export async function listLogsTypedPaged(params?: { transportId?: string; page?: number; perPage?: number }) {
  const base = process.env.NEXT_PUBLIC_MASTRA_API_URL ?? "http://localhost:4111"
  try {
    const qs = buildQueryString({ transportId: params?.transportId, page: params?.page, perPage: params?.perPage })
    const res = await fetch(`${base.replace(/\/$/, "")}/api/logs${qs}`, { credentials: "include", headers: { Accept: "application/json" } })
    if (!res.ok) {throw new Error(`Status ${res.status}`)}
    const data = await res.json()
    return data as unknown
  } catch (err) {
    throw new Error("listLogs failed: " + normalizeError(err))
  }
}

export async function listVectorIndexesTyped(vectorName: string) {
  try {
    const vector = mastraClient.getVector(vectorName)
    const res = await vector.getIndexes()
    return res as unknown
  } catch (err) {
    throw new Error("listVectorIndexes failed: " + normalizeError(err))
  }
}

export async function vectorQueryTyped(vectorName: string, params: { indexName: string; queryVector: number[]; topK?: number; filter?: Record<string, unknown>; includeVector?: boolean }) {
  try {
    const vector = mastraClient.getVector(vectorName)
    const res = await vector.query(params)
    return res as unknown
  } catch (err) {
    throw new Error("vectorQuery failed: " + normalizeError(err))
  }
}

export async function apiHealthCheck(): Promise<ApiHealth> {
  const result: ApiHealth = { ok: true, checks: {} }
  // Agents
  try {
    await listAgentsTyped()
    result.checks.agents = { ok: true }
  } catch (err) {
    result.ok = false
    result.checks.agents = { ok: false, error: normalizeError(err) }
  }

  // Tools
  try {
    await listToolsTyped()
    result.checks.tools = { ok: true }
  } catch (err) {
    result.ok = false
    result.checks.tools = { ok: false, error: normalizeError(err) }
  }

  // Workflows
  try {
    await listWorkflowsTyped()
    result.checks.workflows = { ok: true }
  } catch (err) {
    result.ok = false
    result.checks.workflows = { ok: false, error: normalizeError(err) }
  }

  // Memory
  try {
    await listMemoryThreadsTyped()
    result.checks.memory = { ok: true }
  } catch (err) {
    result.ok = false
    result.checks.memory = { ok: false, error: normalizeError(err) }
  }

  // Logs
  try {
    await listLogsTypedPaged({ perPage: 1 })
    result.checks.logs = { ok: true }
  } catch (err) {
    result.ok = false
    result.checks.logs = { ok: false, error: normalizeError(err) }
  }

  return result
}
