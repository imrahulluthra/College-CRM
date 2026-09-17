import { GraduationCap } from "lucide-react";

import { requireStaff } from "@/lib/auth";
import { ROLE_LABELS } from "@/lib/permissions";
import { SidebarNav } from "@/features/nav/sidebar-nav";
import { MobileNav } from "@/features/nav/mobile-nav";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { LogoutButton } from "./logout-button";

// Next's route-group layouts (this one covers /dashboard, /leads, /settings/*)
// don't get their own entry in the generated LayoutRoutes union -- only the
// root layout does -- so this is typed by hand instead of LayoutProps<...>.
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireStaff();
  const initials = user.fullName
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="flex min-h-svh w-full">
      <aside className="fixed inset-y-0 left-0 hidden w-64 shrink-0 flex-col border-r bg-card p-4 md:flex">
        <div className="mb-6 flex items-center gap-2.5 px-2 pt-1">
          <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
            <GraduationCap className="size-5" />
          </div>
          <div className="leading-tight">
            <p className="text-sm font-semibold">College CRM</p>
            <p className="text-xs text-muted-foreground">Admissions</p>
          </div>
        </div>
        <SidebarNav roles={user.roles} />
        <div className="mt-auto flex items-center gap-3 rounded-lg border bg-secondary/40 p-2.5">
          <Avatar>
            <AvatarFallback className="bg-primary/10 text-primary">{initials}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{user.fullName}</p>
            <p className="truncate text-xs text-muted-foreground">
              {user.roles.map((r) => ROLE_LABELS[r]).join(", ") || "No role assigned"}
            </p>
          </div>
        </div>
        <div className="mt-1">
          <LogoutButton />
        </div>
      </aside>
      <main className="min-w-0 flex-1 overflow-x-hidden md:pl-64">
        <div className="sticky top-0 z-20 flex items-center justify-between border-b bg-background/80 px-4 py-3 backdrop-blur md:hidden">
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <GraduationCap className="size-4" />
            </div>
            <span className="font-semibold">College CRM</span>
          </div>
          <LogoutButton />
        </div>
        <MobileNav roles={user.roles} />
        <div className="mx-auto w-full max-w-6xl p-4 md:p-8">{children}</div>
      </main>
    </div>
  );
}
