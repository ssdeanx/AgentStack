import { MastraClient } from '@mastra/client-js'
import type { RequestContext } from '@mastra/core/request-context'

const mastraClient = new MastraClient({
    baseUrl: process.env.NEXT_PUBLIC_MASTRA_API_URL || 'http://localhost:4111',
})

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const resourceId = searchParams.get('resourceId') || undefined
        const agentId = searchParams.get('agentId') || undefined
        const requestContext: RequestContext | Record<string, any> | undefined = undefined
        const page = parseInt(searchParams.get('page') || '0')
        const perPage = parseInt(searchParams.get('perPage') || '20')


        const threads = await mastraClient.listMemoryThreads({
            resourceId,
            agentId,
            requestContext,
            page,
            perPage,
        })

        const threadList = threads.threads.map((thread) => ({
            id: thread.id,
            resourceId: thread.resourceId,
            title: thread.title,
            createdAt: thread.createdAt,
            updatedAt: thread.updatedAt,
            metadata: thread.metadata
        }))

        return Response.json(threadList)
    } catch (error) {
        console.error('Error fetching threads:', error)
        return Response.json(
            { error: 'Failed to fetch threads', details: String(error) },
            { status: 500 }
        )
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { resourceId, agentId, title, metadata, threadId, requestContext } = body

        const thread = await mastraClient.createMemoryThread({
            resourceId,
            agentId,
            title,
            metadata,
            threadId,
            requestContext,
        })

        return Response.json(thread)
    } catch (error) {
        console.error('Error creating thread:', error)
        return Response.json(
            { error: 'Failed to create thread', details: String(error) },
            { status: 500 }
        )
    }
}
