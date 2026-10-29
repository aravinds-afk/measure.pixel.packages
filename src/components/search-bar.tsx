"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Input, Select } from "./ui";

/** URL-driven search + optional select filter for server-rendered lists. */
export function SearchBar({ placeholder, filter }: { placeholder: string; filter?: { name: string; label: string; options: { value: string; label: string }[] } }) {
  const router = useRouter();
  const path = usePathname();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");
  const [, start] = useTransition();
  const push = (next: Record<string, string>) => {
    const sp = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(next)) {
      if (v) sp.set(k, v);
      else sp.delete(k);
    }
    start(() => router.replace(`${path}?${sp.toString()}`));
  };
  useEffect(() => {
    const t = setTimeout(() => {
      if ((params.get("q") ?? "") !== q) push({ q });
    }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);
  return (
    <div className="mb-5 flex flex-col gap-2 sm:flex-row">
      <Input type="search" aria-label="Search" placeholder={placeholder} value={q} onChange={(e) => setQ(e.target.value)} />
      {filter && (
        <Select aria-label={filter.label} className="sm:w-[220px]" value={params.get(filter.name) ?? ""} onChange={(e) => push({ [filter.name]: e.target.value })}>
          {filter.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </Select>
      )}
    </div>
  );
}
