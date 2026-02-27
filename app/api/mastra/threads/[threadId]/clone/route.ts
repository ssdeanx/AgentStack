import { MastraClient } from '@mastra/client-js'

const mastraClient = new MastraClient({
    baseUrl: process.env.NEXT_PUBLIC_MASTRA_API_URL || 'http://localhost:4111',
})

export async function POST(
    request: Request,
    { params }: { params: Promise<{ threadId: string }> }
): Promise<Response> {
    const { threadId } = await params
    const body = await request.json()
    const { newThreadId, title, metadata, options } = body as {
        newThreadId?: string
        title?: string
        metadata?: Record<string, unknown>
        options?: {
            messageLimit?: number
            messageFilter?: {
                startDate?: string
                endDate?: string
            }
        }
    }

    try {
        const thread = mastraClient.getMemoryThread({ threadId })

        const cloneOptions: Record<string, unknown> = {}
        if (newThreadId) {cloneOptions.newThreadId = newThreadId}
        if (title) {cloneOptions.title = title}
        if (metadata) {cloneOptions.metadata = metadata}
        if (options) {
            const opts: Record<string, unknown> = {}
            if (options.messageLimit) {opts.messageLimit = options.messageLimit}
            if (options.messageFilter) {
                opts.messageFilter = {
                    startDate: options.messageFilter.startDate
                        ? new Date(options.messageFilter.startDate)
                        : undefined,
                    endDate: options.messageFilter.endDate
                        ? new Date(options.messageFilter.endDate)
                        : undefined,
                }
            }
            cloneOptions.options = opts
        }

        const result = await thread.clone(cloneOptions)
        return Response.json(result)
    } catch (error) {
        console.error('Error cloning thread:', error)
        return Response.json(
            { error: 'Failed to clone thread', details: String(error) },
            { status: 500 }
        )
    }
}
