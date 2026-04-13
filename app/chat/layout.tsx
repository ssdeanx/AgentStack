import type { ReactNode } from 'react'

import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

import { auth } from '@/auth'

/**
 * Protects the entire chat subtree with a server-side session check.
 *
 * This prevents unauthenticated users from briefly rendering protected chat
 * surfaces before the client redirect runs.
 */
export default async function ChatLayout({
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
