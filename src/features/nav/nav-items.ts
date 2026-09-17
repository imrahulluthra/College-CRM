import { LayoutDashboard, Users, UserCog, Plug, type LucideIcon } from "lucide-react";

import type { UserRole } from "@/types/database";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  roles?: UserRole[];
  section?: string;
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/leads", label: "Leads", icon: Users },
  {
    href: "/settings/users",
    label: "Users",
    icon: UserCog,
    roles: ["super_admin"],
    section: "Settings",
  },
  {
    href: "/settings/api-keys",
    label: "Website Integration",
    icon: Plug,
    roles: ["super_admin"],
    section: "Settings",
  },
];
