"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";
import { PORTAL_NAV } from "./nav-items";

function isActive(pathname: string, href: string) {
  if (href === "/portal") return pathname === "/portal";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function PortalSidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-0.5">
      {PORTAL_NAV.map((item, i) => {
        const active = isActive(pathname, item.href);
        const Icon = item.icon;
        const showSection = item.section && item.section !== PORTAL_NAV[i - 1]?.section;

        return (
          <div key={item.href}>
            {showSection && (
              <p className="mt-4 mb-1 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground/70">
                {item.section}
              </p>
            )}
            <Link
              href={item.href}
              onClick={onNavigate}
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
              <span className="flex-1">{item.label}</span>
              {item.soon && (
                <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                  Soon
                </span>
              )}
            </Link>
          </div>
        );
      })}
    </nav>
  );
}
