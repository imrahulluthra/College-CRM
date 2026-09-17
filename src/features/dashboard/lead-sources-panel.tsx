import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { getLeadSources } from "./data";

export function LeadSourcesPanel({
  sources,
}: {
  sources: Awaited<ReturnType<typeof getLeadSources>>;
}) {
  const total = sources.reduce((sum, s) => sum + s.lead_count, 0) || 1;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Lead Sources</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {sources.length === 0 && (
          <p className="text-sm text-muted-foreground">No leads yet.</p>
        )}
        {sources.map((s) => (
          <div key={s.source_name} className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-sm">
              <span>{s.source_name}</span>
              <span className="text-muted-foreground tabular-nums">{s.lead_count}</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${Math.round((s.lead_count / total) * 100)}%` }}
              />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
