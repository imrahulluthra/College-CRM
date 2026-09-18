import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getActivePrograms, getCounselors } from "@/features/leads/lookups";
import { getSegments } from "@/features/messaging/data";
import { SegmentForm } from "@/features/messaging/segment-form";
import { leadStatusLabel } from "@/features/leads/status";

export default async function SegmentsPage() {
  await requireStaff(["super_admin", "admissions_manager"]);
  const supabase = await createClient();
  const [segments, programs, counselors] = await Promise.all([
    getSegments(supabase),
    getActivePrograms(supabase),
    getCounselors(supabase),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Segments</h1>
          <p className="text-sm text-muted-foreground">
            Saved audiences — a live filter over leads that campaigns broadcast to.
          </p>
        </div>
        <SegmentForm
          programs={programs}
          counselors={counselors.map((c) => ({ id: c.id, name: c.full_name }))}
        />
      </div>

      {segments.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            No segments yet. Create one to target a campaign.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {segments.map((s) => (
            <Card key={s.id}>
              <CardContent className="flex flex-col gap-3 py-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">{s.name}</p>
                    {s.description && (
                      <p className="text-sm text-muted-foreground">{s.description}</p>
                    )}
                  </div>
                  <Badge variant="secondary" className="shrink-0 tabular-nums">
                    {s.count} {s.count === 1 ? "lead" : "leads"}
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {(s.definition.statuses ?? []).map((st) => (
                    <Badge key={st} variant="outline">
                      {leadStatusLabel(st)}
                    </Badge>
                  ))}
                  {s.definition.city && <Badge variant="outline">City: {s.definition.city}</Badge>}
                  {!s.definition.statuses?.length &&
                    !s.definition.city &&
                    !s.definition.programId &&
                    !s.definition.counselorId && (
                      <span className="text-xs text-muted-foreground">All leads</span>
                    )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
