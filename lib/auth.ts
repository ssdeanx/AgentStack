import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL ?? "https://your-project.supabase.co",
  process.env.SUPABASE_KEY ?? "anonymous-public-key"
);

const authTokenResponse = await supabase.auth.signInWithPassword({
  email: process.env.USER_EMAIL ?? 'admin@example.com',
  password: process.env.USER_PASSWORD ?? 'defaultPassword123',
});

const accessToken = authTokenResponse.data?.session?.access_token;
if (accessToken && accessToken !== '') {
  // eslint-disable-next-line no-console
  console.log('Signed in successfully.');
} else {
  // eslint-disable-next-line no-console
  console.error('Failed to retrieve access token during sign-in.');
}


const { data, error } = await supabase.auth.signInWithOAuth({
  provider: 'github'
});

if (error) {
  // eslint-disable-next-line no-console
  console.error('Error signing in with OAuth:', error);
} else {
  // eslint-disable-next-line no-console
  console.log('User signed in with OAuth:', data);
}

export default supabase;
