import { MastraClient } from '@mastra/client-js'

const mastraClient = new MastraClient({
    baseUrl: process.env.NEXT_PUBLIC_MASTRA_API_URL || 'http://localhost:4111',
})

export async function GET() {
    try {
        const tools = await mastraClient.listTools()

        const toolList = Object.entries(tools).map(([id, tool]) => ({
            id,
            name: id,
            description: tool.description,
        }))

        return Response.json(toolList)
    } catch (error) {
        console.error('Error fetching tools:', error)
        return Response.json(
            { error: 'Failed to fetch tools', details: String(error) },
            { status: 500 }
        )
    }
}
