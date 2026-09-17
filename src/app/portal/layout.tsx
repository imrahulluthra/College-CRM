import { GraduationCap } from "lucide-react";

import { requireStudent } from "@/lib/auth";
import { LogoutButton } from "@/app/(app)/logout-button";
import { PortalNav } from "./nav";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const user = await requireStudent();

  return (
    <div className="flex min-h-svh flex-col">
      <header className="sticky top-0 z-20 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
              <GraduationCap className="size-5" />
            </div>
            <div className="leading-tight">
              <p className="text-sm font-semibold">Student Portal</p>
              <p className="text-xs text-muted-foreground">{user.fullName}</p>
            </div>
          </div>
          <LogoutButton />
        </div>
        <div className="mx-auto w-full max-w-3xl px-4 pb-2">
          <PortalNav />
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 p-4 md:p-6">{children}</main>
    </div>
  );
}
