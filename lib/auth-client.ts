import { createAuthClient } from 'better-auth/react'
import { adminClient, multiSessionClient, usernameClient } from 'better-auth/client/plugins'
import { apiKeyClient } from '@better-auth/api-key/client'

export const authClient = createAuthClient({
    plugins: [adminClient(), apiKeyClient(), multiSessionClient(), usernameClient()],
    baseURL: process.env.NEXT_PUBLIC_BETTER_AUTH_URL ?? 'http://localhost:3000',
    credentials: 'include',
})
