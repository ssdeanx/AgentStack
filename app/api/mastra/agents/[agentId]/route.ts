import { MastraClient } from '@mastra/client-js'

const mastraClient = new MastraClient({
    baseUrl: process.env.NEXT_PUBLIC_MASTRA_API_URL || 'http://localhost:4111',
})

interface AgentDetailResponse {
    id: string
    name: string
    description: string
    modelId: string
    model: string
    tools: string[]
}

export async function GET(
    _request: Request,
    { params }: { params: Promise<{ agentId: string }> }
): Promise<Response> {
    try {
        const { agentId } = await params

        if (!agentId) {
            return Response.json(
                { error: 'Agent ID is required' },
                { status: 400 }
            )
        }

        const agents = await mastraClient.listAgents()
        const agent = agents[agentId]

        if (!agent) {
            return Response.json(
                { error: `Agent not found: ${agentId}` },
                { status: 404 }
            )
        }

        const agentDetail: AgentDetailResponse = {
            id: agentId,
            name: agent.name ?? agentId,
            description: agent.description ?? '',
            modelId: agent.modelId ?? '',
            model: agent.modelId ?? '',
            tools: agent.tools ? Object.keys(agent.tools) : [],
        }

        return Response.json(agentDetail)
    } catch (error) {
        console.error('Error fetching agent:', error)
        return Response.json(
            { error: 'Failed to fetch agent', details: String(error) },
            { status: 500 }
        )
    }
}
