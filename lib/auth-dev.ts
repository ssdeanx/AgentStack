/**
 * Dev-only sign-in script.
 * Use this script to sign in as a development user using environment variables.
 * Run manually (e.g. `node -r dotenv/config ./lib/auth-dev.ts` or via ts-node) — do not import this into the app code.
 */
import { signInWithPassword } from './auth'

async function main() {
  const email = process.env.USER_EMAIL
  const password = process.env.USER_PASSWORD
  if (!email || !password) {
    console.warn('USER_EMAIL and USER_PASSWORD are not set; skipping dev sign-in.')
    return
  }

  try {
    const res = await signInWithPassword(email, password)
    if (res?.data?.user) {
      // eslint-disable-next-line no-console
      console.log('Dev sign-in success:', res.data.user.id)
    } else if (res?.error) {
      // eslint-disable-next-line no-console
      console.error('Dev sign-in error:', res.error)
    } else {
      // eslint-disable-next-line no-console
      console.log('Dev sign-in result:', res)
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Unexpected error during dev sign-in:', err)
  }
}

if (require.main === module) {
  main().catch((err) => {
    /* eslint-disable no-console */
    console.error('Dev sign-in failed:', err)
    process.exit(1)
  })
}

export default main
