import { MastraClient } from '@mastra/client-js'
import { RequestContext } from '@mastra/core/request-context'

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
        const result = await thread.listMessages({
            page,
            perPage,
            ...(orderByField && {
                orderBy: {
                    field: orderByField,
                    direction: orderByDir as 'ASC' | 'DESC',
                },
            }),
        })

        return Response.json({
            messages: result.messages,
            total: result.total,
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
