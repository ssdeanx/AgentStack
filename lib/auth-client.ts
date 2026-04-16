import { createAuthClient } from 'better-auth/react'
import {
    type GoogleOneTapActionOptions,
    adminClient,
    deviceAuthorizationClient,
    multiSessionClient,
    oneTapClient,
    usernameClient,
} from 'better-auth/client/plugins'
import { apiKeyClient } from '@better-auth/api-key/client'
import { agentAuthClient } from '@better-auth/agent-auth/client'

const authBaseUrl =
    process.env.NEXT_PUBLIC_BETTER_AUTH_URL ?? 'http://localhost:3000'
const publicGoogleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim()
export const hasGoogleOneTapClient = Boolean(publicGoogleClientId)

export const authClient = createAuthClient({
    plugins: [
        adminClient(),
        apiKeyClient(),
        deviceAuthorizationClient(),
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
        agentAuthClient(),
    ],
    baseURL: authBaseUrl,
    credentials: 'include',
})

/**
 * Normalizes a device authorization code so users can paste either spaced or dashed variants.
 *
 * @param value - Raw user-entered device code.
 * @returns The uppercase, punctuation-free device code.
 */
export function normalizeDeviceUserCode(value: string): string {
    return value.trim().replace(/-/g, '').toUpperCase()
}

/**
 * Verifies that a device authorization code exists before advancing to the approval screen.
 *
 * @param input - The user code captured from the device verification screen.
 * @returns The Better Auth device lookup response.
 */
export async function checkDeviceAuthorizationCode(input: { userCode: string }) {
    return authClient.device({
        query: {
            user_code: normalizeDeviceUserCode(input.userCode),
        },
    })
}

/**
 * Approves a pending device authorization request.
 *
 * @param input - The device user code to approve.
 * @returns The Better Auth approval response.
 */
export async function approveDeviceAuthorization(input: { userCode: string }) {
    return authClient.device.approve({
        userCode: normalizeDeviceUserCode(input.userCode),
    })
}

/**
 * Denies a pending device authorization request.
 *
 * @param input - The device user code to reject.
 * @returns The Better Auth denial response.
 */
export async function denyDeviceAuthorization(input: { userCode: string }) {
    return authClient.device.deny({
        userCode: normalizeDeviceUserCode(input.userCode),
    })
}

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
