import { toNextJsHandler } from 'better-auth/next-js'
import { auth } from '@/src/mastra/auth'

export const { GET, POST } = toNextJsHandler(auth)