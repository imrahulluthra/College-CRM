import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

import type { Database } from "@/types/database";
import { getSupabaseAnonKey, getSupabaseUrl } from "./env";

// Server-side client that reads/writes the session cookie for the signed-in
// user. Every query through this client goes through RLS as that user --
// this is what actually enforces role-based access, not the UI.
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(getSupabaseUrl(), getSupabaseAnonKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Called from a Server Component render, where cookies can't be
          // set. Harmless as long as proxy.ts is also refreshing the
          // session on every request (it is -- see src/proxy.ts).
        }
      },
    },
  });
}
