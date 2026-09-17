/**
 * Mirrors supabase/migrations/*_leads.sql's public.normalize_phone(): strips
 * everything but digits and keeps the last 10 (bare Indian mobile number),
 * so "+91 98765-43210" and "9876543210" dedupe to the same lead. Used
 * application-side for the duplicate-detection lookup before insert; the DB
 * trigger is the source of truth and keeps existing rows correct too.
 */
export function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  return digits.length > 10 ? digits.slice(-10) : digits;
}
