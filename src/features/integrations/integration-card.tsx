import Link from "next/link";
import type { LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type IntegrationStatus =
  | "connected"
  | "not_connected"
  | "action_required"
  | "coming_soon";

const STATUS: Record<IntegrationStatus, { label: string; pill: string; dot: string }> = {
  connected: {
    label: "Connected",
    pill: "bg-success/10 text-success ring-1 ring-inset ring-success/20",
    dot: "bg-success",
  },
  action_required: {
    label: "Action required",
    pill: "bg-warning/15 text-warning-foreground ring-1 ring-inset ring-warning/30",
    dot: "bg-warning",
  },
  not_connected: {
    label: "Not connected",
    pill: "bg-secondary text-secondary-foreground ring-1 ring-inset ring-border",
    dot: "bg-muted-foreground",
  },
  coming_soon: {
    label: "Coming soon",
    pill: "bg-muted text-muted-foreground ring-1 ring-inset ring-border",
    dot: "bg-muted-foreground",
  },
};

export interface IntegrationAction {
  label: string;
  href?: string;
  disabled?: boolean;
  variant?: "default" | "outline" | "ghost";
}

export function IntegrationCard({
  icon: Icon,
  name,
  description,
  status,
  detail,
  actions,
}: {
  icon: LucideIcon;
  name: string;
  description: string;
  status: IntegrationStatus;
  detail?: string;
  actions?: IntegrationAction[];
}) {
  const s = STATUS[status];
  return (
    <Card>
      <CardContent className="flex h-full flex-col gap-3 py-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-secondary text-foreground">
              <Icon className="size-5" />
            </div>
            <div>
              <p className="font-medium">{name}</p>
              <p className="text-sm text-muted-foreground">{description}</p>
            </div>
          </div>
          <span
            className={cn(
              "inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap",
              s.pill
            )}
          >
            <span className={cn("size-1.5 rounded-full", s.dot)} />
            {s.label}
          </span>
        </div>

        {detail && <p className="text-sm text-muted-foreground">{detail}</p>}

        {actions && actions.length > 0 && (
          <div className="mt-auto flex flex-wrap gap-2 pt-1">
            {actions.map((a) =>
              a.href && !a.disabled ? (
                <Button key={a.label} asChild size="sm" variant={a.variant ?? "outline"}>
                  <Link href={a.href}>{a.label}</Link>
                </Button>
              ) : (
                <Button key={a.label} size="sm" variant={a.variant ?? "outline"} disabled>
                  {a.label}
                </Button>
              )
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
