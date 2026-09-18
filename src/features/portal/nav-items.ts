import {
  Bell,
  BookOpen,
  CalendarCheck,
  CalendarDays,
  ClipboardList,
  FileText,
  FolderOpen,
  GraduationCap,
  LayoutDashboard,
  LifeBuoy,
  ListChecks,
  Receipt,
  Settings,
  User,
  type LucideIcon,
} from "lucide-react";

export interface PortalNavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  section?: string;
  /** Module whose data/functionality isn't wired yet — surfaced honestly, not faked. */
  soon?: boolean;
}

export const PORTAL_NAV: PortalNavItem[] = [
  { href: "/portal", label: "Dashboard", icon: LayoutDashboard },

  { href: "/portal/application", label: "My Application", icon: FileText, section: "Application" },
  { href: "/portal/documents", label: "Documents", icon: FolderOpen, section: "Application" },
  { href: "/portal/fees", label: "Fee Details", icon: Receipt, section: "Application" },
  { href: "/portal/application-status", label: "Application Status", icon: ListChecks, section: "Application" },

  { href: "/portal/academic", label: "Academic Details", icon: GraduationCap, section: "Academics" },
  { href: "/portal/attendance", label: "Attendance", icon: CalendarCheck, section: "Academics", soon: true },
  { href: "/portal/assignments", label: "Assignments", icon: ClipboardList, section: "Academics", soon: true },
  { href: "/portal/syllabus", label: "Syllabus", icon: BookOpen, section: "Academics", soon: true },
  { href: "/portal/holidays", label: "Holidays", icon: CalendarDays, section: "Academics", soon: true },

  { href: "/portal/profile", label: "My Profile", icon: User, section: "Account" },
  { href: "/portal/notifications", label: "Notifications", icon: Bell, section: "Account", soon: true },
  { href: "/portal/tickets", label: "Raise a Ticket", icon: LifeBuoy, section: "Account", soon: true },
  { href: "/portal/settings", label: "Settings", icon: Settings, section: "Account", soon: true },
];
