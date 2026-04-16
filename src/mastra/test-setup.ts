import { auth } from './auth.test'

const ctx = await auth.$context
const test = ctx.test

export { auth, test }