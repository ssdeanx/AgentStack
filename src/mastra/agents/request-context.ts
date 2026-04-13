import {
  MASTRA_RESOURCE_ID_KEY,
  MASTRA_THREAD_ID_KEY,
  RequestContext,
} from '@mastra/core/request-context'
import { z } from 'zod'

export const USER_ROLES = ['admin', 'user'] as const
export type UserRole = (typeof USER_ROLES)[number]

export const SUPPORTED_LANGUAGES = ['en', 'es', 'ja', 'fr'] as const
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number]

export const MODEL_OVERRIDE_PROVIDERS = [
  'google',
  'openai',
  'anthropic',
  'openrouter',
  'google-vertex',
  'ollama',
  'opencode'
] as const
export type ModelOverrideProvider = (typeof MODEL_OVERRIDE_PROVIDERS)[number]

export const ROLE_CONTEXT_KEY = 'role' as const
export const LANGUAGE_CONTEXT_KEY = 'language' as const
export const TEMPERATURE_UNIT_CONTEXT_KEY = 'temperature-unit' as const
export const RESEARCH_PHASE_CONTEXT_KEY = 'researchPhase' as const
export const USER_ID_CONTEXT_KEY = 'userId' as const
export const PROVIDER_ID_CONTEXT_KEY = 'provider-id' as const
export const MODEL_ID_CONTEXT_KEY = 'model-id' as const
export const WORKSPACE_ID_CONTEXT_KEY = 'workspaceId' as const

export type TemperatureUnit = 'celsius' | 'fahrenheit'
export type ResearchPhase = 'initial' | 'followup' | 'validation'

export interface BaseAgentRequestContext {
  [ROLE_CONTEXT_KEY]?: UserRole
  [LANGUAGE_CONTEXT_KEY]?: SupportedLanguage
  [TEMPERATURE_UNIT_CONTEXT_KEY]?: TemperatureUnit
  [RESEARCH_PHASE_CONTEXT_KEY]?: ResearchPhase
  [USER_ID_CONTEXT_KEY]?: string
  [WORKSPACE_ID_CONTEXT_KEY]?: string
}

export interface ModelOverrideRequestContext {
  [PROVIDER_ID_CONTEXT_KEY]?: ModelOverrideProvider
  [MODEL_ID_CONTEXT_KEY]?: string
}

export type AgentRequestContext<TExtra extends object = {}> = BaseAgentRequestContext & TExtra

export const baseAgentRequestContextSchema = z.object({
  [ROLE_CONTEXT_KEY]: z.enum(USER_ROLES).optional(),
  [LANGUAGE_CONTEXT_KEY]: z.enum(SUPPORTED_LANGUAGES).optional(),
  [TEMPERATURE_UNIT_CONTEXT_KEY]: z.enum(['celsius', 'fahrenheit']).optional(),
  [RESEARCH_PHASE_CONTEXT_KEY]: z
    .enum(['initial', 'followup', 'validation'])
    .optional(),
  [USER_ID_CONTEXT_KEY]: z.string().optional(),
  [PROVIDER_ID_CONTEXT_KEY]: z.enum(MODEL_OVERRIDE_PROVIDERS).optional(),
  [MODEL_ID_CONTEXT_KEY]: z.string().min(1).optional(),
})

export interface RequestContextReader {
  get(key: string): unknown
}

function isUserRole(value: unknown): value is UserRole {
  return value === 'admin' || value === 'user'
}

function isSupportedLanguage(value: unknown): value is SupportedLanguage {
  return value === 'en' || value === 'es' || value === 'ja' || value === 'fr'
}

export interface RequestContextIdentityInput {
  threadId?: string
  resourceId?: string
}

export interface SharedRequestContextPayload extends Partial<BaseAgentRequestContext> {
  [PROVIDER_ID_CONTEXT_KEY]?: ModelOverrideProvider
  [MODEL_ID_CONTEXT_KEY]?: string
  threadId?: string
  resourceId?: string
}

export function splitModelOverride(modelId: string): {
  providerId?: ModelOverrideProvider
  providerModelId?: string
} {
  const trimmedModelId = modelId.trim()
  if (trimmedModelId.length === 0) {
    return {}
  }

  const separatorIndex = trimmedModelId.indexOf('/')
  if (separatorIndex <= 0) {
    return { providerModelId: trimmedModelId }
  }

  const providerId = trimmedModelId.slice(0, separatorIndex)
  const providerModelId = trimmedModelId.slice(separatorIndex + 1)

  if (providerModelId.length === 0) {
    return { providerModelId: trimmedModelId }
  }

  if ((MODEL_OVERRIDE_PROVIDERS as readonly string[]).includes(providerId)) {
    return {
      providerId: providerId as ModelOverrideProvider,
      providerModelId,
    }
  }

  return { providerModelId: trimmedModelId }
}

