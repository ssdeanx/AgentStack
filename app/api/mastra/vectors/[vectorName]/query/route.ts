import { MastraClient } from '@mastra/client-js'

const mastraClient = new MastraClient({
    baseUrl: process.env.NEXT_PUBLIC_MASTRA_API_URL || 'http://localhost:4111',
})

export async function POST(
    request: Request,
    { params }: { params: Promise<{ vectorName: string }> }
): Promise<Response> {
    const { vectorName } = await params
    const body = await request.json()
    const { indexName, queryVector, topK, filter, includeVector } = body as {
        indexName: string
        queryVector: number[]
        topK?: number
        filter?: Record<string, unknown>
        includeVector?: boolean
    }

    if (!indexName || !queryVector) {
        return Response.json(
            { error: 'indexName and queryVector are required' },
            { status: 400 }
        )
    }

    try {
        const vector = mastraClient.getVector(vectorName)
        const results = await vector.query({
            indexName,
            queryVector,
            topK,
            filter,
            includeVector,
        })
        return Response.json(results)
    } catch (error) {
        console.error('Error querying vectors:', error)
        return Response.json(
            { error: 'Failed to query vectors', details: String(error) },
            { status: 500 }
        )
    }
}
