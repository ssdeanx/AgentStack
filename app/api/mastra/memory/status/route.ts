import { MastraClient } from '@mastra/client-js'

const mastraClient = new MastraClient({
    baseUrl: process.env.NEXT_PUBLIC_MASTRA_API_URL || 'http://localhost:4111',
})

export async function GET(request: Request): Promise<Response> {
    const { searchParams } = new URL(request.url)
    const agentId = searchParams.get('agentId')

    if (!agentId) {
        return Response.json(
            { error: 'agentId query parameter is required' },
            { status: 400 }
        )
    }

    try {
        const status = await mastraClient.getMemoryStatus(agentId)
        return Response.json(status)
    } catch (error) {
        console.error('Error fetching memory status:', error)
        return Response.json(
            { error: 'Failed to fetch memory status', details: String(error) },
            { status: 500 }
        )
    }
}
