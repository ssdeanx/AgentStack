import { AGENT_CONFIGS } from '@/app/chat/config/agents'
import { WORKFLOW_CONFIGS } from '@/app/chat/config/workflows'

export interface RegistryItem {
    id: string
    name: string
    description: string
}

export function listAgents(): RegistryItem[] {
    return Object.values(AGENT_CONFIGS)
        .map((a) => ({ id: a.id, name: a.name, description: a.description }))
        .sort((a, b) => a.name.localeCompare(b.name))
}

export function listWorkflows(): RegistryItem[] {
    return Object.values(WORKFLOW_CONFIGS)
        .map((w) => ({ id: w.id, name: w.name, description: w.description }))
        .sort((a, b) => a.name.localeCompare(b.name))
}
