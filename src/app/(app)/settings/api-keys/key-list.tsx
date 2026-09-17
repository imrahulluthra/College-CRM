"use client";

import { useTransition } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { revokeApiKey } from "./actions";

export interface ApiKeyRow {
  id: string;
  name: string;
  key_prefix: string;
  is_active: boolean;
  last_used_at: string | null;
  created_at: string;
}

export function KeyList({ apiKeys }: { apiKeys: ApiKeyRow[] }) {
  const [isPending, startTransition] = useTransition();

  if (apiKeys.length === 0) {
    return <p className="text-sm text-muted-foreground">No keys yet.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Key</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Last used</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {apiKeys.map((k) => (
          <TableRow key={k.id}>
            <TableCell className="font-medium">{k.name}</TableCell>
            <TableCell>
              <code className="text-xs text-muted-foreground">{k.key_prefix}…</code>
            </TableCell>
            <TableCell>
              <Badge variant={k.is_active ? "success" : "outline"}>
                {k.is_active ? "Active" : "Revoked"}
              </Badge>
            </TableCell>
            <TableCell className="text-sm text-muted-foreground">
              {k.last_used_at ? new Date(k.last_used_at).toLocaleString() : "Never"}
            </TableCell>
            <TableCell className="text-right">
              {k.is_active && (
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={isPending}
                  className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  onClick={() =>
                    startTransition(async () => {
                      const res = await revokeApiKey(k.id);
                      if (res.error) toast.error(res.error);
                      else toast.success(`${k.name} revoked`);
                    })
                  }
                >
                  Revoke
                </Button>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
