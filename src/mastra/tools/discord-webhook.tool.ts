import { createTool } from '@mastra/core/tools'
import type { InferUITool } from '@mastra/core/tools'
import { z } from 'zod'

import { log } from '../config/logger'

const discordWebhookEmbedFieldSchema = z.object({
    name: z.string().min(1).describe('Embed field name.'),
    value: z.string().min(1).describe('Embed field value.'),
    inline: z.boolean().optional().describe('Whether the field should render inline.'),
})

const discordWebhookEmbedSchema = z.object({
    title: z.string().min(1).optional().describe('Embed title.'),
    description: z.string().min(1).optional().describe('Embed body text.'),
    url: z.url().optional().describe('Clickable URL for the embed title.'),
    color: z
        .number()
        .int()
        .min(0)
        .max(0xffffff)
        .optional()
        .describe('Embed accent color as a 24-bit integer.'),
    timestamp: z
        .iso.datetime({ offset: true })
        .optional()
        .describe('ISO-8601 timestamp shown by Discord.'),
    author: z
        .object({
            name: z.string().min(1),
            url: z.url().optional(),
            iconUrl: z.url().optional(),
        })
        .optional()
        .describe('Optional embed author block.'),
    footer: z
        .object({
            text: z.string().min(1),
            iconUrl: z.url().optional(),
        })
        .optional()
        .describe('Optional embed footer block.'),
    imageUrl: z.url().optional().describe('Main image URL for the embed.'),
    thumbnailUrl: z.url().optional().describe('Thumbnail image URL for the embed.'),
    fields: z
        .array(discordWebhookEmbedFieldSchema)
        .max(25)
        .optional()
        .describe('Optional embed fields, up to 25 entries.'),
})

const discordWebhookAllowedMentionsSchema = z
    .object({
        parse: z.array(z.enum(['roles', 'users', 'everyone'])).optional(),
        roles: z.array(z.string().min(1)).optional(),
        users: z.array(z.string().min(1)).optional(),
        repliedUser: z.boolean().optional(),
    })
    .optional()

const discordWebhookInputSchema = z.object({
    content: z.string().min(1).describe('Message content to post to Discord.'),
    username: z.string().min(1).optional(),
    avatarUrl: z.url().optional(),
    tts: z.boolean().optional(),
    wait: z.boolean().default(true),
    threadId: z.string().min(1).optional(),
    allowedMentions: discordWebhookAllowedMentionsSchema,
    embeds: z.array(discordWebhookEmbedSchema).max(10).optional(),
})

type DiscordWebhookInput = z.input<typeof discordWebhookInputSchema>

type DiscordWebhookMessage = {
    id?: string
    channel_id?: string
    timestamp?: string
    embeds?: Array<Record<string, unknown>>
}

type DiscordWebhookOutput = DiscordWebhookMessage & {
    ok: boolean
    status: number
    content: string
}

