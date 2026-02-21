import { MastraClient } from '@mastra/client-js'

const mastraClient = new MastraClient({
    baseUrl: process.env.NEXT_PUBLIC_MASTRA_API_URL || 'http://localhost:4111',
})

export async function GET(
    request: Request,
    { params }: { params: Promise<{ vectorName: string }> }
): Promise<Response> {
    const { vectorName } = await params
    const { searchParams } = new URL(request.url)
    const indexName = searchParams.get('indexName')

    try {
        const vector = mastraClient.getVector(vectorName)

        if (indexName) {
            const details = await vector.details(indexName)
            return Response.json(details)
        }

        const result = await vector.getIndexes()
        return Response.json(result)
    } catch (error) {
        console.error('Error fetching vector indexes:', error)
        return Response.json(
            {
                error: 'Failed to fetch vector indexes',
                details: String(error),
            },
            { status: 500 }
        )
    }
}

export async function POST(
    request: Request,
    { params }: { params: Promise<{ vectorName: string }> }
): Promise<Response> {
    const { vectorName } = await params
    const body = await request.json()
    const { indexName, dimension, metric } = body as {
        indexName: string
        dimension: number
        metric?: 'cosine' | 'euclidean' | 'dotproduct'
    }

    if (!indexName || !dimension) {
        return Response.json(
            { error: 'indexName and dimension are required' },
            { status: 400 }
        )
    }

    try {
        const vector = mastraClient.getVector(vectorName)
        const result = await vector.createIndex({
            indexName,
            dimension,
            metric,
        })
        return Response.json(result)
    } catch (error) {
        console.error('Error creating vector index:', error)
        return Response.json(
            {
                error: 'Failed to create vector index',
                details: String(error),
            },
            { status: 500 }
        )
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ vectorName: string }> }
): Promise<Response> {
    const { vectorName } = await params
    const { searchParams } = new URL(request.url)
    const indexName = searchParams.get('indexName')

    if (!indexName) {
        return Response.json(
            { error: 'indexName query parameter is required' },
            { status: 400 }
        )
    }

    try {
        const vector = mastraClient.getVector(vectorName)
        const result = await vector.delete(indexName)
        return Response.json(result)
    } catch (error) {
        console.error('Error deleting vector index:', error)
        return Response.json(
            {
                error: 'Failed to delete vector index',
                details: String(error),
            },
            { status: 500 }
        )
    }
}
