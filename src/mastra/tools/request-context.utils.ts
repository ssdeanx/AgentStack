import type { RequestContext } from '@mastra/core/request-context'
import type {
  MASTRA_RESOURCE_ID_KEY,
  MASTRA_THREAD_ID_KEY
} from '@mastra/core/request-context'
import type {
  ROLE_CONTEXT_KEY,
  UserRole,
  ResearchPhase,
  TemperatureUnit,
} from '../agents/request-context'

type UserId = {
  userId: string
}

type WorkspaceId = {
  workspaceId: string
}

/**
 * Base generic context for all tools to extend.
 *
 */
export interface BaseToolRequestContext extends RequestContext {
  userId: UserId['userId']
  workspaceId: WorkspaceId['workspaceId']
  [ROLE_CONTEXT_KEY]?: UserRole
  'temperature-unit'?: TemperatureUnit
  researchPhase?: ResearchPhase
  [MASTRA_RESOURCE_ID_KEY]?: string
  [MASTRA_THREAD_ID_KEY]?: string
}