const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL?.trim() ?? ''
const DISCORD_WEBHOOK_BACKGROUND_ENABLED =
    process.env.DISCORD_WEBHOOK_BACKGROUND === 'true'

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
    strict: true,
    onInputStart: ({ toolCallId, messages }) => {
        log.info('discord-webhook input streaming started', {
            toolCallId,
            messages: messages ?? [],
            hook: 'onInputStart',
        })
    },
    onInputDelta: ({ inputTextDelta, toolCallId, messages }) => {
        log.info('discord-webhook received input chunk', {
            toolCallId,
            inputTextDelta,
            inputChunkLength: inputTextDelta.length,
            messages: messages ?? [],
            hook: 'onInputDelta',
        })
    },
    onInputAvailable: ({ input, toolCallId, messages }) => {
        log.info('discord-webhook received input', {
            toolCallId,
            messages: messages ?? [],
            inputData: {
                contentLength: input.content.length,
                wait: input.wait ?? true,
                hasThreadId:
                    typeof input.threadId === 'string' && input.threadId.length > 0,
                embedCount: input.embeds?.length ?? 0,
            },
            hook: 'onInputAvailable',
        })
    },
    background: {
        enabled: DISCORD_WEBHOOK_BACKGROUND_ENABLED,
        timeoutMs: 15_000,
        maxRetries: 0,
        waitTimeoutMs: 3_000,
        onComplete: (task) => {
            log.info('discord-webhook background task completed', {
                hook: 'background.onComplete',
                taskId: task.id,
                status: task.status,
                toolName: task.toolName,
                toolCallId: task.toolCallId,
                runId: task.runId,
            })
        },
        onFailed: (task) => {
            log.error('discord-webhook background task failed', {
                hook: 'background.onFailed',
                taskId: task.id,
                status: task.status,
                toolName: task.toolName,
                toolCallId: task.toolCallId,
                runId: task.runId,
                error: task.error?.message,
            })
        },
    },
    execute: async (input: DiscordWebhookInput): Promise<DiscordWebhookOutput> => {
        if (DISCORD_WEBHOOK_URL === '') {
            throw new Error('DISCORD_WEBHOOK_URL is not configured')
        }

        const url = new URL(DISCORD_WEBHOOK_URL)
        url.searchParams.set('wait', String(input.wait ?? true))

        if (typeof input.threadId === 'string' && input.threadId.length > 0) {
            url.searchParams.set('thread_id', input.threadId)
        }

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'content-type': 'application/json',
                accept: 'application/json',
            },
            body: JSON.stringify({
                content: input.content,
                ...(typeof input.username === 'string' && input.username.length > 0
                    ? { username: input.username }
                    : {}),
                ...(typeof input.avatarUrl === 'string' && input.avatarUrl.length > 0
                    ? { avatar_url: input.avatarUrl }
                    : {}),
                ...(typeof input.tts === 'boolean' ? { tts: input.tts } : {}),
                ...(input.allowedMentions
                    ? {
                          allowed_mentions: {
                              ...(input.allowedMentions.parse
                                  ? { parse: input.allowedMentions.parse }
                                  : {}),
                              ...(input.allowedMentions.roles
                                  ? { roles: input.allowedMentions.roles }
                                  : {}),
                              ...(input.allowedMentions.users
                                  ? { users: input.allowedMentions.users }
                                  : {}),
                              ...(typeof input.allowedMentions.repliedUser === 'boolean'
                                  ? {
                                        replied_user: input.allowedMentions.repliedUser,
                                    }
                                  : {}),
                          },
                      }
                    : {}),
                ...(input.embeds
                    ? {
                          embeds: input.embeds.map((embed) => ({
                              ...(typeof embed.title === 'string' && embed.title.length > 0
                                  ? { title: embed.title }
                                  : {}),
                              ...(typeof embed.description === 'string' &&
                              embed.description.length > 0
                                  ? { description: embed.description }
                                  : {}),
                              ...(typeof embed.url === 'string' && embed.url.length > 0
                                  ? { url: embed.url }
                                  : {}),
                              ...(typeof embed.color === 'number' ? { color: embed.color } : {}),
                              ...(typeof embed.timestamp === 'string' && embed.timestamp.length > 0
                                  ? { timestamp: embed.timestamp }
                                  : {}),
                              ...(embed.author
                                  ? {
                                        author: {
                                            name: embed.author.name,
                                            ...(typeof embed.author.url === 'string' && embed.author.url.length > 0
                                                ? { url: embed.author.url }
                                                : {}),
                                            ...(typeof embed.author.iconUrl === 'string' && embed.author.iconUrl.length > 0
                                                ? { icon_url: embed.author.iconUrl }
                                                : {}),
                                        },
                                    }
                                  : {}),
                              ...(embed.footer
                                  ? {
                                        footer: {
                                            text: embed.footer.text,
                                            ...(typeof embed.footer.iconUrl === 'string' &&
                                            embed.footer.iconUrl.length > 0
                                                ? { icon_url: embed.footer.iconUrl }
                                                : {}),
                                        },
                                    }
                                  : {}),
                              ...(typeof embed.imageUrl === 'string' && embed.imageUrl.length > 0
                                  ? { image: { url: embed.imageUrl } }
                                  : {}),
                              ...(typeof embed.thumbnailUrl === 'string' &&
                              embed.thumbnailUrl.length > 0
                                  ? { thumbnail: { url: embed.thumbnailUrl } }
                                  : {}),
                              ...(embed.fields
                                  ? {
                                        fields: embed.fields.map((field) => ({
                                            name: field.name,
                                            value: field.value,
                                            ...(typeof field.inline === 'boolean'
                                                ? { inline: field.inline }
                                                : {}),
                                        })),
                                    }
                                  : {}),
                          })),
                      }
                    : {}),
            }),
        })

        const data = response.ok
            ? ((await response.json()) as DiscordWebhookMessage)
            : null

        if (!response.ok) {
            const errorText = await response.text().catch(() => '')
            throw new Error(
                `Discord webhook request failed with status ${String(response.status)}${
                    errorText ? `: ${errorText}` : ''
                }`
            )
        }

        return {
            ok: response.ok,
            status: response.status,
            content: input.content,
            ...(data ?? {}),
        }
    },
    toModelOutput: (output: DiscordWebhookOutput) => ({
        type: 'text',
        value: output.ok
            ? `Discord message sent successfully (${String(output.status)})${
                  output.id ? ` • message ${output.id}` : ''
              }`
            : 'Discord message failed',
    }),
    onOutput: ({ output, toolCallId, toolName }) => {
        log.info('discord-webhook completed', {
            toolCallId,
            toolName,
            outputData: {
                ok: output.ok,
                status: output.status,
                contentLength: output.content.length,
                hasMessageId:
                    typeof output.id === 'string' && output.id.length > 0,
                hasChannelId:
                    typeof output.channel_id === 'string' && output.channel_id.length > 0,
            },
            hook: 'onOutput',
        })
    },
})

export type DiscordWebhookUITool = InferUITool<typeof discordWebhookTool>
