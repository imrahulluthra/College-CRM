import { Globe, MessageCircle, Target, Upload, Webhook } from "lucide-react";

import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { isWhatsappConnected } from "@/lib/messaging/provider";
import { getIntegrationStatuses } from "@/features/integrations/data";
import {
  IntegrationCard,
  type IntegrationStatus,
} from "@/features/integrations/integration-card";

export default async function IntegrationsPage() {
  await requireUser(["super_admin"]);
  const supabase = await createClient();
  const [{ activeWebsiteKeys }, whatsappConnected] = await Promise.all([
    getIntegrationStatuses(supabase),
    Promise.resolve(isWhatsappConnected()),
  ]);

  const websiteStatus: IntegrationStatus = activeWebsiteKeys > 0 ? "connected" : "action_required";
  const whatsappStatus: IntegrationStatus = whatsappConnected ? "connected" : "action_required";

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Integrations</h1>
        <p className="text-sm text-muted-foreground">
          Connect the college&apos;s lead sources and WhatsApp so enquiries flow into the CRM and
          out to applicants automatically.
        </p>
      </div>

      {/* Lead Sources */}
      <section className="flex flex-col gap-3">
        <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground/70">
          Lead sources
        </h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <IntegrationCard
            icon={Globe}
            name="Website / Landing page"
            description="Post enquiry-form submissions straight into the CRM."
            status={websiteStatus}
            detail={
              activeWebsiteKeys > 0
                ? `${activeWebsiteKeys} active key${activeWebsiteKeys === 1 ? "" : "s"}. Leads capture to /api/leads.`
                : "No active key yet — generate one to connect the website."
            }
            actions={[{ label: "Configure", href: "/settings/api-keys", variant: "default" }]}
          />

          <IntegrationCard
            icon={Webhook}
            name="Inbound API & Webhook"
            description="Let external systems POST leads into the CRM."
            status="connected"
            detail="Live endpoint: POST /api/leads (API-key authenticated). Shares keys with the website."
            actions={[{ label: "Manage keys", href: "/settings/api-keys" }]}
          />

          <IntegrationCard
            icon={Target}
            name="Meta / Facebook Lead Ads"
            description="Capture Facebook & Instagram lead-form submissions."
            status="coming_soon"
            detail="Connect a Meta Business account, Page and lead forms. Ad leads flow straight into the CRM."
            actions={[{ label: "Connect", disabled: true }]}
          />

          <IntegrationCard
            icon={Upload}
            name="CSV Import"
            description="Bulk-upload a list of leads."
            status="coming_soon"
            detail="Upload a spreadsheet of leads; the same phone-based dedupe applies as live capture."
            actions={[{ label: "Import", disabled: true }]}
          />
        </div>
      </section>

      {/* Communication */}
      <section className="flex flex-col gap-3">
        <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground/70">
          Communication
        </h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <IntegrationCard
            icon={MessageCircle}
            name="WhatsApp (Meta Cloud API)"
            description="Two-way WhatsApp for the inbox, campaigns and automation."
            status={whatsappStatus}
            detail={
              whatsappConnected
                ? "Connected to the WhatsApp Business Cloud API — messages send live."
                : "Not connected — messages are saved and queued. Connect a WhatsApp Business account to send."
            }
            actions={[
              { label: "Open inbox", href: "/messaging", variant: "default" },
              { label: "Connect", disabled: true },
            ]}
          />
        </div>
      </section>
    </div>
  );
}
