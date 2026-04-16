import type { Metadata } from 'next'

import { DeviceAuthorizationForm } from './_components/device-authorization-form'

/**
 * Metadata for the device verification page.
 */
export const metadata: Metadata = {
    title: 'Device Verification | AgentStack',
    description: 'Verify the code shown by your agent before approving access.',
}

/**
 * Server wrapper for the Better Auth device verification screen.
 *
 * @param props - Route search parameters passed by Next.js.
 * @returns The rendered verification form.
 */
export default async function DeviceAuthorizationPage({
    searchParams,
}: {
    searchParams?: Promise<{ user_code?: string | string[] }>
}) {
    const resolvedSearchParams = (await searchParams) ?? {}

    const userCode = Array.isArray(resolvedSearchParams.user_code)
        ? resolvedSearchParams.user_code[0] ?? null
        : resolvedSearchParams.user_code ?? null

    return <DeviceAuthorizationForm initialUserCode={userCode} />
}
