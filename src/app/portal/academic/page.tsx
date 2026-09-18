import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireStudent } from "@/lib/auth";
import { COLLEGE_NAME } from "@/lib/config";
import { createClient } from "@/lib/supabase/server";
import { getMyApplication, getMyProfile } from "@/features/portal/data";
import { PageHeader } from "@/features/portal/page-header";

function Field({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value === null || value === undefined || value === "" ? "—" : value}</p>
    </div>
  );
}

export default async function AcademicPage() {
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

  const [profile, program, cycle] = await Promise.all([
    getMyProfile(supabase, application.id),
    application.program_id
      ? supabase.from("programs").select("name, degree_level").eq("id", application.program_id).maybeSingle()
      : Promise.resolve({ data: null }),
    application.admission_cycle_id
      ? supabase.from("admission_cycles").select("name").eq("id", application.admission_cycle_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Academic Details" description="Your programme and qualification details." />

      <Card>
        <CardHeader>
          <CardTitle>Programme</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="College" value={COLLEGE_NAME} />
          <Field label="Course / Program" value={program.data?.name} />
          <Field label="Qualification level" value={program.data?.degree_level} />
          <Field label="Academic year" value={cycle.data?.name} />
          <Field label="Enrolment / Application ID" value={application.id.slice(0, 8).toUpperCase()} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Previous Qualifications</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="10th %" value={profile?.tenth_percentage} />
          <Field label="12th %" value={profile?.twelfth_percentage} />
          <Field label="Graduation %" value={profile?.graduation_percentage} />
          <Field label="Entrance exam" value={profile?.entrance_exam} />
          <Field label="Entrance score" value={profile?.entrance_score} />
        </CardContent>
      </Card>
    </div>
  );
}
