import { MastraClient } from '@mastra/client-js'
import type { StorageListMessagesOutput } from '@mastra/core/storage'

const mastraClient = new MastraClient({
    baseUrl: process.env.NEXT_PUBLIC_MASTRA_API_URL || 'http://localhost:4111',
})

export async function GET(
    request: Request,
    { params }: { params: Promise<{ threadId: string }> }
) {
    const { threadId } = await params

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '0')
    const perPage = parseInt(searchParams.get('perPage') || '20')
    const orderByField = searchParams.get('orderBy')
    const orderByDir = searchParams.get('direction') || 'DESC'

    try {
        const thread = mastraClient.getMemoryThread({ threadId })
        const orderBy =
            orderByField === 'createdAt'
            ? { field: 'createdAt' as const, direction: orderByDir as 'ASC' | 'DESC' }
            : undefined

        // client-js types ListMemoryThreadMessagesResponse as { messages }, but the server
        // actually returns StorageListMessagesOutput (PaginationInfo & { messages }) at runtime
        const result = (await thread.listMessages({
            page,
            perPage,
            ...(orderBy ? { orderBy } : {}),
        })) as StorageListMessagesOutput

        return Response.json({
            messages: result.messages,
            total: result.total,
            page: result.page,
            perPage: result.perPage,
            hasMore: result.hasMore,
        })
    } catch (error) {
        console.error('Error fetching messages:', error)
        return Response.json(
            { error: 'Failed to fetch messages', details: String(error) },
            { status: 500 }
        )
    }
}

