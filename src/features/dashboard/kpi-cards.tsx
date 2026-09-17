import {
  CheckCircle2,
  GraduationCap,
  PhoneCall,
  Sparkles,
  Star,
  UserPlus,
  Users,
  type LucideIcon,
} from "lucide-react";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { getKpis } from "./data";

type Tone = "brand" | "neutral" | "success";

const CARDS: { key: keyof Awaited<ReturnType<typeof getKpis>>; label: string; icon: LucideIcon; tone: Tone }[] = [
  { key: "total", label: "Total Leads", icon: Users, tone: "brand" },
  { key: "newLeads", label: "New", icon: Sparkles, tone: "neutral" },
  { key: "contacted", label: "Contacted", icon: PhoneCall, tone: "neutral" },
  { key: "interested", label: "Interested", icon: Star, tone: "neutral" },
  { key: "applications", label: "Applications", icon: UserPlus, tone: "neutral" },
  { key: "admitted", label: "Admitted", icon: CheckCircle2, tone: "success" },
  { key: "enrolled", label: "Enrolled", icon: GraduationCap, tone: "success" },
];

const TONE_STYLES: Record<Tone, string> = {
  brand: "bg-primary/10 text-primary",
  neutral: "bg-secondary text-muted-foreground",
  success: "bg-success/10 text-success",
};

export function KpiCards({ kpis }: { kpis: Awaited<ReturnType<typeof getKpis>> }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
      {CARDS.map((card) => {
        const Icon = card.icon;
        return (
          <Card
            key={card.key}
            className="gap-0 p-4 transition-shadow hover:shadow-md"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">{card.label}</span>
              <span
                className={cn(
                  "flex size-7 items-center justify-center rounded-md",
                  TONE_STYLES[card.tone]
                )}
              >
                <Icon className="size-4" />
              </span>
            </div>
            <p className="mt-3 text-2xl font-semibold tabular-nums tracking-tight">
              {kpis[card.key]}
            </p>
          </Card>
        );
      })}
    </div>
  );
}
