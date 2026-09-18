import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";

type Client = SupabaseClient<Database>;

/**
 * Real connection state for the Integrations dashboard. Single-college
 * deployment (one instance per college) — no tenant scoping. Only reflects
 * what actually exists today: website lead-capture keys and whether the
 * WhatsApp transport has credentials. Meta Lead Ads / CSV are not wired yet
 * and are shown as such rather than faked.
 */
export async function getIntegrationStatuses(supabase: Client) {
  const { count } = await supabase
    .from("api_keys")
    .select("*", { count: "exact", head: true })
    .eq("is_active", true);
  return { activeWebsiteKeys: count ?? 0 };
}
