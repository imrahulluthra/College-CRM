import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { requireStudent } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getMyApplication, getMyDocuments } from "@/features/portal/data";
import { DocumentItem, type DocRow } from "./document-item";

export default async function DocumentsPage() {
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

  const docs = await getMyDocuments(supabase, application.id);
  const rows: DocRow[] = docs.map(({ type, doc }) => ({
    typeId: type.id,
    name: type.name,
    required: type.is_required,
    docId: doc?.id ?? null,
    status: doc?.status ?? null,
    fileName: doc?.file_name ?? null,
    rejectionReason: doc?.rejection_reason ?? null,
  }));

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Documents</h1>
        <p className="text-sm text-muted-foreground">
          PDF, JPG, or PNG, up to 5 MB each. <span className="text-destructive">*</span> required.
        </p>
      </div>
      <div className="flex flex-col gap-3">
        {rows.map((row) => (
          <DocumentItem key={row.typeId} row={row} />
        ))}
      </div>

      <div className="flex items-center justify-between gap-2 border-t pt-4">
        <Button asChild variant="outline">
          <Link href="/portal/application">
            <ArrowLeft /> Back
          </Link>
        </Button>
        <Button asChild>
          <Link href="/portal/fees">
            Next <ArrowRight />
          </Link>
        </Button>
      </div>
    </div>
  );
}
