import type { UserRole } from "@/types/database";

// Framework-agnostic role metadata shared by server pages and client
// components (nav visibility, badges, etc). Actual enforcement always
// happens server-side -- via RLS (supabase/migrations/*_rls_policies.sql)
// for data access, and requireUser() (src/lib/auth.ts) for page/route access.
// Nothing here should be trusted on its own.

export const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: "Super Admin",
  admissions_manager: "Admissions Manager",
  counselor: "Counselor",
  document_reviewer: "Document Reviewer",
  student: "Student",
};

export const STAFF_ROLES: UserRole[] = [
  "super_admin",
  "admissions_manager",
  "counselor",
  "document_reviewer",
];

export const ADMIN_ROLES: UserRole[] = ["super_admin", "admissions_manager"];

export function hasAnyRole(userRoles: UserRole[], allowed: UserRole[]) {
  return userRoles.some((r) => allowed.includes(r));
}
