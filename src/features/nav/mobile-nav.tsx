"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";
import type { UserRole } from "@/types/database";
import { NAV_ITEMS } from "./nav-items";

export function MobileNav({ roles }: { roles: UserRole[] }) {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1 overflow-x-auto border-b bg-background px-2 py-2 md:hidden">
      {NAV_ITEMS.filter((item) => !item.roles || item.roles.some((r) => roles.includes(r))).map(
        (item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "shrink-0 rounded-md px-3 py-1.5 text-sm font-medium",
                active
                  ? "bg-secondary text-secondary-foreground"
                  : "text-muted-foreground hover:bg-secondary/60"
              )}
            >
              {item.label}
            </Link>
          );
        }
      )}
    </nav>
  );
}