export function buildSharedRequestContextPayload(
  payload: SharedRequestContextPayload
): Record<string, unknown> {
  const contextPayload: Record<string, unknown> = {}

  if (payload[USER_ID_CONTEXT_KEY] !== undefined) {
    contextPayload[USER_ID_CONTEXT_KEY] = payload[USER_ID_CONTEXT_KEY]
  }

  if (payload[ROLE_CONTEXT_KEY] !== undefined) {
    contextPayload[ROLE_CONTEXT_KEY] = payload[ROLE_CONTEXT_KEY]
  }

  if (payload[LANGUAGE_CONTEXT_KEY] !== undefined) {
    contextPayload[LANGUAGE_CONTEXT_KEY] = payload[LANGUAGE_CONTEXT_KEY]
  }

  if (payload[TEMPERATURE_UNIT_CONTEXT_KEY] !== undefined) {
    contextPayload[TEMPERATURE_UNIT_CONTEXT_KEY] = payload[TEMPERATURE_UNIT_CONTEXT_KEY]
  }

  if (payload[RESEARCH_PHASE_CONTEXT_KEY] !== undefined) {
    contextPayload[RESEARCH_PHASE_CONTEXT_KEY] = payload[RESEARCH_PHASE_CONTEXT_KEY]
  }

  if (payload[PROVIDER_ID_CONTEXT_KEY] !== undefined) {
    contextPayload[PROVIDER_ID_CONTEXT_KEY] = payload[PROVIDER_ID_CONTEXT_KEY]
  }

  if (payload[MODEL_ID_CONTEXT_KEY] !== undefined) {
    contextPayload[MODEL_ID_CONTEXT_KEY] = payload[MODEL_ID_CONTEXT_KEY]
  }

  if (payload.threadId !== undefined) {
    contextPayload[MASTRA_THREAD_ID_KEY] = payload.threadId
  }

  if (payload.resourceId !== undefined) {
    contextPayload[MASTRA_RESOURCE_ID_KEY] = payload.resourceId
  }

  return contextPayload
}

export function createAgentRequestContext<
  TContext extends Record<string, unknown> = Record<string, never>,
>(
  payload?: Partial<AgentRequestContext<TContext>> | Record<string, unknown>,
  identity?: RequestContextIdentityInput
): RequestContext<AgentRequestContext<TContext>> {
  const requestContext = new RequestContext<AgentRequestContext<TContext>>()
  const mutableRequestContext =
    requestContext as unknown as RequestContext<Record<string, unknown>>

  if (payload !== undefined) {
    for (const [key, value] of Object.entries(payload)) {
      if (value !== undefined) {
        mutableRequestContext.set(key, value)
      }
    }
  }

  if (identity?.threadId !== undefined) {
    mutableRequestContext.set(MASTRA_THREAD_ID_KEY, identity.threadId)
  }

  if (identity?.resourceId !== undefined) {
    mutableRequestContext.set(MASTRA_RESOURCE_ID_KEY, identity.resourceId)
  }

  return requestContext
}

export function getRoleFromContext(
  requestContext: RequestContextReader | undefined,
  fallback: UserRole = 'user'
): UserRole {
  const role = requestContext?.get(ROLE_CONTEXT_KEY)
  return isUserRole(role) ? role : fallback
}

export function getLanguageFromContext(
  requestContext: RequestContextReader | undefined,
  fallback: SupportedLanguage = 'en'
): SupportedLanguage {
  const language = requestContext?.get(LANGUAGE_CONTEXT_KEY)
  return isSupportedLanguage(language) ? language : fallback
}

export function getUserIdFromContext(
  requestContext: RequestContextReader | undefined
): string | undefined {
  return requestContext?.get(USER_ID_CONTEXT_KEY) as string | undefined
}

export function getWorkspaceIdFromContext(
  requestContext: RequestContextReader | undefined
): string | undefined {
  return requestContext?.get(WORKSPACE_ID_CONTEXT_KEY) as string | undefined
}

export function getModelOverrideFromContext(
  requestContext: RequestContextReader | undefined
): string | undefined {
  const providerId = requestContext?.get(PROVIDER_ID_CONTEXT_KEY)
  const modelId = requestContext?.get(MODEL_ID_CONTEXT_KEY)

  if (typeof modelId !== 'string' || modelId.trim().length === 0) {
    return undefined
  }

  if (modelId.includes('/')) {
    return modelId.trim()
  }

  if (typeof providerId === 'string' && providerId.trim().length > 0) {
    return `${providerId}/${modelId}`
  }

  return undefined
}

export function resolveModelFromContext(
  requestContext: RequestContextReader | undefined,
  models: {
    user: string
    admin?: string
  }
): string {
  const overrideModel = getModelOverrideFromContext(requestContext)
  if (overrideModel !== undefined) {
    return overrideModel
  }

  const role = getRoleFromContext(requestContext)
  if (role === 'admin') {
    return models.admin ?? models.user
  }
  return models.user
}
