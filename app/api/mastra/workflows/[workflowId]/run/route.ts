import { MastraClient } from '@mastra/client-js'

const mastraClient = new MastraClient({
    baseUrl: process.env.NEXT_PUBLIC_MASTRA_API_URL || 'http://localhost:4111',
})

// POST - Create and start a workflow run
export async function POST(
    request: Request,
    { params }: { params: Promise<{ workflowId: string }> }
) {
    const { workflowId } = await params
    const { inputData, initialState, runId, resourceId } = await request.json()

    try {
        const workflow = mastraClient.getWorkflow(workflowId)

        const run = await workflow.createRun({ runId, resourceId })
        const result = await run.startAsync({ inputData, initialState })

        return Response.json({ runId: run.runId, result })
    } catch (error) {
        return Response.json({ error: String(error) }, { status: 500 })
    }
}

// GET - Get run status by ID (also can use workflow.runById)
export async function GET(
    request: Request,
    { params }: { params: Promise<{ workflowId: string }> }
) {
    const { workflowId } = await params
    const { searchParams } = new URL(request.url)
    const runId = searchParams.get('runId')

    if (!runId) {
        return Response.json({ error: 'runId required' }, { status: 400 })
    }

    try {
        const workflow = mastraClient.getWorkflow(workflowId)
        const result = await workflow.runById(runId)
        return Response.json(result)
    } catch (error) {
        return Response.json({ error: 'Run not found' }, { status: 404 })
    }
}
