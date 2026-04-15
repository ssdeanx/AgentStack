import { Suspense, type ReactNode } from 'react'

import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

import { auth } from '@/auth'

/**
 * Protects the entire chat subtree with a server-side session check.
 *
 * This prevents unauthenticated users from briefly rendering protected chat
 * surfaces before the client redirect runs.
 */
async function ChatSessionGate({
	children,
}: {
	children: ReactNode
}) {
	const session = await auth.api.getSession({
		headers: await headers(),
	})

	if (!session) {
		redirect('/login?next=/chat')
	}

	return children
}

export default function ChatLayout({
	children,
}: {
	children: ReactNode
}) {
	return <Suspense fallback={null}><ChatSessionGate>{children}</ChatSessionGate></Suspense>
}
