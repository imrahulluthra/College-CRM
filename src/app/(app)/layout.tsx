import { GraduationCap } from "lucide-react";

import { requireUser } from "@/lib/auth";
import { ROLE_LABELS } from "@/lib/permissions";
import { SidebarNav } from "@/features/nav/sidebar-nav";
import { MobileNav } from "@/features/nav/mobile-nav";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { LogoutButton } from "./logout-button";

// Next's route-group layouts (this one covers /dashboard, /leads, /settings/*)
// don't get their own entry in the generated LayoutRoutes union -- only the
// root layout does -- so this is typed by hand instead of LayoutProps<...>.
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const initials = user.fullName
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="flex min-h-svh w-full">
      <aside className="hidden w-64 shrink-0 flex-col border-r bg-background p-4 md:flex">
        <div className="mb-6 flex items-center gap-2 px-2">
          <GraduationCap className="size-6" />
          <span className="font-semibold">College CRM</span>
        </div>
        <SidebarNav roles={user.roles} />
        <div className="mt-auto flex items-center gap-3 border-t pt-4">
          <Avatar>
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{user.fullName}</p>
            <p className="truncate text-xs text-muted-foreground">
              {user.roles.map((r) => ROLE_LABELS[r]).join(", ") || "No role assigned"}
            </p>
          </div>
        </div>
        <LogoutButton />
      </aside>
      <main className="min-w-0 flex-1 overflow-x-hidden">
        <div className="flex items-center justify-between border-b bg-background px-4 py-3 md:hidden">
          <div className="flex items-center gap-2">
            <GraduationCap className="size-5" />
            <span className="font-semibold">College CRM</span>
          </div>
          <LogoutButton />
        </div>
        <MobileNav roles={user.roles} />
        <div className="p-4 md:p-8">{children}</div>
      </main>
    </div>
  );
}
