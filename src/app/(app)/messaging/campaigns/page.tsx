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
import { getCampaigns, getSegments, getTemplates } from "@/features/messaging/data";
import { CampaignForm } from "@/features/messaging/campaign-form";
import { SendCampaignButton } from "@/features/messaging/send-campaign-button";
import { ConnectionBanner } from "@/features/messaging/connection-banner";
import type { CampaignStatus } from "@/types/database";

function statusVariant(s: CampaignStatus): "secondary" | "success" | "warning" | "destructive" {
  if (s === "completed") return "success";
  if (s === "sending" || s === "scheduled") return "warning";
  if (s === "cancelled") return "destructive";
  return "secondary";
}

export default async function CampaignsPage() {
  await requireStaff(["super_admin", "admissions_manager"]);
  const supabase = await createClient();
  const [campaigns, templates, segments] = await Promise.all([
    getCampaigns(supabase),
    getTemplates(supabase),
    getSegments(supabase),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Campaigns</h1>
          <p className="text-sm text-muted-foreground">
            Broadcast a template to a segment and track delivery.
          </p>
        </div>
        <CampaignForm
          templates={templates.map((t) => ({ id: t.id, name: t.name }))}
          segments={segments.map((s) => ({ id: s.id, name: s.name, count: s.count }))}
        />
      </div>

      <ConnectionBanner connected={isWhatsappConnected()} />

      <Card>
        <CardContent>
          {campaigns.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">
              No campaigns yet. Create one to broadcast to a segment.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Campaign</TableHead>
                  <TableHead>Template</TableHead>
                  <TableHead>Audience</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Recipients</TableHead>
                  <TableHead className="text-right">Sent</TableHead>
                  <TableHead className="text-right">Failed</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {campaigns.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell className="font-mono text-xs">{c.templateName ?? "—"}</TableCell>
                    <TableCell>{c.segmentName ?? "All leads"}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(c.status)}>{c.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{c.total}</TableCell>
                    <TableCell className="text-right tabular-nums">{c.sent}</TableCell>
                    <TableCell className="text-right tabular-nums">{c.failed}</TableCell>
                    <TableCell className="text-right">
                      {c.status === "draft" ? (
                        <SendCampaignButton campaignId={c.id} name={c.name} />
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          {c.sentAt ? new Date(c.sentAt).toLocaleDateString() : "—"}
                        </span>
                      )}
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
