import type { Metadata } from 'next'

import { DeviceApprovalForm } from '../_components/device-approval-form'

/**
 * Metadata for the device approval page.
 */
export const metadata: Metadata = {
    title: 'Approve Device | AgentStack',
    description: 'Approve or deny the device authorization request for an agent.',
}

/**
 * Server wrapper for the device approval screen.
 */
export default async function DeviceApprovalPage({
    searchParams,
}: {
    searchParams?: Promise<{ user_code?: string | string[] }>
}) {
    const resolvedSearchParams = (await searchParams) ?? {}

    const userCode = Array.isArray(resolvedSearchParams.user_code)
        ? resolvedSearchParams.user_code[0] ?? null
        : resolvedSearchParams.user_code ?? null

    return <DeviceApprovalForm initialUserCode={userCode} />
}