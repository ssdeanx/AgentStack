import { createTool } from '@mastra/core/tools'
import type { InferUITool } from '@mastra/core/tools'
import { z } from 'zod'

const discordWebhookInputSchema = z.object({
    content: z.string().min(1).describe('Message content to post to Discord.'),
    username: z.string().min(1).optional().describe('Optional webhook display name override.'),
    avatarUrl: z.url().optional().describe('Optional avatar image URL override.'),
    tts: z.boolean().optional().describe('Whether Discord should read the message aloud.'),
})

type DiscordWebhookInput = z.infer<typeof discordWebhookInputSchema>

type DiscordWebhookMessage = {
    id?: string
    channel_id?: string
    timestamp?: string
}

type DiscordWebhookOutput = DiscordWebhookMessage & {
    ok: boolean
    status: number
    content: string
}

const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL?.trim() ?? ''

export const discordWebhookTool = createTool({
    id: 'discord-webhook',
    description:
        'Post a message to the configured Discord webhook URL from DISCORD_WEBHOOK_URL.',
    inputSchema: discordWebhookInputSchema,
    outputSchema: z.object({
        ok: z.boolean(),
        status: z.number().int(),
        content: z.string(),
        id: z.string().optional(),
        channel_id: z.string().optional(),
        timestamp: z.string().optional(),
    }),
    execute: async (input: DiscordWebhookInput): Promise<DiscordWebhookOutput> => {
        if (DISCORD_WEBHOOK_URL === '') {
            throw new Error('DISCORD_WEBHOOK_URL is not configured')
        }

        const url = new URL(DISCORD_WEBHOOK_URL)
        url.searchParams.set('wait', 'true')

        const body = {
            content: input.content,
            allowed_mentions: {
                parse: [],
            },
            ...(input.username ? { username: input.username } : {}),
            ...(input.avatarUrl ? { avatar_url: input.avatarUrl } : {}),
            ...(typeof input.tts === 'boolean' ? { tts: input.tts } : {}),
        }

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'content-type': 'application/json',
                accept: 'application/json',
            },
            body: JSON.stringify(body),
        })

        const data = response.ok
            ? ((await response.json()) as DiscordWebhookMessage)
            : undefined

        if (!response.ok) {
            const errorText = await response.text().catch(() => '')
            throw new Error(
                `Discord webhook request failed with status ${response.status}${
                    errorText ? `: ${errorText}` : ''
                }`
            )
        }

        return {
            ok: response.ok,
            status: response.status,
            content: input.content,
            ...data,
        }
    },
})

export type DiscordWebhookUITool = InferUITool<typeof discordWebhookTool>