import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireStudent } from "@/lib/auth";
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

export default async function ProfilePage() {
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

  const [profile, lead] = await Promise.all([
    getMyProfile(supabase, application.id),
    supabase.from("leads").select("full_name, phone, email").eq("id", application.lead_id).maybeSingle(),
  ]);

  const name = lead.data?.full_name ?? user.fullName;
  const initials = name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="My Profile" description="Your personal details from your application." />

      <Card>
        <CardContent className="flex items-center gap-4">
          <Avatar className="size-16 text-lg">
            <AvatarFallback className="bg-primary/10 text-primary">{initials}</AvatarFallback>
          </Avatar>
          <div>
            <p className="text-lg font-semibold">{name}</p>
            <p className="text-sm text-muted-foreground">{lead.data?.email ?? user.email}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Personal Details</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Full name" value={name} />
          <Field label="Date of birth" value={profile?.date_of_birth} />
          <Field label="Gender" value={profile?.gender} />
          <Field label="Email" value={lead.data?.email ?? user.email} />
          <Field label="Mobile number" value={lead.data?.phone} />
          <Field label="Address" value={profile?.address} />
          <Field label="City" value={profile?.city} />
          <Field label="State" value={profile?.state} />
          <Field label="Guardian name" value={profile?.guardian_name} />
          <Field label="Guardian phone" value={profile?.guardian_phone} />
        </CardContent>
      </Card>
    </div>
  );
}
