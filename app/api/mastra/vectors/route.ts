import { MastraClient } from '@mastra/client-js'

const mastraClient = new MastraClient({
    baseUrl: process.env.NEXT_PUBLIC_MASTRA_API_URL || 'http://localhost:4111',
})

/**
 * GET /api/mastra/vectors
 * List all vector indexes across all vector stores.
 * Uses MastraClient instead of raw fetch to localhost:4111
 */
export async function GET() {
    try {
        // Try to get indexes from default vector store
        const vector = mastraClient.getVector('default')
        const result = await vector.getIndexes()

        // Transform result to array if needed
        const indexes = Array.isArray(result)
            ? result
            : (result as any)?.data || (result as any)?.indexes || []

        // Transform to sidebar format
        const vectorList = indexes.map((idx: any) => ({
            name: idx.name || idx.indexName || 'default',
            dimension: idx.dimension || 3072,
            count: idx.count || idx.vectorCount || 0,
        }))

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
