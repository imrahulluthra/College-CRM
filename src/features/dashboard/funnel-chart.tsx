import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { getFunnel } from "./data";

export function FunnelChart({ funnel }: { funnel: Awaited<ReturnType<typeof getFunnel>> }) {
  const max = Math.max(1, ...funnel.map((s) => s.count));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Admission Funnel</CardTitle>
        <CardDescription>Leads that have ever reached each stage.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {funnel.map((stage, i) => {
          const prev = i > 0 ? funnel[i - 1].count : null;
          const dropoff = prev && prev > 0 ? Math.round(((prev - stage.count) / prev) * 100) : null;
          const width = Math.max(2, Math.round((stage.count / max) * 100));

          return (
            <div key={stage.status} className="flex flex-col gap-1">
              <div className="flex items-baseline justify-between text-sm">
                <span className="font-medium">{stage.label}</span>
                <span className="flex items-baseline gap-2">
                  {dropoff != null && dropoff > 0 && (
                    <span className="text-xs text-muted-foreground">−{dropoff}%</span>
                  )}
                  <span className="tabular-nums font-semibold">{stage.count}</span>
                </span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-primary/70 to-primary transition-all"
                  style={{ width: `${width}%` }}
                />
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
