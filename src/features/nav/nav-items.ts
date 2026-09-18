import {
  BarChart3,
  FileCheck,
  FileText,
  GraduationCap,
  LayoutDashboard,
  Megaphone,
  MessageSquare,
  Plug,
  Receipt,
  ShieldOff,
  UserCog,
  Users,
  UsersRound,
  Workflow,
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
const STAFF = ["super_admin", "admissions_manager", "counselor", "document_reviewer"] as const;

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/leads", label: "Leads", icon: Users },

  { href: "/admissions", label: "Overview", icon: GraduationCap, roles: [...ADMIN], section: "Admissions" },
  { href: "/admissions/students", label: "Applicants", icon: UsersRound, roles: [...REVIEW], section: "Admissions" },
  { href: "/admissions/documents", label: "Document Review", icon: FileCheck, roles: [...REVIEW], section: "Admissions" },
  { href: "/admissions/payments", label: "Payments", icon: Receipt, roles: [...ADMIN], section: "Admissions" },
  { href: "/admissions/reports", label: "Reports", icon: BarChart3, roles: [...ADMIN], section: "Admissions" },

  { href: "/messaging", label: "Inbox", icon: MessageSquare, roles: [...STAFF], section: "Communications" },
  { href: "/messaging/templates", label: "Templates", icon: FileText, roles: [...ADMIN], section: "Communications" },
  { href: "/messaging/segments", label: "Segments", icon: UsersRound, roles: [...ADMIN], section: "Communications" },
  { href: "/messaging/campaigns", label: "Campaigns", icon: Megaphone, roles: [...ADMIN], section: "Communications" },
  { href: "/messaging/automation", label: "Automation", icon: Workflow, roles: [...ADMIN], section: "Communications" },
  { href: "/messaging/opt-outs", label: "Opt-outs", icon: ShieldOff, roles: [...ADMIN], section: "Communications" },

  { href: "/integrations", label: "Integrations", icon: Plug, roles: ["super_admin"], section: "Settings" },
  { href: "/settings/users", label: "Users", icon: UserCog, roles: ["super_admin"], section: "Settings" },
];
