import { MastraClient } from '@mastra/client-js'

const mastraClient = new MastraClient({
    baseUrl: process.env.NEXT_PUBLIC_MASTRA_API_URL || 'http://localhost:4111',
})

export async function GET() {
    try {
        const workflows = await mastraClient.listWorkflows()

        const workflowList = Object.entries(workflows).map(
            ([id, workflow]) => ({
                id,
                name: id,
            })
        )

        return Response.json(workflowList)
    } catch (error) {
        console.error('Error fetching workflows:', error)
        return Response.json(
            { error: 'Failed to fetch workflows', details: String(error) },
            { status: 500 }
        )
    }
}
