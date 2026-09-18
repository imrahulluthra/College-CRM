import Link from "next/link";
import { MessageSquare } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { isWhatsappConnected } from "@/lib/messaging/provider";
import { getConversations, getConversationThread } from "@/features/messaging/data";
import { ConnectionBanner } from "@/features/messaging/connection-banner";
import { ReplyBox } from "@/features/messaging/reply-box";
import { OptOutToggle } from "@/features/messaging/opt-out-toggle";
import { LeadStatusBadge } from "@/features/leads/lead-status-badge";

function timeShort(iso: string | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

const STATUS_LABEL: Record<string, string> = {
  queued: "Queued",
  sent: "Sent",
  delivered: "Delivered",
  read: "Read",
  failed: "Failed",
  received: "Received",
};

export default async function InboxPage(props: PageProps<"/messaging">) {
  await requireStaff();
  const supabase = await createClient();
  const sp = await props.searchParams;
  const selectedId = typeof sp.c === "string" ? sp.c : null;

  const [conversations, thread] = await Promise.all([
    getConversations(supabase),
    selectedId ? getConversationThread(supabase, selectedId) : Promise.resolve(null),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Inbox</h1>
        <p className="text-sm text-muted-foreground">WhatsApp conversations with your leads.</p>
      </div>

      <ConnectionBanner connected={isWhatsappConnected()} />

      <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
        {/* Conversation list */}
        <Card className={cn(thread && "hidden lg:block")}>
          <CardContent className="p-0">
            {conversations.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-muted-foreground">
                No conversations yet. Message a lead from their conversation to start one.
              </p>
            ) : (
              <ul className="divide-y">
                {conversations.map((c) => (
                  <li key={c.conversationId}>
                    <Link
                      href={`/messaging?c=${c.conversationId}`}
                      className={cn(
                        "flex flex-col gap-0.5 px-4 py-3 transition-colors hover:bg-secondary",
                        c.conversationId === selectedId && "bg-primary/5"
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate font-medium">{c.name}</span>
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {timeShort(c.lastAt)}
                        </span>
                      </div>
                      <span className="truncate text-sm text-muted-foreground">
                        {c.lastDirection === "outbound" && "You: "}
                        {c.preview ?? "No messages yet"}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Thread */}
        {thread ? (
          <Card className="flex min-h-[60vh] flex-col">
            <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
              <div className="flex flex-col">
                <Link href={`/leads/${thread.lead.id}`} className="font-medium hover:underline">
                  {thread.lead.full_name}
                </Link>
                <span className="text-xs text-muted-foreground">{thread.lead.phone}</span>
              </div>
              <div className="flex items-center gap-2">
                <LeadStatusBadge status={thread.lead.status} />
                <OptOutToggle leadId={thread.lead.id} suppressed={thread.suppressed} />
              </div>
            </div>

            <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-4">
              {thread.messages.length === 0 ? (
                <p className="my-auto text-center text-sm text-muted-foreground">
                  No messages yet. Say hello 👋
                </p>
              ) : (
                thread.messages.map((m) => (
                  <div
                    key={m.id}
                    className={cn(
                      "max-w-[80%] rounded-2xl px-3 py-2 text-sm",
                      m.direction === "outbound"
                        ? "self-end bg-primary text-primary-foreground"
                        : "self-start bg-secondary text-secondary-foreground"
                    )}
                  >
                    <p className="whitespace-pre-wrap break-words">{m.body}</p>
                    <p
                      className={cn(
                        "mt-1 text-[10px]",
                        m.direction === "outbound"
                          ? "text-primary-foreground/70"
                          : "text-muted-foreground"
                      )}
                    >
                      {new Date(m.createdAt).toLocaleString(undefined, {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                      {m.direction === "outbound" && ` · ${STATUS_LABEL[m.status] ?? m.status}`}
                    </p>
                  </div>
                ))
              )}
            </div>

            <div className="border-t p-3">
              <ReplyBox leadId={thread.lead.id} suppressed={thread.suppressed} />
            </div>
          </Card>
        ) : (
          <Card className="hidden lg:flex">
            <CardContent className="flex w-full flex-col items-center justify-center gap-2 py-20 text-center text-muted-foreground">
              <MessageSquare className="size-8" />
              <p className="text-sm">Select a conversation to view the thread.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
