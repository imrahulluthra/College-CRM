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
import { isWhatsappConnected } from "@/lib/messaging/provider";
import { getNurtureRules, getTemplates } from "@/features/messaging/data";
import { NurtureRuleForm } from "@/features/messaging/nurture-rule-form";
import { RunNurtureButton, RuleToggle } from "@/features/messaging/nurture-controls";
import { ConnectionBanner } from "@/features/messaging/connection-banner";
import { leadStatusLabel } from "@/features/leads/status";

export default async function AutomationPage() {
  await requireStaff(["super_admin", "admissions_manager"]);
  const supabase = await createClient();
  const [rules, templates] = await Promise.all([
    getNurtureRules(supabase),
    getTemplates(supabase),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Automation</h1>
          <p className="text-sm text-muted-foreground">
            Rules that send a template when a lead is created or reaches a status. Each rule fires
            at most once per lead.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <RunNurtureButton />
          <NurtureRuleForm templates={templates.map((t) => ({ id: t.id, name: t.name }))} />
        </div>
      </div>

      <ConnectionBanner connected={isWhatsappConnected()} />

      <Card>
        <CardContent>
          {rules.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">
              No rules yet. Create one to message leads automatically.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rule</TableHead>
                  <TableHead>Trigger</TableHead>
                  <TableHead>Template</TableHead>
                  <TableHead>State</TableHead>
                  <TableHead className="text-right">Sent</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rules.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {r.trigger === "lead_created"
                        ? "Lead created"
                        : `Reaches ${r.to_status ? leadStatusLabel(r.to_status) : "—"}`}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{r.templateName ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant={r.is_active ? "success" : "secondary"}>
                        {r.is_active ? "Active" : "Paused"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{r.runCount}</TableCell>
                    <TableCell className="text-right">
                      <RuleToggle id={r.id} isActive={r.is_active} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Automations run when you press <span className="font-medium">Run now</span>; a scheduled
        worker can call the same idempotent evaluator so rules also fire on their own.
      </p>
    </div>
  );
}
