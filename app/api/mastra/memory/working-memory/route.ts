import { MastraClient } from '@mastra/client-js'

const mastraClient = new MastraClient({
    baseUrl: process.env.NEXT_PUBLIC_MASTRA_API_URL || 'http://localhost:4111',
})

export async function GET(request: Request): Promise<Response> {
    const { searchParams } = new URL(request.url)
    const agentId = searchParams.get('agentId')
    const threadId = searchParams.get('threadId')
    const resourceId = searchParams.get('resourceId') || undefined

    if (!agentId || !threadId) {
        return Response.json(
            { error: 'agentId and threadId query parameters are required' },
            { status: 400 }
        )
    }

    try {
        const workingMemory = await mastraClient.getWorkingMemory({
            agentId,
            threadId,
            resourceId,
        })
        return Response.json(workingMemory)
    } catch (error) {
        console.error('Error fetching working memory:', error)
        return Response.json(
            {
                error: 'Failed to fetch working memory',
                details: String(error),
            },
            { status: 500 }
        )
    }
}

export async function PUT(request: Request): Promise<Response> {
    const body = await request.json()
    const { agentId, threadId, workingMemory, resourceId } = body as {
        agentId: string
        threadId: string
        workingMemory: string
        resourceId?: string
    }

    if (!agentId || !threadId || workingMemory === undefined) {
        return Response.json(
            {
                error: 'agentId, threadId, and workingMemory are required in the request body',
            },
            { status: 400 }
        )
    }

    try {
        const result = await mastraClient.updateWorkingMemory({
            agentId,
            threadId,
            workingMemory,
            resourceId,
        })
        return Response.json(result)
    } catch (error) {
        console.error('Error updating working memory:', error)
        return Response.json(
            {
                error: 'Failed to update working memory',
                details: String(error),
            },
            { status: 500 }
        )
    }
}
