import { createTool } from '@mastra/core/tools'
import type { InferUITool } from '@mastra/core/tools'
import { z } from 'zod'

import { createHttpClient } from '../lib/http-client'
import { log } from '../config/logger'

const MOLTBOOK_BASE_URL = 'https://www.moltbook.com/api/v1'
const MOLTBOOK_API_KEY =
	process.env.MOLTBOOK_API_KEY?.trim() ?? process.env.MOLTBOOK_TOKEN?.trim() ?? ''

const moltbookClient = createHttpClient({
	baseURL: MOLTBOOK_BASE_URL,
	headers: MOLTBOOK_API_KEY
		? {
			  Authorization: `Bearer ${MOLTBOOK_API_KEY}`,
		  }
		: {},
}).client

const requestSchema = z.object({
	method: z.string(),
	path: z.string(),
})

const agentSchema = z
	.object({
		id: z.string().optional(),
		name: z.string().optional(),
		description: z.string().optional(),
		owner_email: z.email().optional(),
		bio: z.string().optional(),
		website: z.url().optional(),
	})
	.loose()

const postSchema = z
	.object({
		id: z.string().optional(),
		submolt: z.string().optional(),
		title: z.string().optional(),
		content: z.string().optional(),
		url: z.url().optional(),
	})
	.loose()

const searchResultSchema = z
	.object({
		query: z.string(),
		type: z.enum(['posts', 'comments', 'agents', 'submolts']).optional(),
		results: z.array(z.looseObject({})).optional(),
	})
	.loose()

const conversationMessageSchema = z
	.object({
		id: z.string().optional(),
		conversation_id: z.string().optional(),
		content: z.string().optional(),
	})
	.loose()

export const moltbookRegisterAgentTool = createTool({
	id: 'moltbook-register-agent',
	description: 'Register a new Moltbook agent profile.',
	inputSchema: z.object({
		name: z.string().min(1),
		description: z.string().min(1),
		owner_email: z.email().optional(),
	}),
	outputSchema: z.object({
		ok: z.boolean(),
		status: z.number().int(),
		message: z.string(),
		request: requestSchema,
		data: agentSchema,
	}),
	strict: true,
	onInputStart: ({ toolCallId, messages }) => {
		log.info('moltbook-register-agent input streaming started', {
			toolCallId,
			messages: messages ?? [],
			hook: 'onInputStart',
		})
	},
	onInputDelta: ({ inputTextDelta, toolCallId, messages }) => {
		log.info('moltbook-register-agent received input chunk', {
			toolCallId,
			inputTextDelta,
			inputChunkLength: inputTextDelta.length,
			messages: messages ?? [],
			hook: 'onInputDelta',
		})
	},
	onInputAvailable: ({ input, toolCallId, messages }) => {
		log.info('moltbook-register-agent received input', {
			toolCallId,
			messages: messages ?? [],
			inputData: {
				nameLength: input.name.length,
				descriptionLength: input.description.length,
				hasOwnerEmail:
					typeof input.owner_email === 'string' && input.owner_email.length > 0,
			},
			hook: 'onInputAvailable',
		})
	},
	execute: async (inputData, context): Promise<{
		ok: boolean
		status: number
		message: string
		request: { method: string; path: string }
		data: z.infer<typeof agentSchema>
	}> => {
		if (MOLTBOOK_API_KEY === '') {
			throw new Error('MOLTBOOK_API_KEY is not configured')
		}

		const response = await moltbookClient.post('/agents/register', inputData)

		return {
			ok: response.status >= 200 && response.status < 300,
			status: response.status,
			message: 'Moltbook agent registered',
			request: { method: 'POST', path: '/agents/register' },
			data: response.data as z.infer<typeof agentSchema>,
		}
	},
	toModelOutput: (output) => ({
		type: 'json',
		value: output,
	}),
	onOutput: ({ output, toolCallId, toolName, abortSignal }) => {
		const aborted = abortSignal?.aborted ?? false

		log.info('moltbook-register-agent completed', {
			toolCallId,
			toolName,
			abortSignal: aborted,
			outputData: {
				status: output.status,
				ok: output.ok,
				hasAgentId:
					typeof output.data.id === 'string' && output.data.id.length > 0,
			},
			hook: 'onOutput',
		})
	},
})

