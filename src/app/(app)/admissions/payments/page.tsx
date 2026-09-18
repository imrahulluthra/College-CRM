import Link from "next/link";

import { Badge } from "@/components/ui/badge";
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
import { getPaymentsOverview } from "@/features/admissions/data";
import { RecordPayment } from "@/features/admissions/record-payment";

function statusVariant(status: string): "secondary" | "success" | "destructive" {
  if (status === "PAID") return "success";
  if (status === "PARTIAL") return "secondary";
  return "destructive";
}

export default async function PaymentsPage() {
  await requireStaff(["super_admin", "admissions_manager"]);
  const supabase = await createClient();
  const rows = await getPaymentsOverview(supabase);

  const totals = rows.reduce(
    (acc, r) => {
      acc.total += r.total;
      acc.paid += r.paid;
      return acc;
    },
    { total: 0, paid: 0 }
  );
  const outstanding = totals.total - totals.paid;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Payments</h1>
        <p className="text-sm text-muted-foreground">
          Fee records across all applicants. Record offline payments as they come in.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="py-4">
            <p className="text-sm text-muted-foreground">Total billed</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">
              ₹{totals.total.toLocaleString("en-IN")}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-sm text-muted-foreground">Collected</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-success">
              ₹{totals.paid.toLocaleString("en-IN")}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-sm text-muted-foreground">Outstanding</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">
              ₹{outstanding.toLocaleString("en-IN")}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent>
          {rows.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No payments yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Applicant</TableHead>
                  <TableHead>Fee</TableHead>
                  <TableHead className="text-right">Paid</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Due</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.paymentId}>
                    <TableCell className="font-medium">
                      <Link href={`/leads/${r.leadId}`} className="hover:underline">
                        {r.applicantName}
                      </Link>
                    </TableCell>
                    <TableCell>{r.label}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      ₹{r.paid.toLocaleString("en-IN")}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      ₹{r.total.toLocaleString("en-IN")}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(r.status)}>
                        {r.status[0] + r.status.slice(1).toLowerCase()}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {r.dueDate ? new Date(r.dueDate).toLocaleDateString() : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <RecordPayment row={r} />
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
