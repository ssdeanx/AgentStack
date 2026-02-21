import { MastraClient } from '@mastra/client-js'

const mastraClient = new MastraClient({
    baseUrl: process.env.NEXT_PUBLIC_MASTRA_API_URL || 'http://localhost:4111',
})

export async function GET(
    request: Request,
    { params }: { params: Promise<{ runId: string }> }
): Promise<Response> {
    const { runId } = await params
    const { searchParams } = new URL(request.url)
    const transportId = searchParams.get('transportId') || ''

    try {
        const logs = await mastraClient.getLogForRun({
            runId,
            transportId,
        })
        return Response.json(logs)
    } catch (error) {
        console.error('Error fetching run logs:', error)
        return Response.json(
            { error: 'Failed to fetch run logs', details: String(error) },
            { status: 500 }
        )
    }
}
