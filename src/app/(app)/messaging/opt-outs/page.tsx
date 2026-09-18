import Link from "next/link";

import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getSuppressions } from "@/features/messaging/data";
import { OptOutToggle } from "@/features/messaging/opt-out-toggle";

export default async function OptOutsPage() {
  await requireStaff(["super_admin", "admissions_manager"]);
  const supabase = await createClient();
  const rows = await getSuppressions(supabase);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Opt-outs</h1>
        <p className="text-sm text-muted-foreground">
          Leads suppressed from messaging. The send service skips everyone here — campaigns,
          replies, and automations alike. Opt a lead out from their conversation.
        </p>
      </div>

      <Card>
        <CardContent>
          {rows.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">
              No one has opted out.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Lead</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Since</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">
                      <Link href={`/leads/${r.leadId}`} className="hover:underline">
                        {r.name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{r.phone}</TableCell>
                    <TableCell className="capitalize">{r.reason.replace(/_/g, " ")}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(r.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <OptOutToggle leadId={r.leadId} suppressed />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
