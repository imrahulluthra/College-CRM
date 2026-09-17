import { AlertTriangle, Clock, FileWarning, PhoneOff, Sparkles, UserPlus } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { getTodaysOperations } from "./data";

export function TodaysOperations({
  ops,
}: {
  ops: Awaited<ReturnType<typeof getTodaysOperations>>;
}) {
  const items = [
    { label: "New leads today", value: ops.newToday, icon: Sparkles, urgent: false },
    { label: "Uncontacted leads", value: ops.uncontacted, icon: PhoneOff, urgent: ops.uncontacted > 0 },
    { label: "Follow-ups due today", value: ops.followUpsDueToday, icon: Clock, urgent: false },
    { label: "Overdue follow-ups", value: ops.overdueFollowUps, icon: AlertTriangle, urgent: ops.overdueFollowUps > 0 },
    { label: "Applications pending", value: ops.applicationsPending, icon: UserPlus, urgent: false },
    { label: "Documents pending", value: ops.documentsPending, icon: FileWarning, urgent: false },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Today&apos;s Operations</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {items.map((item) => (
          <div
            key={item.label}
            className={cn(
              "flex items-start gap-3 rounded-lg border p-3 transition-colors",
              item.urgent ? "border-destructive/30 bg-destructive/5" : "bg-secondary/30"
            )}
          >
            <span
              className={cn(
                "flex size-8 shrink-0 items-center justify-center rounded-md",
                item.urgent ? "bg-destructive/10 text-destructive" : "bg-background text-muted-foreground"
              )}
            >
              <item.icon className="size-4" />
            </span>
            <div className="min-w-0">
              <p
                className={cn(
                  "text-lg font-semibold tabular-nums leading-none",
                  item.urgent && "text-destructive"
                )}
              >
                {item.value}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{item.label}</p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
