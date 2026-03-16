import type { Agent } from '@mastra/core/agent'

type NestedAgentsInput = Record<string, object>

/**
 * Upstream Mastra currently types `AgentConfig.agents` as `Record<string, Agent>`
 * in `@mastra/core/dist/agent/types.d.ts`, which rejects valid child agents that
 * keep stricter request-context generics.
 *
 * This is a single boundary adaptation only. Child agents keep their exact
 * requestContext typing internally; the cast is only for the parent registry slot.
 */
export function asNestedAgents<TAgents extends NestedAgentsInput>(
  agents: TAgents
): Record<string, Agent> {
  return agents as never as Record<string, Agent>
}
