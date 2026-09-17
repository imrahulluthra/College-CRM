import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { getCounselorWorkload } from "./data";

export function CounselorWorkloadTable({
  workload,
}: {
  workload: Awaited<ReturnType<typeof getCounselorWorkload>>;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Counselor Workload</CardTitle>
      </CardHeader>
      <CardContent>
        {workload.length === 0 ? (
          <p className="text-sm text-muted-foreground">No counselors yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Counselor</TableHead>
                <TableHead className="text-right">Assigned</TableHead>
                <TableHead className="text-right">Pending</TableHead>
                <TableHead className="text-right">Follow-ups</TableHead>
                <TableHead className="text-right">Applications</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {workload.map((w) => (
                <TableRow key={w.counselor_id}>
                  <TableCell className="font-medium">{w.full_name}</TableCell>
                  <TableCell className="text-right tabular-nums">{w.assigned_leads}</TableCell>
                  <TableCell className="text-right tabular-nums">{w.pending_leads}</TableCell>
                  <TableCell className="text-right tabular-nums">{w.pending_tasks}</TableCell>
                  <TableCell className="text-right tabular-nums">{w.applications}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
