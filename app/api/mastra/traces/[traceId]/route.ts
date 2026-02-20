import { MastraClient } from '@mastra/client-js'

const mastraClient = new MastraClient({
    baseUrl: process.env.NEXT_PUBLIC_MASTRA_API_URL || 'http://localhost:4111',
})

export async function GET(
    request: Request,
    { params }: { params: Promise<{ traceId: string }> }
) {
    const { traceId } = await params

    try {
        const trace = await mastraClient.getTrace(traceId)
        return Response.json(trace)
    } catch (error) {
        return Response.json({ error: 'Trace not found' }, { status: 404 })
    }
}
