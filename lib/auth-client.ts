import { createAuthClient } from 'better-auth/react'
import {
    adminClient,
    multiSessionClient,
    oneTapClient,
    usernameClient,
} from 'better-auth/client/plugins'
import { apiKeyClient } from '@better-auth/api-key/client'
//import { agentAuthClient } from "@better-auth/agent-auth/client";

export const authClient = createAuthClient({
    plugins: [
        adminClient(),
        apiKeyClient(),
        multiSessionClient(),
        oneTapClient({
            clientId: process.env.GOOGLE_CLIENT_ID ?? 'your-google-client-id',
            autoSelect: true,
            context: 'signin',
            uxMode: 'redirect',
            additionalOptions: {
            // Any extra options for the Google initialize method
            },
            // Configure prompt behavior and exponential backoff:
            promptOptions: {
                baseDelay: 1000,   // Base delay in ms (default: 1000)
                maxAttempts: 5     // Maximum number of attempts before triggering onPromptNotification (default: 5)
            }
        }),
        usernameClient(),
      //  agentAuthClient(),
    ],
    baseURL: process.env.NEXT_PUBLIC_BETTER_AUTH_URL ?? 'http://localhost:3000',
    credentials: 'include',
})