export type MoltbookRegisterAgentUITool = InferUITool<
	typeof moltbookRegisterAgentTool
>

export const moltbookGetProfileTool = createTool({
	id: 'moltbook-get-profile',
	description: 'Fetch the current Moltbook agent profile.',
	inputSchema: z.object({}),
	outputSchema: z.object({
		ok: z.boolean(),
		status: z.number().int(),
		message: z.string(),
		request: requestSchema,
		data: agentSchema,
	}),
	strict: true,
	onInputStart: ({ toolCallId, messages }) => {
		log.info('moltbook-get-profile input streaming started', {
			toolCallId,
			messages: messages ?? [],
			hook: 'onInputStart',
		})
	},
	onInputDelta: ({ inputTextDelta, toolCallId, messages }) => {
		log.info('moltbook-get-profile received input chunk', {
			toolCallId,
			inputTextDelta,
			inputChunkLength: inputTextDelta.length,
			messages: messages ?? [],
			hook: 'onInputDelta',
		})
	},
	onInputAvailable: ({ toolCallId, messages }) => {
		log.info('moltbook-get-profile received input', {
			toolCallId,
			messages: messages ?? [],
			inputData: { request: 'current profile' },
			hook: 'onInputAvailable',
		})
	},
	execute: async (inputData, context): Promise<{
		ok: boolean
		status: number
		message: string
		request: { method: string; path: string }
		data: z.infer<typeof agentSchema>
	}> => {
		if (MOLTBOOK_API_KEY === '') {
			throw new Error('MOLTBOOK_API_KEY is not configured')
		}

		const response = await moltbookClient.get('/agents/me')

		return {
			ok: response.status >= 200 && response.status < 300,
			status: response.status,
			message: 'Moltbook profile loaded',
			request: { method: 'GET', path: '/agents/me' },
			data: response.data as z.infer<typeof agentSchema>,
		}
	},
	toModelOutput: (output) => ({
		type: 'json',
		value: output,
	}),
	onOutput: ({ output, toolCallId, toolName }) => {

		log.info('moltbook-get-profile completed', {
			toolCallId,
			toolName,
			outputData: {
				status: output.status,
				ok: output.ok,
				hasAgentId:
					typeof output.data.id === 'string' && output.data.id.length > 0,
			},
			hook: 'onOutput',
		})
	},
})

export type MoltbookGetProfileUITool = InferUITool<typeof moltbookGetProfileTool>

export const moltbookUpdateProfileTool = createTool({
	id: 'moltbook-update-profile',
	description: 'Update the current Moltbook agent profile.',
	inputSchema: z.object({
		bio: z.string().min(1).optional(),
		website: z.url().optional(),
	}),
	outputSchema: z.object({
		ok: z.boolean(),
		status: z.number().int(),
		message: z.string(),
		request: requestSchema,
		data: agentSchema,
	}),
	strict: true,
	onInputStart: ({ toolCallId, messages }) => {
		log.info('moltbook-update-profile input streaming started', {
			toolCallId,
			messages: messages ?? [],
			hook: 'onInputStart',
		})
	},
	onInputDelta: ({ inputTextDelta, toolCallId, messages }) => {
		log.info('moltbook-update-profile received input chunk', {
			toolCallId,
			inputTextDelta,
			inputChunkLength: inputTextDelta.length,
			messages: messages ?? [],
			hook: 'onInputDelta',
		})
	},
	onInputAvailable: ({ input, toolCallId, messages }) => {
		log.info('moltbook-update-profile received input', {
			toolCallId,
			messages: messages ?? [],
			inputData: {
				hasBio: typeof input.bio === 'string' && input.bio.length > 0,
				hasWebsite:
					typeof input.website === 'string' && input.website.length > 0,
			},
			hook: 'onInputAvailable',
		})
	},
	execute: async (inputData, context): Promise<{
		ok: boolean
		status: number
		message: string
		request: { method: string; path: string }
		data: z.infer<typeof agentSchema>
	}> => {
		if (MOLTBOOK_API_KEY === '') {
			throw new Error('MOLTBOOK_API_KEY is not configured')
		}

		const response = await moltbookClient.patch('/agents/me', inputData)

		return {
			ok: response.status >= 200 && response.status < 300,
			status: response.status,
			message: 'Moltbook profile updated',
			request: { method: 'PATCH', path: '/agents/me' },
			data: response.data as z.infer<typeof agentSchema>,
		}
	},
	toModelOutput: (output) => ({
		type: 'json',
		value: output,
	}),
	onOutput: ({ output, toolCallId, toolName }) => {

		log.info('moltbook-update-profile completed', {
			toolCallId,
			toolName,
			outputData: {
				status: output.status,
				ok: output.ok,
				hasWebsite:
					typeof output.data.website === 'string' &&
					output.data.website.length > 0,
			},
			hook: 'onOutput',
		})
	},
})

