'use client'

import { useState } from 'react'
import { useMastraQuery } from '@/lib/hooks/use-mastra-query'

export default function McpA2APage() {
  const {
    useMcpServers,
    useMcpServerTools,
    useAgents,
    useA2ACard,
  } = useMastraQuery()

  const serversResult = useMcpServers({ page: 0, perPage: 50 })
  const servers = serversResult.data?.servers ?? []

  const [selectedServerId, setSelectedServerId] = useState<string>('')
  const activeServerId = selectedServerId || servers[0]?.id || ''

  const toolsResult = useMcpServerTools(activeServerId)
  const serverTools = toolsResult.data?.tools ?? []

  const agentsResult = useAgents()
  const agents = agentsResult.data ?? []

  const [selectedAgentId, setSelectedAgentId] = useState<string>('')
  const activeAgentId = selectedAgentId || agents[0]?.id || ''

  const a2aCardResult = useA2ACard(activeAgentId)
  const a2aCard = a2aCardResult.data

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 p-4 md:p-6">
      <h1 className="text-xl font-semibold">MCP / A2A</h1>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-2">
        <section className="min-h-0 overflow-auto rounded-lg border p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-medium">MCP Servers & Tools</h2>
            <select
              aria-label="Select MCP server"
              title="Select MCP server"
              className="rounded-md border bg-background px-2 py-1 text-sm"
              value={activeServerId}
              onChange={(e) => setSelectedServerId(e.target.value)}
            >
              {servers.map((server: { id: string; name?: string }) => (
                <option key={server.id} value={server.id}>
                  {server.name ?? server.id}
                </option>
              ))}
            </select>
          </div>

          <ul className="space-y-2">
            {serverTools.length === 0 ? (
              <li className="text-sm text-muted-foreground">No MCP tools found.</li>
            ) : (
              serverTools.map((tool: { id: string; description?: string }) => (
                <li key={tool.id} className="rounded-md border p-2">
                  <div className="text-sm font-medium">{tool.id}</div>
                  {typeof tool.description === 'string' && tool.description.trim().length > 0 ? (
                    <p className="mt-1 text-xs text-muted-foreground">{tool.description}</p>
                  ) : null}
                </li>
              ))
            )}
          </ul>
        </section>

        <section className="min-h-0 overflow-auto rounded-lg border p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-medium">A2A Agent Card</h2>
            <select
              aria-label="Select A2A agent"
              title="Select A2A agent"
              className="rounded-md border bg-background px-2 py-1 text-sm"
              value={activeAgentId}
              onChange={(e) => setSelectedAgentId(e.target.value)}
            >
              {agents.map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.name}
                </option>
              ))}
            </select>
          </div>

          {!a2aCard ? (
            <p className="text-sm text-muted-foreground">No A2A card available.</p>
          ) : (
            <div className="space-y-3">
              <div>
                <div className="text-xs text-muted-foreground">Agent</div>
                <div className="text-sm font-medium">{a2aCard.name ?? activeAgentId}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Description</div>
                <div className="text-sm">{a2aCard.description ?? 'N/A'}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Skills</div>
                <ul className="mt-1 list-disc pl-5 text-sm">
                  {(a2aCard.skills ?? []).map((skill: { id?: string; name?: string }, idx: number) => (
                    <li key={skill.id ?? skill.name ?? `skill-${idx}`}>
                      {skill.name ?? skill.id ?? 'Unnamed skill'}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
