import { MastraClient } from '@mastra/client-js'

const mastraClient = new MastraClient({
    baseUrl: process.env.NEXT_PUBLIC_MASTRA_API_URL || 'http://localhost:4111',
})

export async function GET(request: Request): Promise<Response> {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')

    try {
        if (action === 'transports') {
            const transports = await mastraClient.listLogTransports()
            return Response.json({ transports })
        }

        const transportId = searchParams.get('transportId') || undefined
        const logs = await mastraClient.listLogs({
            transportId: transportId ?? '',
        })

        return Response.json({ logs })
    } catch (error) {
        console.error('Error fetching logs:', error)
        return Response.json(
            { error: 'Failed to fetch logs', details: String(error) },
            { status: 500 }
        )
    }
}
