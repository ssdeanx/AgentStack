import type { Provider } from "@supabase/supabase-js";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL ?? "https://your-project.supabase.co",
  process.env.SUPABASE_KEY ?? "anonymous-public-key"
);

// Exported sign-in helpers - do not call on import; call explicitly in app logic or dev scripts
export async function signInWithPassword(email: string, password: string) {
  return supabase.auth.signInWithPassword({ email, password })
}

export async function signInWithOAuth(provider: 'github' | Provider, options?: { redirectTo?: string }) {
  return supabase.auth.signInWithOAuth({ provider, ...options })
}

export default supabase;

/**
 * Set a user's role in a `profiles` table. This is the recommended approach: store user
 * roles in a dedicated table and use RLS policies and server-side admin keys to perform
 * role assignment in production.
 *
 * Example usage (server-side):
 * await setUserRoleInProfiles(user.id, 'admin')
 */
export async function setUserRoleInProfiles(userId: string, role: string) {
  if (!userId) { throw new Error('userId required to set role') }
  const upsertResult = await supabase
    .from('profiles')
    .upsert({ id: userId, role }, { onConflict: 'id' })
  if (upsertResult.error) { throw upsertResult.error }
  return true
}

/**
 * Update the currently signed-in user's metadata role field.
 * Note: This updates user_metadata and may not affect app-level role claims used by RLS.
 * Prefer using a server-side 'profiles' table or server function to grant roles.
 */
export async function updateCurrentUserRole(role: string) {
  // The 'updateUser' API is used to modify metadata for the currently signed-in user
  const updateRes = await supabase.auth.updateUser({ data: { role } })
  if (updateRes.error) { throw updateRes.error }
  return updateRes.data
}
