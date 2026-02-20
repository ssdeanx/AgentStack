import { MastraClient } from '@mastra/client-js'

const mastraClient = new MastraClient({
    baseUrl: process.env.NEXT_PUBLIC_MASTRA_API_URL || 'http://localhost:4111',
})

export async function GET(
    request: Request,
    { params }: { params: Promise<{ workflowId: string }> }
) {
    const { workflowId } = await params

    try {
        const workflow = mastraClient.getWorkflow(workflowId)
        const details = await workflow.details()
        return Response.json(details)
    } catch (error) {
        return Response.json({ error: 'Workflow not found' }, { status: 404 })
    }
}
