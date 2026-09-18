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

type Tone = "neutral" | "success";

const CARDS: { key: keyof Awaited<ReturnType<typeof getKpis>>; label: string; icon: LucideIcon; tone: Tone }[] = [
  { key: "newLeads", label: "New", icon: Sparkles, tone: "neutral" },
  { key: "contacted", label: "Contacted", icon: PhoneCall, tone: "neutral" },
  { key: "interested", label: "Interested", icon: Star, tone: "neutral" },
  { key: "applications", label: "Applications", icon: UserPlus, tone: "neutral" },
  { key: "admitted", label: "Admitted", icon: CheckCircle2, tone: "success" },
  { key: "enrolled", label: "Enrolled", icon: GraduationCap, tone: "success" },
];

const TONE_STYLES: Record<Tone, string> = {
  neutral: "bg-secondary text-muted-foreground",
  success: "bg-success/10 text-success",
};

export function KpiCards({ kpis }: { kpis: Awaited<ReturnType<typeof getKpis>> }) {
  const conversion = kpis.total > 0 ? Math.round((kpis.enrolled / kpis.total) * 100) : 0;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {/* Hero: total leads + conversion, spans two columns on wider screens. */}
      <Card className="col-span-2 gap-0 justify-between bg-gradient-to-br from-primary to-primary/85 p-4 text-primary-foreground shadow-soft-lg sm:col-span-3 lg:col-span-1">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-primary-foreground/80">Total Leads</span>
          <span className="flex size-7 items-center justify-center rounded-md bg-white/15">
            <Users className="size-4" />
          </span>
        </div>
        <div className="mt-3">
          <p className="text-3xl font-semibold tabular-nums tracking-tight">{kpis.total}</p>
          <p className="mt-0.5 text-xs text-primary-foreground/80">
            {conversion}% enrolled to date
          </p>
        </div>
      </Card>

      {CARDS.map((card) => {
        const Icon = card.icon;
        return (
          <Card
            key={card.key}
            className="gap-0 p-4 transition-all hover:-translate-y-0.5 hover:shadow-soft-lg"
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
