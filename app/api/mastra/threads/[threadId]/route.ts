import { MastraClient } from '@mastra/client-js'

const mastraClient = new MastraClient({
    baseUrl: process.env.NEXT_PUBLIC_MASTRA_API_URL || 'http://localhost:4111',
})

export async function GET(
    _request: Request,
    { params }: { params: Promise<{ threadId: string }> }
): Promise<Response> {
    const { threadId } = await params

    try {
        const thread = mastraClient.getMemoryThread({ threadId })
        const details = await thread.get()
        return Response.json(details)
    } catch (error) {
        console.error('Error fetching thread:', error)
        return Response.json(
            { error: 'Failed to fetch thread', details: String(error) },
            { status: 500 }
        )
    }
}

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ threadId: string }> }
): Promise<Response> {
    const { threadId } = await params
    const body = await request.json()
    const { title, metadata, resourceId } = body as {
        title?: string
        metadata?: Record<string, unknown>
        resourceId?: string
    }

    try {
        const thread = mastraClient.getMemoryThread({ threadId })
        const updated = await thread.update({
            title: title ?? '',
            metadata: metadata ?? {},
            resourceId: resourceId ?? '',
        })
        return Response.json(updated)
    } catch (error) {
        console.error('Error updating thread:', error)
        return Response.json(
            { error: 'Failed to update thread', details: String(error) },
            { status: 500 }
        )
    }
}

export async function DELETE(
    _request: Request,
    { params }: { params: Promise<{ threadId: string }> }
): Promise<Response> {
    const { threadId } = await params

    try {
        const thread = mastraClient.getMemoryThread({ threadId })
        await thread.delete()
        return Response.json({ success: true, message: 'Thread deleted' })
    } catch (error) {
        console.error('Error deleting thread:', error)
        return Response.json(
            { error: 'Failed to delete thread', details: String(error) },
            { status: 500 }
        )
    }
}
