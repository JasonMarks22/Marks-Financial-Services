/**
 * Supabase client (browser-safe, singleton).
 *
 * This reads the project URL and public "anon" key from environment variables
 * and exports a single, configured Supabase client the rest of the app can
 * import:
 *
 *     import { supabase } from "@/lib/supabase/client";
 *
 * The two values come from `.env.local` (which is gitignored, so real
 * credentials never get committed). They are prefixed with `NEXT_PUBLIC_` so
 * Next.js exposes them to browser code — that is expected here: the anon key is
 * a *public* key meant for the client and is safe to ship, as long as you rely
 * on Supabase Row Level Security to protect your data. Never put your secret
 * `service_role` key in a `NEXT_PUBLIC_` variable.
 */

import { createClient } from "@supabase/supabase-js";

// Pull the connection settings from the environment.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Fail fast with a clear message if either variable is missing — this usually
// means `.env.local` hasn't been created or the dev server wasn't restarted.
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing Supabase environment variables. Set NEXT_PUBLIC_SUPABASE_URL and " +
      "NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local (see Supabase dashboard → " +
      "Project Settings → API), then restart the dev server.",
  );
}

// Export a single shared client instance for the whole app to reuse.
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
