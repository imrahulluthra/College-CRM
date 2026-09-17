import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Database } from "@/types/database";

type Lead = Database["public"]["Tables"]["leads"]["Row"];

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="text-sm">{value || "—"}</p>
    </div>
  );
}

export function OverviewTab({
  lead,
  programName,
  admissionCycleName,
}: {
  lead: Lead;
  programName: string | null;
  admissionCycleName: string | null;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Contact</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <Field label="Full name" value={lead.full_name} />
          <Field label="Phone" value={lead.phone} />
          <Field label="Email" value={lead.email} />
          <Field label="City" value={lead.city} />
          <Field label="State" value={lead.state} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Admission</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <Field label="Program" value={programName} />
          <Field label="Admission cycle" value={admissionCycleName} />
          <Field label="Created" value={new Date(lead.created_at).toLocaleString()} />
          <Field label="Last activity" value={new Date(lead.last_activity_at).toLocaleString()} />
        </CardContent>
      </Card>

      <Card className="sm:col-span-2">
        <CardHeader>
          <CardTitle>Attribution</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Field label="Campaign" value={lead.campaign} />
          <Field label="UTM Source" value={lead.utm_source} />
          <Field label="UTM Medium" value={lead.utm_medium} />
          <Field label="UTM Campaign" value={lead.utm_campaign} />
          <Field label="UTM Content" value={lead.utm_content} />
          <Field label="UTM Term" value={lead.utm_term} />
          <Field label="Landing page" value={lead.landing_page} />
        </CardContent>
      </Card>
    </div>
  );
}
