import { MastraClient } from '@mastra/client-js'

const mastraClient = new MastraClient({
    baseUrl: process.env.NEXT_PUBLIC_MASTRA_API_URL || 'http://localhost:4111',
})

/**
 * GET /api/mastra/vectors
 * List all vector indexes across all vector stores.
 * Uses MastraClient instead of raw fetch to localhost:4111
 */
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const vectorName = searchParams.get('vectorName') || 'pgVector'

        const vector = mastraClient.getVector(vectorName)
        const result = await vector.getIndexes()

        const resultRecord = result as unknown as Record<string, unknown>
        const indexes: unknown[] = Array.isArray(result)
            ? result
            : (resultRecord.data as unknown[]) || (resultRecord.indexes as unknown[]) || []

        interface VectorIndexEntry {
            name?: string
            indexName?: string
            dimension?: number
            count?: number
            vectorCount?: number
        }

        const vectorList = indexes.map((idx) => {
            const entry = idx as VectorIndexEntry
            return {
                name: entry.name || entry.indexName || 'default',
                dimension: entry.dimension || 3072,
                count: entry.count || entry.vectorCount || 0,
            }
        })

        return Response.json(vectorList)
    } catch (error) {
        console.error('Error fetching vectors:', error)

        // Return empty array if no vector store configured
        if (
            error instanceof Error &&
            (error.message.includes('not found') ||
                error.message.includes('undefined'))
        ) {
            return Response.json([])
        }

        return Response.json(
            { error: 'Failed to fetch vectors', details: String(error) },
            { status: 500 }
        )
    }
}

/**
 * POST /api/mastra/vectors
 * Create a new vector index.
 */
export async function POST(request: Request) {
    const { indexName, dimension, metric } = await request.json()

    try {
        const vector = mastraClient.getVector('default')
        const result = await vector.createIndex({
            indexName,
            dimension,
            metric,
        })
        return Response.json(result)
    } catch (error) {
        return Response.json({ error: String(error) }, { status: 500 })
    }
}
