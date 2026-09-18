import { GraduationCap } from "lucide-react";

import { requireStudent } from "@/lib/auth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { PortalSidebarNav } from "@/features/portal/sidebar-nav";
import { LogoutButton } from "@/app/(app)/logout-button";
import { MobileSidebar } from "./mobile-sidebar";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const user = await requireStudent();
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
            <p className="text-sm font-semibold">Student Portal</p>
            <p className="text-xs text-muted-foreground">Admissions</p>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          <PortalSidebarNav />
        </div>
        <div className="mt-2 flex items-center gap-3 rounded-lg border bg-secondary/40 p-2.5">
          <Avatar>
            <AvatarFallback className="bg-primary/10 text-primary">{initials}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{user.fullName}</p>
            <p className="truncate text-xs text-muted-foreground">Student</p>
          </div>
        </div>
        <div className="mt-1">
          <LogoutButton />
        </div>
      </aside>

      <main className="min-w-0 flex-1 overflow-x-hidden md:pl-64">
        <div className="sticky top-0 z-20 flex items-center justify-between border-b bg-background/80 px-3 py-2.5 backdrop-blur md:hidden">
          <div className="flex items-center gap-2">
            <MobileSidebar />
            <div className="flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <GraduationCap className="size-4" />
              </div>
              <span className="font-semibold">Student Portal</span>
            </div>
          </div>
          <LogoutButton />
        </div>
        <div className="mx-auto w-full max-w-5xl p-4 md:p-8">{children}</div>
      </main>
    </div>
  );
}
