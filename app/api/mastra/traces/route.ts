import { MastraClient } from '@mastra/client-js'

const mastraClient = new MastraClient({
    baseUrl: process.env.NEXT_PUBLIC_MASTRA_API_URL || 'http://localhost:4111',
})

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const page = parseInt(searchParams.get('page') || '1')
        const perPage = parseInt(searchParams.get('perPage') || '20')

        const traces = await mastraClient.getTraces({
            pagination: { page, perPage },
        })

        const traceList = traces.spans.map((span) => ({
            id: span.spanId,
            traceId: span.traceId,
            name: span.name,
            startTime: span.startTime,
            endTime: span.endTime,
            status: span.status,
        }))

        return Response.json({
            traces: traceList,
            pagination: traces.pagination,
        })
    } catch (error) {
        console.error('Error fetching traces:', error)
        return Response.json(
            { error: 'Failed to fetch traces', details: String(error) },
            { status: 500 }
        )
    }
}