export type MoltbookUpdateProfileUITool = InferUITool<
	typeof moltbookUpdateProfileTool
>

export const moltbookCreatePostTool = createTool({
	id: 'moltbook-create-post',
	description: 'Create a new Moltbook post.',
	inputSchema: z.object({
		submolt: z.string().min(1),
		title: z.string().min(1),
		content: z.string().optional(),
		url: z.url().optional(),
	}),
	outputSchema: z.object({
		ok: z.boolean(),
		status: z.number().int(),
		message: z.string(),
		request: requestSchema,
		data: postSchema,
	}),
	strict: true,
	onInputStart: ({ toolCallId, messages }) => {
		log.info('moltbook-create-post input streaming started', {
			toolCallId,
			messages: messages ?? [],
			hook: 'onInputStart',
		})
	},
	onInputDelta: ({ inputTextDelta, toolCallId, messages }) => {
		log.info('moltbook-create-post received input chunk', {
			toolCallId,
			inputTextDelta,
			inputChunkLength: inputTextDelta.length,
			messages: messages ?? [],
			hook: 'onInputDelta',
		})
	},
	onInputAvailable: ({ input, toolCallId, messages }) => {
		log.info('moltbook-create-post received input', {
			toolCallId,
			messages: messages ?? [],
			inputData: {
				submolt: input.submolt,
				titleLength: input.title.length,
				hasContent: typeof input.content === 'string' && input.content.length > 0,
				hasUrl: typeof input.url === 'string' && input.url.length > 0,
			},
			hook: 'onInputAvailable',
		})
	},
	execute: async (inputData, context): Promise<{
		ok: boolean
		status: number
		message: string
		request: { method: string; path: string }
		data: z.infer<typeof postSchema>
	}> => {
		if (MOLTBOOK_API_KEY === '') {
			throw new Error('MOLTBOOK_API_KEY is not configured')
		}

		const response = await moltbookClient.post('/posts', inputData)

		return {
			ok: response.status >= 200 && response.status < 300,
			status: response.status,
			message: 'Moltbook post created',
			request: { method: 'POST', path: '/posts' },
			data: response.data as z.infer<typeof postSchema>,
		}
	},
	toModelOutput: (output) => ({
		type: 'json',
		value: output,
	}),
	onOutput: ({ output, toolCallId, toolName }) => {

		log.info('moltbook-create-post completed', {
			toolCallId,
			toolName,
			outputData: {
				status: output.status,
				ok: output.ok,
				hasUrl: typeof output.data.url === 'string' && output.data.url.length > 0,
			},
			hook: 'onOutput',
		})
	},
})

export type MoltbookCreatePostUITool = InferUITool<typeof moltbookCreatePostTool>

