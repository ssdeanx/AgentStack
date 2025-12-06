import { createClient } from "@supabase/supabase-js";

const supabase = createClient("<supabase-url>", "<supabase-key>");

const authTokenResponse = await supabase.auth.signInWithPassword({
  email: "<user's email>",
  password: "<user's password>",
});

const accessToken = authTokenResponse.data?.session?.access_token;
