"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ALL_LEAD_STATUSES, leadStatusLabel } from "./status";

export interface FilterOption {
  id: string;
  name: string;
}

const ALL = "__all__";

export function LeadFiltersBar({
  programs,
  sources,
  counselors,
  showCounselorFilter,
}: {
  programs: FilterOption[];
  sources: FilterOption[];
  counselors: FilterOption[];
  showCounselorFilter: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const [search, setSearch] = useState(searchParams.get("q") ?? "");

  useEffect(() => {
    const timeout = setTimeout(() => {
      updateParam("q", search || null);
    }, 350);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  function updateParam(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    params.set("page", "1");
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
      <div className="relative w-full sm:w-64">
        <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search name, phone, email"
          className="pl-8"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <Select
        value={searchParams.get("status") ?? ALL}
        onValueChange={(v) => updateParam("status", v === ALL ? null : v)}
      >
        <SelectTrigger className="w-full sm:w-44">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All statuses</SelectItem>
          {ALL_LEAD_STATUSES.map((s) => (
            <SelectItem key={s} value={s}>
              {leadStatusLabel(s)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={searchParams.get("program") ?? ALL}
        onValueChange={(v) => updateParam("program", v === ALL ? null : v)}
      >
        <SelectTrigger className="w-full sm:w-48">
          <SelectValue placeholder="Program" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All programs</SelectItem>
          {programs.map((p) => (
            <SelectItem key={p.id} value={p.id}>
              {p.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={searchParams.get("source") ?? ALL}
        onValueChange={(v) => updateParam("source", v === ALL ? null : v)}
      >
        <SelectTrigger className="w-full sm:w-40">
          <SelectValue placeholder="Source" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All sources</SelectItem>
          {sources.map((s) => (
            <SelectItem key={s.id} value={s.id}>
              {s.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {showCounselorFilter && (
        <Select
          value={searchParams.get("counselor") ?? ALL}
          onValueChange={(v) => updateParam("counselor", v === ALL ? null : v)}
        >
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Counselor" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All counselors</SelectItem>
            <SelectItem value="unassigned">Unassigned</SelectItem>
            {counselors.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}
