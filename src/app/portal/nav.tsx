"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FileText, LayoutDashboard, Receipt, Upload } from "lucide-react";

import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/portal", label: "Overview", icon: LayoutDashboard },
  { href: "/portal/application", label: "My Application", icon: FileText },
  { href: "/portal/documents", label: "Documents", icon: Upload },
  { href: "/portal/fees", label: "Fees", icon: Receipt },
];

export function PortalNav() {
  const pathname = usePathname();
  return (
    <nav className="flex gap-1 overflow-x-auto">
      {ITEMS.map((item) => {
        const active = pathname === item.href;
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-secondary"
            )}
          >
            <Icon className="size-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
