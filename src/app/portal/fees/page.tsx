import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { requireStudent } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getMyApplication, getMyPayment } from "@/features/portal/data";
import { FeesActions } from "./fees-actions";

function inr(n: number) {
  return `₹${n.toLocaleString("en-IN")}`;
}

export default async function FeesPage() {
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

  const payment = await getMyPayment(supabase, application.id);
  const isSubmitted = application.status !== "DRAFT";

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-2xl font-semibold tracking-tight">Fees & Submit</h1>

      {payment ? (
        <FeeCard payment={payment} />
      ) : (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            No fee has been set for your application yet.
          </CardContent>
        </Card>
      )}

      <p className="text-center text-xs text-muted-foreground">
        Online payment is being set up. Please pay at the admissions office for now — the status
        here will update. You can submit your application below.
      </p>

      <FeesActions isSubmitted={isSubmitted} />
    </div>
  );
}

type Payment = NonNullable<Awaited<ReturnType<typeof getMyPayment>>>;

function FeeCard({ payment }: { payment: Payment }) {
  const pending = Number(payment.amount_total) - Number(payment.amount_paid);
  const variant =
    payment.status === "PAID" ? "success" : payment.status === "PARTIAL" ? "warning" : "secondary";

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>{payment.label}</CardTitle>
        <Badge variant={variant}>{payment.status[0] + payment.status.slice(1).toLowerCase()}</Badge>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Total fee</span>
          <span className="font-medium">{inr(Number(payment.amount_total))}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Paid</span>
          <span className="font-medium">{inr(Number(payment.amount_paid))}</span>
        </div>
        <div className="flex justify-between border-t pt-2 text-sm">
          <span className="text-muted-foreground">Pending</span>
          <span className="font-semibold">{inr(pending)}</span>
        </div>
        {payment.due_date && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Due date</span>
            <span className="font-medium">{new Date(payment.due_date).toLocaleDateString()}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
