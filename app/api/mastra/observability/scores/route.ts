import { MastraClient } from '@mastra/client-js'

const mastraClient = new MastraClient({
    baseUrl: process.env.NEXT_PUBLIC_MASTRA_API_URL || 'http://localhost:4111',
})

// GET - List scores for a trace/span
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)
    const traceId = searchParams.get('traceId')
    const spanId = searchParams.get('spanId')
    const page = parseInt(searchParams.get('page') || '1')
    const perPage = parseInt(searchParams.get('perPage') || '20')

    if (!traceId) {
        return Response.json({ error: 'traceId required' }, { status: 400 })
    }

    try {
        const scores = await mastraClient.listScoresBySpan({
            traceId,
            spanId: spanId || undefined,
            page,
            perPage,
        })
        return Response.json(scores)
    } catch (error) {
        return Response.json({ error: String(error) }, { status: 500 })
    }
}

// POST - Score a trace
export async function POST(request: Request) {
    const { scorerName, traceId, spanId } = await request.json()

    if (!scorerName || !traceId) {
        return Response.json(
            { error: 'scorerName and traceId required' },
            { status: 400 }
        )
    }

    try {
        const result = await mastraClient.score({
            scorerName,
            targets: [{ traceId, spanId }],
        })
        return Response.json(result)
    } catch (error) {
        return Response.json({ error: String(error) }, { status: 500 })
    }
}
