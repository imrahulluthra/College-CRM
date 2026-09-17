import type { UserRole } from "@/types/database";

export interface NavItem {
  href: string;
  label: string;
  roles?: UserRole[];
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/leads", label: "Leads" },
  {
    href: "/settings/users",
    label: "Users",
    roles: ["super_admin"],
  },
  {
    href: "/settings/api-keys",
    label: "Website Integration",
    roles: ["super_admin"],
  },
];
