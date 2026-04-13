'use client'

import { Suspense, use } from 'react'

import { ChatProvider } from '../../providers/chat-context'
import { CodeLayout } from '../../components/code-layout'

export default function CodeAgentPage({
	params,
}: {
	params: Promise<{ agentId: string }>
}) {
	return (
		<Suspense fallback={<div>Loading Code Studio...</div>}>
			<CodeAgentPageContent params={params} />
		</Suspense>
	)
}

function CodeAgentPageContent({
	params,
}: {
	params: Promise<{ agentId: string }>
}) {
	const { agentId } = use(params)

	return (
		<ChatProvider defaultAgent={agentId}>
			<CodeLayout />
		</ChatProvider>
	)
}