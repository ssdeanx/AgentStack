import { oAuthProtectedResourceMetadata } from 'better-auth/plugins'
import { auth } from '@/src/mastra/auth'



export const dynamic = 'force-dynamic'

export const GET = oAuthProtectedResourceMetadata(auth)