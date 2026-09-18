"use client";

import { useTransition } from "react";
import { Loader2, MessageCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { openLeadConversation } from "@/app/(app)/messaging/actions";

export function MessageLeadButton({ leadId }: { leadId: string }) {
  const [pending, start] = useTransition();
  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      disabled={pending}
      onClick={() => start(() => openLeadConversation(leadId))}
    >
      {pending ? <Loader2 className="animate-spin" /> : <MessageCircle className="size-4" />}
      WhatsApp
    </Button>
  );
}
