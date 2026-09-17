import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { getKpis } from "./data";

export function KpiCards({ kpis }: { kpis: Awaited<ReturnType<typeof getKpis>> }) {
  const cards = [
    { label: "Total Leads", value: kpis.total },
    { label: "New Leads", value: kpis.newLeads },
    { label: "Contacted", value: kpis.contacted },
    { label: "Interested", value: kpis.interested },
    { label: "Applications", value: kpis.applications },
    { label: "Admitted", value: kpis.admitted },
    { label: "Enrolled", value: kpis.enrolled },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-7">
      {cards.map((card) => (
        <Card key={card.label}>
          <CardHeader className="pb-0">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              {card.label}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold tabular-nums">{card.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
