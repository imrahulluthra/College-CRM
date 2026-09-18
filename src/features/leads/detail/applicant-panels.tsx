import type { SupabaseClient } from "@supabase/supabase-js";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TabsContent } from "@/components/ui/tabs";
import { getMyDocuments, getMyPayment, getMyProfile } from "@/features/portal/data";
import {
  applicationStatusLabel,
  applicationStatusVariant,
} from "@/features/portal/application-status";
import type { Database } from "@/types/database";
import { ApplicationStatusControl } from "@/features/admissions/application-status-control";
import { ConvertApplicantButton } from "./convert-applicant";
import { DocumentsReview, type ReviewRow } from "./documents-review";

type Client = SupabaseClient<Database>;
type Application = Database["public"]["Tables"]["applications"]["Row"];

function NotConverted({ leadId, hasEmail }: { leadId: string; hasEmail: boolean }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
        <p className="text-sm text-muted-foreground">
          This lead hasn&apos;t been converted to an applicant yet.
        </p>
        {hasEmail ? (
          <ConvertApplicantButton leadId={leadId} />
        ) : (
          <p className="text-xs text-muted-foreground">Add an email to the lead to convert it.</p>
        )}
      </CardContent>
    </Card>
  );
}

function Row({ label, value }: { label: string; value: string | number | null }) {
  return (
    <div className="flex justify-between gap-4 py-1.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value === null || value === "" ? "—" : value}</span>
    </div>
  );
}

export async function ApplicantPanels({
  supabase,
  leadId,
  application,
  leadHasEmail,
  canManageAdmission = false,
}: {
  supabase: Client;
  leadId: string;
  application: Application | null;
  leadHasEmail: boolean;
  canManageAdmission?: boolean;
}) {
  if (!application) {
    return (
      <>
        <TabsContent value="application" className="mt-4">
          <NotConverted leadId={leadId} hasEmail={leadHasEmail} />
        </TabsContent>
        <TabsContent value="documents" className="mt-4">
          <NotConverted leadId={leadId} hasEmail={leadHasEmail} />
        </TabsContent>
      </>
    );
  }

  const [profile, payment, docs] = await Promise.all([
    getMyProfile(supabase, application.id),
    getMyPayment(supabase, application.id),
    getMyDocuments(supabase, application.id),
  ]);

  const reviewRows: ReviewRow[] = docs.map(({ type, doc }) => ({
    typeName: type.name,
    required: type.is_required,
    docId: doc?.id ?? null,
    status: doc?.status ?? null,
    fileName: doc?.file_name ?? null,
  }));

  return (
    <>
      <TabsContent value="application" className="mt-4">
        <Card>
          <CardHeader className="flex-row items-center justify-between gap-2">
            <CardTitle>Application</CardTitle>
            {canManageAdmission ? (
              <ApplicationStatusControl
                applicationId={application.id}
                leadId={leadId}
                status={application.status}
              />
            ) : (
              <Badge variant={applicationStatusVariant(application.status)}>
                {applicationStatusLabel(application.status)}
              </Badge>
            )}
          </CardHeader>
          <CardContent className="divide-y">
            <Row
              label="Submitted"
              value={application.submitted_at ? new Date(application.submitted_at).toLocaleString() : "Not submitted"}
            />
            <Row label="Date of birth" value={profile?.date_of_birth ?? null} />
            <Row label="Guardian" value={profile?.guardian_name ?? null} />
            <Row label="Guardian phone" value={profile?.guardian_phone ?? null} />
            <Row label="10th %" value={profile?.tenth_percentage ?? null} />
            <Row label="12th %" value={profile?.twelfth_percentage ?? null} />
            <Row label="Graduation %" value={profile?.graduation_percentage ?? null} />
            <Row label="Entrance exam" value={profile?.entrance_exam ?? null} />
            {payment && (
              <Row
                label="Fee"
                value={`₹${Number(payment.amount_paid).toLocaleString("en-IN")} / ₹${Number(payment.amount_total).toLocaleString("en-IN")} (${payment.status})`}
              />
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="documents" className="mt-4">
        <Card>
          <CardContent>
            <DocumentsReview rows={reviewRows} leadId={leadId} />
          </CardContent>
        </Card>
      </TabsContent>
    </>
  );
}
