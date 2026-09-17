import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireStudent } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getMyApplication, getMyProfile } from "@/features/portal/data";
import {
  applicationStatusLabel,
  applicationStatusVariant,
} from "@/features/portal/application-status";
import { ApplicationForm } from "./application-form";

function Row({ label, value }: { label: string; value: string | number | null }) {
  return (
    <div className="flex justify-between gap-4 py-1.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value === null || value === "" ? "—" : value}</span>
    </div>
  );
}

export default async function ApplicationPage() {
  const user = await requireStudent();
  const supabase = await createClient();
  const application = await getMyApplication(supabase, user.id);
  if (!application) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          No application found.
        </CardContent>
      </Card>
    );
  }
  const profile = await getMyProfile(supabase, application.id);
  const isDraft = application.status === "DRAFT";

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">My Application</h1>
          <p className="text-sm text-muted-foreground">
            ID {application.id.slice(0, 8).toUpperCase()}
          </p>
        </div>
        <Badge variant={applicationStatusVariant(application.status)}>
          {applicationStatusLabel(application.status)}
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{isDraft ? "Complete your details" : "Submitted details"}</CardTitle>
        </CardHeader>
        <CardContent>
          {isDraft && profile ? (
            <ApplicationForm profile={profile} />
          ) : (
            <div className="divide-y">
              <Row label="Date of birth" value={profile?.date_of_birth ?? null} />
              <Row label="Gender" value={profile?.gender ?? null} />
              <Row label="Address" value={profile?.address ?? null} />
              <Row label="City" value={profile?.city ?? null} />
              <Row label="State" value={profile?.state ?? null} />
              <Row label="Guardian name" value={profile?.guardian_name ?? null} />
              <Row label="Guardian phone" value={profile?.guardian_phone ?? null} />
              <Row label="10th %" value={profile?.tenth_percentage ?? null} />
              <Row label="12th %" value={profile?.twelfth_percentage ?? null} />
              <Row label="Graduation %" value={profile?.graduation_percentage ?? null} />
              <Row label="Entrance exam" value={profile?.entrance_exam ?? null} />
              <Row label="Entrance score" value={profile?.entrance_score ?? null} />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
