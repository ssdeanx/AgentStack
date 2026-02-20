import { MastraClient } from '@mastra/client-js'

const mastraClient = new MastraClient({
    baseUrl: process.env.NEXT_PUBLIC_MASTRA_API_URL || 'http://localhost:4111',
})

interface AgentResponse {
    id: string
    name: string
    description: string
    modelId: string
    model: string
    tools: string[]
}

export async function GET(): Promise<Response> {
    try {
        const agents = await mastraClient.listAgents()

        const agentList: AgentResponse[] = Object.entries(agents).map(
            ([id, agent]) => ({
                id,
                name: agent.name ?? id,
                description: agent.description ?? '',
                modelId: agent.modelId ?? '',
                model: agent.modelId ?? '',
                tools: agent.tools ? Object.keys(agent.tools) : [],
            })
        )

        return Response.json(agentList)
    } catch (error) {
        console.error('Error fetching agents:', error)
        return Response.json(
            { error: 'Failed to fetch agents', details: String(error) },
            { status: 500 }
        )
    }
}
