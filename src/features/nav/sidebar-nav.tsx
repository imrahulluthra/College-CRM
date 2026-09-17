"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";
import type { UserRole } from "@/types/database";
import { NAV_ITEMS } from "./nav-items";

export function SidebarNav({ roles }: { roles: UserRole[] }) {
  const pathname = usePathname();
  const items = NAV_ITEMS.filter(
    (item) => !item.roles || item.roles.some((r) => roles.includes(r))
  );

  return (
    <nav className="flex flex-col gap-0.5">
      {items.map((item, i) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icon = item.icon;
        const showSection = item.section && item.section !== items[i - 1]?.section;

        return (
          <div key={item.href}>
            {showSection && (
              <p className="mt-4 mb-1 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground/70">
                {item.section}
              </p>
            )}
            <Link
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "group flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              )}
            >
              <Icon
                className={cn(
                  "size-4 shrink-0 transition-colors",
                  active ? "text-primary" : "text-muted-foreground/70 group-hover:text-foreground"
                )}
              />
              {item.label}
            </Link>
          </div>
        );
      })}
    </nav>
  );
}
