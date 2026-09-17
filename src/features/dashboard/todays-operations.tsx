import { AlertTriangle, Clock, FileWarning, PhoneOff, Sparkles, UserPlus } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { getTodaysOperations } from "./data";

export function TodaysOperations({
  ops,
}: {
  ops: Awaited<ReturnType<typeof getTodaysOperations>>;
}) {
  const items = [
    { label: "New leads today", value: ops.newToday, icon: Sparkles },
    { label: "Uncontacted leads", value: ops.uncontacted, icon: PhoneOff },
    { label: "Follow-ups due today", value: ops.followUpsDueToday, icon: Clock },
    { label: "Overdue follow-ups", value: ops.overdueFollowUps, icon: AlertTriangle },
    { label: "Applications pending", value: ops.applicationsPending, icon: UserPlus },
    { label: "Documents pending", value: ops.documentsPending, icon: FileWarning },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Today&apos;s Operations</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {items.map((item) => (
          <div key={item.label} className="flex items-start gap-2">
            <item.icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <div>
              <p className="text-lg font-semibold tabular-nums leading-none">{item.value}</p>
              <p className="text-xs text-muted-foreground">{item.label}</p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
