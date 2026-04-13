import { redirect } from 'next/navigation'

/**
 * Legacy compatibility route that redirects to the new agents namespace.
 */
export default async function LegacyChatAgentRoute({
    params,
}: {
    params: Promise<{ agentId: string }>
}) {
    const { agentId } = await params
    redirect(`/chat/agents/${agentId}`)
}