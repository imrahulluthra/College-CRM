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
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-secondary"
              )}
            >
              <Icon className="size-4" />
              {item.label}
            </Link>
          );
        }
      )}
    </nav>
  );
}