export const moltbookSearchTool = createTool({
	id: 'moltbook-search',
	description: 'Search Moltbook content by query and optional type.',
	inputSchema: z.object({
		query: z.string().min(1),
		type: z.enum(['posts', 'comments', 'agents', 'submolts']).optional(),
	}),
	outputSchema: z.object({
		ok: z.boolean(),
		status: z.number().int(),
		message: z.string(),
		request: requestSchema,
		data: searchResultSchema,
	}),
	strict: true,
	onInputStart: ({ toolCallId, messages }) => {
		log.info('moltbook-search input streaming started', {
			toolCallId,
			messages: messages ?? [],
			hook: 'onInputStart',
		})
	},
	onInputDelta: ({ inputTextDelta, toolCallId, messages }) => {
		log.info('moltbook-search received input chunk', {
			toolCallId,
			inputTextDelta,
			inputChunkLength: inputTextDelta.length,
			messages: messages ?? [],
			hook: 'onInputDelta',
		})
	},
	onInputAvailable: ({ input, toolCallId, messages }) => {
		log.info('moltbook-search received input', {
			toolCallId,
			messages: messages ?? [],
			inputData: {
				queryLength: input.query.length,
				hasType: typeof input.type === 'string' && input.type.length > 0,
			},
			hook: 'onInputAvailable',
		})
	},
	execute: async (inputData, context): Promise<{
		ok: boolean
		status: number
		message: string
		request: { method: string; path: string }
		data: z.infer<typeof searchResultSchema>
	}> => {
		if (MOLTBOOK_API_KEY === '') {
			throw new Error('MOLTBOOK_API_KEY is not configured')
		}

		const response = await moltbookClient.get('/search', {
			params: {
				q: inputData.query,
				...(typeof inputData.type === 'string' ? { type: inputData.type } : {}),
			},
		})

		return {
			ok: response.status >= 200 && response.status < 300,
			status: response.status,
			message: 'Moltbook search completed',
			request: { method: 'GET', path: '/search' },
			data: {
				query: inputData.query,
				...(typeof inputData.type === 'string' ? { type: inputData.type } : {}),
				...(response.data as Record<string, unknown>),
			},
		}
	},
	toModelOutput: (output) => ({
		type: 'json',
		value: output,
	}),
	onOutput: ({ output, toolCallId, toolName }) => {
		const resultCount = Array.isArray(output.data.results) ? output.data.results.length : 0

		log.info('moltbook-search completed', {
			toolCallId,
			toolName,
			outputData: {
				status: output.status,
				ok: output.ok,
				resultCount,
			},
			hook: 'onOutput',
		})
	},
})

export type MoltbookSearchUITool = InferUITool<typeof moltbookSearchTool>

export const moltbookSendMessageTool = createTool({
	id: 'moltbook-send-message',
	description: 'Send a direct message in Moltbook.',
	inputSchema: z.object({
		conversationId: z.string().min(1),
		content: z.string().min(1),
	}),
	outputSchema: z.object({
		ok: z.boolean(),
		status: z.number().int(),
		message: z.string(),
		request: requestSchema,
		data: conversationMessageSchema,
	}),
	strict: true,
	onInputStart: ({ toolCallId, messages }) => {
		log.info('moltbook-send-message input streaming started', {
			toolCallId,
			messages: messages ?? [],
			hook: 'onInputStart',
		})
	},
	onInputDelta: ({ inputTextDelta, toolCallId, messages }) => {
		log.info('moltbook-send-message received input chunk', {
			toolCallId,
			inputTextDelta,
			inputChunkLength: inputTextDelta.length,
			messages: messages ?? [],
			hook: 'onInputDelta',
		})
	},
	onInputAvailable: ({ input, toolCallId, messages }) => {
		log.info('moltbook-send-message received input', {
			toolCallId,
			messages: messages ?? [],
			inputData: {
				conversationId: input.conversationId,
				contentLength: input.content.length,
			},
			hook: 'onInputAvailable',
		})
	},
	execute: async (inputData, context): Promise<{
		ok: boolean
		status: number
		message: string
		request: { method: string; path: string }
		data: z.infer<typeof conversationMessageSchema>
	}> => {
		if (MOLTBOOK_API_KEY === '') {
			throw new Error('MOLTBOOK_API_KEY is not configured')
		}

		const path = `/dms/conversations/${inputData.conversationId}`
		const response = await moltbookClient.post(path, { content: inputData.content })

		return {
			ok: response.status >= 200 && response.status < 300,
			status: response.status,
			message: 'Moltbook direct message sent',
			request: {
				method: 'POST',
				path,
			},
			data: response.data as z.infer<typeof conversationMessageSchema>,
		}
	},
	toModelOutput: (output) => ({
		type: 'json',
		value: output,
	}),
	onOutput: ({ output, toolCallId, toolName }) => {

		log.info('moltbook-send-message completed', {
			toolCallId,
			toolName,
			outputData: {
				status: output.status,
				ok: output.ok,
				hasMessageId:
					typeof output.data.id === 'string' && output.data.id.length > 0,
			},
			hook: 'onOutput',
		})
	},
})

export type MoltbookSendMessageUITool = InferUITool<typeof moltbookSendMessageTool>