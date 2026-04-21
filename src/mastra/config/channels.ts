import { createDiscordAdapter } from '@chat-adapter/discord'
import { createGitHubAdapter } from '@chat-adapter/github'
import { createMemoryState } from '@chat-adapter/state-memory'
import type { ChannelConfig, ChannelHandlers } from '@mastra/core/channels'
import type { Message, Thread } from 'chat'

import { log } from './logger'

/**
 * Detects whether the GitHub channel can be safely registered from the
 * current environment variables.
 *
 * GitHub channel support requires the webhook secret plus either a token or a
 * GitHub App key pair, otherwise Mastra channel startup can fail in unconfigured
 * environments.
 */
export function isGitHubChannelConfigured(): boolean {
	const hasWebhookSecret = Boolean(process.env.GITHUB_WEBHOOK_SECRET?.trim())
	const hasToken = Boolean(process.env.GITHUB_TOKEN?.trim())
	const hasAppAuth = Boolean(
		process.env.GITHUB_APP_ID?.trim() && process.env.GITHUB_PRIVATE_KEY?.trim()
	)

	return hasWebhookSecret && (hasToken || hasAppAuth)
}

/**
 * Normalizes a channel message payload to a plain text string when possible.
 *
 * Different Chat SDK adapters expose either `text` or `content`, so the shared
 * config keeps the extraction logic in one place.
 */
export function getChannelMessageText(message: {
	text?: string
	content?: unknown
}): string {
	if (typeof message.text === 'string' && message.text.trim().length > 0) {
		return message.text.trim()
	}

	if (typeof message.content === 'string' && message.content.trim().length > 0) {
		return message.content.trim()
	}

	return ''
}

/**
 * Detects short acknowledgement replies that do not warrant another full
 * research pass.
 */
export function isAcknowledgementOnlyMessage(messageText: string): boolean {
	return /^(thanks|thank you|resolved|done|fixed|closed|lgtm|sgtm|looks good)[.!]?$/i.test(
		messageText.trim()
	)
}

/**
 * Detects GitHub-backed channel threads from the Chat SDK thread ID format.
 */
export function isGitHubThread(thread: Thread): boolean {
	return thread.id.startsWith('github:')
}

/**
 * Shared event labels used by the research channel handlers.
 */
export type ResearchChannelEvent =
	| 'direct-message'
	| 'mention'
	| 'subscribed-message'

/**
 * Logs a normalized channel event and applies the shared acknowledgement
 * suppression rules before delegating to the default handler.
 */
export async function handleResearchChannelEvent(
	event: ResearchChannelEvent,
	thread: Thread,
	message: Message,
	defaultHandler: (thread: Thread, message: Message) => Promise<void>,
	options?: {
		skipAcknowledgements?: boolean
	}
): Promise<void> {
	const messageText = getChannelMessageText(message)
	const acknowledgementOnly = isAcknowledgementOnlyMessage(messageText)
	const githubThread = isGitHubThread(thread)

	log.info('Research channel event', {
		event,
		threadId: thread.id,
		platform: githubThread ? 'github' : 'chat',
		textLength: messageText.length,
		acknowledgementOnly,
	})

	if (options?.skipAcknowledgements && acknowledgementOnly) {
		log.info('Research channel event skipped', {
			event,
			threadId: thread.id,
			reason: 'acknowledgement-only',
			platform: githubThread ? 'github' : 'chat',
		})
		return
	}

	await defaultHandler(thread, message)
}

/**
 * Builds the research agent's channel adapter map with environment-gated
 * GitHub support.
 */
export function createResearchChannelAdapters(): ChannelConfig['adapters'] {
	const adapters: ChannelConfig['adapters'] = {
		discord: {
			adapter: createDiscordAdapter(),
			gateway: false,
		},
	}

	if (isGitHubChannelConfigured()) {
		adapters.github = {
			adapter: createGitHubAdapter({
				userName: process.env.GITHUB_BOT_USERNAME?.trim() ?? 'research-agent',
			}),
			gateway: false,
			cards: false,
		}
	}

	return adapters
}

/**
 * Shared channel handler overrides for the research agent.
 */
export const researchChannelHandlers: ChannelHandlers = {
	onDirectMessage: async (thread, message, defaultHandler) => {
		await handleResearchChannelEvent(
			'direct-message',
			thread,
			message,
			defaultHandler
		)
	},
	onMention: async (thread, message, defaultHandler) => {
		await handleResearchChannelEvent('mention', thread, message, defaultHandler, {
			skipAcknowledgements: true,
		})
	},
	onSubscribedMessage: async (thread, message, defaultHandler) => {
		await handleResearchChannelEvent(
			'subscribed-message',
			thread,
			message,
			defaultHandler,
			{
				skipAcknowledgements: true,
			}
		)
	},
}

/**
 * Shared channels configuration for the research agent.
 *
 * Keep this as the central place for channel defaults so future agents can
 * re-use the same adapter, inline media, and thread-context configuration.
 */
export function createResearchAgentChannels(): ChannelConfig {
	return {
		inlineLinks: ['*'],
		inlineMedia: ['image/*', 'video/*', 'audio/*'],
		adapters: createResearchChannelAdapters(),
		threadContext: {
			maxMessages: 15,
		},
		state: createMemoryState(),
		handlers: researchChannelHandlers,
	}
}

/**
 * Prebuilt research-agent channel configuration for the current runtime.
 */
export const researchAgentChannels = createResearchAgentChannels()
