import {
  BarChart3,
  FileCheck,
  GraduationCap,
  LayoutDashboard,
  Plug,
  Receipt,
  UserCog,
  Users,
  UsersRound,
  type LucideIcon,
} from "lucide-react";

import type { UserRole } from "@/types/database";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  roles?: UserRole[];
  section?: string;
}

const ADMIN = ["super_admin", "admissions_manager"] as const;
const REVIEW = ["super_admin", "admissions_manager", "document_reviewer"] as const;

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/leads", label: "Leads", icon: Users },

  { href: "/admissions", label: "Overview", icon: GraduationCap, roles: [...ADMIN], section: "Admissions" },
  { href: "/admissions/students", label: "Applicants", icon: UsersRound, roles: [...REVIEW], section: "Admissions" },
  { href: "/admissions/documents", label: "Document Review", icon: FileCheck, roles: [...REVIEW], section: "Admissions" },
  { href: "/admissions/payments", label: "Payments", icon: Receipt, roles: [...ADMIN], section: "Admissions" },
  { href: "/admissions/reports", label: "Reports", icon: BarChart3, roles: [...ADMIN], section: "Admissions" },

  { href: "/settings/users", label: "Users", icon: UserCog, roles: ["super_admin"], section: "Settings" },
  { href: "/settings/api-keys", label: "Website Integration", icon: Plug, roles: ["super_admin"], section: "Settings" },
];
