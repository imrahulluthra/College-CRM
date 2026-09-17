import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database, LeadStatus } from "@/types/database";

type Client = SupabaseClient<Database>;

export interface LeadListFilters {
  q?: string;
  status?: LeadStatus;
  sourceId?: string;
  programId?: string;
  counselorId?: string;
  page: number;
}

export const LEADS_PAGE_SIZE = 25;

export async function getLeadsList(supabase: Client, filters: LeadListFilters) {
  let query = supabase
    .from("leads")
    .select(
      "id, full_name, phone, email, status, created_at, program_id, source_id, assigned_counselor_id",
      { count: "exact" }
    )
    .order("created_at", { ascending: false });

  if (filters.q) {
    const term = filters.q.trim();
    if (term) {
      query = query.or(
        `full_name.ilike.%${escapeLike(term)}%,phone.ilike.%${escapeLike(term)}%,email.ilike.%${escapeLike(term)}%`
      );
    }
  }
  if (filters.status) query = query.eq("status", filters.status);
  if (filters.sourceId) query = query.eq("source_id", filters.sourceId);
  if (filters.programId) query = query.eq("program_id", filters.programId);
  if (filters.counselorId === "unassigned") {
    query = query.is("assigned_counselor_id", null);
  } else if (filters.counselorId) {
    query = query.eq("assigned_counselor_id", filters.counselorId);
  }

  const from = (filters.page - 1) * LEADS_PAGE_SIZE;
  const to = from + LEADS_PAGE_SIZE - 1;
  query = query.range(from, to);

  const { data, count } = await query;
  return { leads: data ?? [], total: count ?? 0 };
}

// PostgREST `.or()`/`.ilike()` treat `%`, `,`, and `*` specially in the
// filter string itself -- escape them so a search term containing one
// doesn't get interpreted as filter syntax or an unintended wildcard.
function escapeLike(term: string) {
  return term.replace(/[%,*]/g, (c) => `\\${c}`);
}
