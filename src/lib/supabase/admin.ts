import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";
import { getSupabaseServiceRoleKey, getSupabaseUrl } from "./env";

// Service-role client: bypasses RLS entirely. Only ever import this from
// server actions, route handlers, or server-only scripts -- never from a
// Client Component, and never send this key to the browser. Used for: the
// public /api/leads capture endpoint (no user session exists yet), and
// super-admin user provisioning (auth.admin.createUser).
export function createAdminClient() {
  return createSupabaseClient<Database>(getSupabaseUrl(), getSupabaseServiceRoleKey(), {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
