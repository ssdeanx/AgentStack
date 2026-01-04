import { AGENT_CONFIGS } from '@/app/chat/config/agents'
import { NETWORK_CONFIGS } from '@/app/networks/config/networks'
import { WORKFLOW_CONFIGS } from '@/app/workflows/config/workflows'

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

export function listNetworks(): RegistryItem[] {
    return Object.values(NETWORK_CONFIGS)
        .map((n) => ({ id: n.id, name: n.name, description: n.description }))
        .sort((a, b) => a.name.localeCompare(b.name))
}

export function listWorkflows(): RegistryItem[] {
    return Object.values(WORKFLOW_CONFIGS)
        .map((w) => ({ id: w.id, name: w.name, description: w.description }))
        .sort((a, b) => a.name.localeCompare(b.name))
}
