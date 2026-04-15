import { createAuthClient } from 'better-auth/react'
import {
    type GoogleOneTapActionOptions,
    adminClient,
    multiSessionClient,
    oneTapClient,
    usernameClient,
} from 'better-auth/client/plugins'
import { apiKeyClient } from '@better-auth/api-key/client'
//import { agentAuthClient } from "@better-auth/agent-auth/client";

const authBaseUrl =
    process.env.NEXT_PUBLIC_BETTER_AUTH_URL ?? 'http://localhost:3000'
const publicGoogleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim()
export const hasGoogleOneTapClient = Boolean(publicGoogleClientId)

export const authClient = createAuthClient({
    plugins: [
        adminClient(),
        apiKeyClient(),
        multiSessionClient(),
        oneTapClient({
            clientId: publicGoogleClientId ?? 'missing-google-client-id',
            autoSelect: true,
            context: 'signin',
            uxMode: 'redirect',
            additionalOptions: {
                // Any extra options for the Google initialize method
            },
            promptOptions: {
                baseDelay: 1000,
                maxAttempts: 5,
            },
        }),
        usernameClient(),
      //  agentAuthClient(),
    ],
    baseURL: authBaseUrl,
    credentials: 'include',
})

export async function startGoogleOneTap(
    options?: GoogleOneTapActionOptions
) {
    if (!hasGoogleOneTapClient) {
        return
    }

    await authClient.oneTap(options)
}

export async function signInWithUsername(input: {
    username: string
    password: string
    callbackURL?: string
}) {
    return authClient.signIn.username(input)
}

export async function signUpWithUsername(input: {
    name: string
    username: string
    email: string
    password: string
    callbackURL?: string
}) {
    return authClient.signUp.email(input)
}
