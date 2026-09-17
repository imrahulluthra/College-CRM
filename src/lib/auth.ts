import "server-only";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/types/database";

export interface CurrentUser {
  id: string;
  email: string;
  fullName: string;
  roles: UserRole[];
}

/** Signed-in user + their roles, or null if there's no session. Never throws. */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const [{ data: profile }, { data: roleRows }] = await Promise.all([
    supabase.from("profiles").select("full_name, email").eq("id", user.id).single(),
    supabase.from("user_roles").select("role").eq("user_id", user.id),
  ]);

  return {
    id: user.id,
    email: profile?.email ?? user.email ?? "",
    fullName: profile?.full_name ?? user.email ?? "Unknown",
    roles: (roleRows ?? []).map((r) => r.role),
  };
}

/** Redirects to /login if signed out, or to /dashboard (with no throw) if signed in but lacking every allowed role. */
export async function requireUser(allowedRoles?: UserRole[]): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  if (allowedRoles && !user.roles.some((r) => allowedRoles.includes(r))) {
    redirect("/dashboard");
  }

  return user;
}

export function isStudent(user: CurrentUser) {
  return user.roles.includes("student");
}

export function isStaff(user: CurrentUser) {
  return user.roles.some((r) => r !== "student");
}

/** Landing route for a user based on role (students → portal, staff → dashboard). */
export function homePathFor(user: CurrentUser) {
  return isStaff(user) ? "/dashboard" : "/portal";
}

/** Gate a staff-only area: signed-out → /login, students → /portal. */
export async function requireStaff(allowedRoles?: UserRole[]): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!isStaff(user)) redirect("/portal");
  if (allowedRoles && !user.roles.some((r) => allowedRoles.includes(r))) {
    redirect("/dashboard");
  }
  return user;
}

/** Gate the student portal: signed-out → /login, staff → /dashboard. */
export async function requireStudent(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!isStudent(user)) redirect("/dashboard");
  return user;
}

export function isAdminOrManager(user: CurrentUser) {
  return user.roles.includes("super_admin") || user.roles.includes("admissions_manager");
}

export function isSuperAdmin(user: CurrentUser) {
  return user.roles.includes("super_admin");
}
