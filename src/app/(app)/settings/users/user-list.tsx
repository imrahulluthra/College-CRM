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
import { ROLE_LABELS } from "@/lib/permissions";
import type { UserRole } from "@/types/database";
import { deactivateStaffUser } from "./actions";

export interface StaffRow {
  id: string;
  full_name: string;
  email: string;
  is_active: boolean;
  roles: UserRole[];
}

export function UserList({ users }: { users: StaffRow[] }) {
  const [isPending, startTransition] = useTransition();

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Role</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {users.map((u) => (
          <TableRow key={u.id}>
            <TableCell className="font-medium">{u.full_name}</TableCell>
            <TableCell>{u.email}</TableCell>
            <TableCell>
              <div className="flex flex-wrap gap-1">
                {u.roles.map((r) => (
                  <Badge key={r} variant="secondary">
                    {ROLE_LABELS[r]}
                  </Badge>
                ))}
              </div>
            </TableCell>
            <TableCell>
              <Badge variant={u.is_active ? "success" : "outline"}>
                {u.is_active ? "Active" : "Deactivated"}
              </Badge>
            </TableCell>
            <TableCell className="text-right">
              {u.is_active && (
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={isPending}
                  onClick={() =>
                    startTransition(async () => {
                      const res = await deactivateStaffUser(u.id);
                      if (res.error) toast.error(res.error);
                      else toast.success(`${u.full_name} deactivated`);
                    })
                  }
                >
                  Deactivate
                </Button>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
