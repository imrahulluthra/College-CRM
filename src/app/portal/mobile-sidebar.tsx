"use client";

import { useState } from "react";
import { GraduationCap, Menu } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { PortalSidebarNav } from "@/features/portal/sidebar-nav";
import { LogoutButton } from "@/app/(app)/logout-button";

export function MobileSidebar() {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Open menu">
          <Menu className="size-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="overflow-y-auto">
        <SheetTitle className="sr-only">Student menu</SheetTitle>
        <div className="mb-4 flex items-center gap-2.5">
          <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
            <GraduationCap className="size-5" />
          </div>
          <div className="leading-tight">
            <p className="text-sm font-semibold">Student Portal</p>
          </div>
        </div>
        <PortalSidebarNav onNavigate={() => setOpen(false)} />
        <div className="mt-auto border-t pt-2">
          <LogoutButton />
        </div>
      </SheetContent>
    </Sheet>
  );
}
