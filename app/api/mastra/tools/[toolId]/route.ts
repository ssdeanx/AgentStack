import { MastraClient } from '@mastra/client-js'
import type { RequestContext } from '@mastra/core/request-context'

const mastraClient = new MastraClient({
    baseUrl: process.env.NEXT_PUBLIC_MASTRA_API_URL || 'http://localhost:4111',
})

export async function GET(
    request: Request,
    { params }: { params: Promise<{ toolId: string }> }
) {
    try {
        const { toolId } = await params
        const tool = mastraClient.getTool(toolId)
        const details = await tool.details()

        return Response.json(details)
    } catch (error) {
        console.error('Error fetching tool details:', error)
        return Response.json(
            { error: 'Failed to fetch tool details', details: String(error) },
            { status: 500 }
        )
    }
}

export async function POST(
    request: Request,
    { params }: { params: Promise<{ toolId: string }> }
) {
    try {
        const { toolId } = await params
        const body = await request.json()
        const { args, runId, requestContext } = body as {
            args?: Record<string, unknown>
            runId?: string | undefined
            requestContext?: RequestContext<unknown> | Record<string, any> | undefined
        }

        const tool = mastraClient.getTool(toolId)
        const result = await tool.execute({
            data: args ?? {},
            runId: runId ?? "",
            requestContext: requestContext ?? {},
        })

        return Response.json(result)
    } catch (error) {
        console.error('Error executing tool:', error)
        return Response.json(
            { error: 'Failed to execute tool', details: String(error) },
            { status: 500 }
        )
    }
}
