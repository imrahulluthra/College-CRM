import "server-only";

import type { MessageStatus } from "@/types/database";

// ── WhatsApp transport seam ─────────────────────────────────────────────────
// This is the single place the real Meta Cloud API integration lands. No WABA
// credentials exist in this environment, so `sendWhatsApp` records outbound
// messages as 'queued' and reports "not connected". When the college adds
// WHATSAPP_PHONE_NUMBER_ID + WHATSAPP_ACCESS_TOKEN, replace the queued return
// with a POST to https://graph.facebook.com/v21.0/{phone-number-id}/messages
// and map the response onto SendResult — nothing else in the app changes.

export interface SendResult {
  status: MessageStatus;
  providerMessageId: string | null;
  error: string | null;
}

/** True once the deployment has WhatsApp Business API credentials configured. */
export function isWhatsappConnected(): boolean {
  return Boolean(process.env.WHATSAPP_PHONE_NUMBER_ID && process.env.WHATSAPP_ACCESS_TOKEN);
}

export async function sendWhatsApp(toPhone: string, body: string): Promise<SendResult> {
  // Transport deferred: hold the message as 'queued'. A background sender (or
  // the real adapter above, which will use toPhone + body) drains the queue
  // once credentials are present.
  void toPhone;
  void body;
  return { status: "queued", providerMessageId: null, error: null };
}
