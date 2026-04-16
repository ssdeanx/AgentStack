import { betterAuth } from 'better-auth'
import { testUtils } from 'better-auth/plugins'

import { authOptions } from './auth'

export const auth = betterAuth({
    ...authOptions,
    plugins: [...(authOptions.plugins ?? []), testUtils()],
})