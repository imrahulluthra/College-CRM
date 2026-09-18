import { TriangleAlert } from "lucide-react";

// Honest status: with no WABA credentials in the environment, outbound
// messages are queued, not delivered. Shown across the messaging surfaces so
// staff aren't misled into thinking a send went out.
export function ConnectionBanner({ connected }: { connected: boolean }) {
  if (connected) return null;
  return (
    <div className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-sm text-warning-foreground">
      <TriangleAlert className="mt-0.5 size-4 shrink-0" />
      <p>
        WhatsApp isn&apos;t connected yet. Messages are saved and{" "}
        <span className="font-medium">queued</span> — they&apos;ll send automatically once the
        college&apos;s WhatsApp Business API credentials are added.
      </p>
    </div>
  );
}
