"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import { Search, Loader2 } from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";

type SearchGroup = { label: string; items: { id: string; title: string; subtitle?: string; href: string }[] };

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [groups, setGroups] = useState<SearchGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim().length < 2) {
      setGroups([]);
      return;
    }
    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      setGroups(data.groups ?? []);
      setLoading(false);
    }, 250);
  }, [query]);

  function select(href: string) {
    setOpen(false);
    setQuery("");
    router.push(href);
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex h-9.5 w-full max-w-sm items-center gap-2 rounded-lg border border-border bg-surface-2/60 px-3 text-sm text-muted hover:border-brand/40"
      >
        <Search className="size-4" />
        <span className="hidden sm:inline">Search customers, leads, deals...</span>
        <span className="sm:hidden">Search</span>
        <kbd className="ml-auto hidden rounded border border-border bg-surface px-1.5 py-0.5 text-[10px] sm:inline">⌘K</kbd>
      </button>

      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-[1px]" />
          <Dialog.Content className="fixed left-1/2 top-24 z-[60] w-[92vw] max-w-xl -translate-x-1/2 overflow-hidden rounded-xl border border-border bg-surface shadow-2xl">
            <Dialog.Title className="sr-only">Global search</Dialog.Title>
            <Command shouldFilter={false} className="flex flex-col">
              <div className="flex items-center gap-2 border-b border-border px-4">
                <Search className="size-4 text-muted" />
                <Command.Input
                  autoFocus
                  value={query}
                  onValueChange={setQuery}
                  placeholder="Search customers, leads, deals, employees, tasks..."
                  className="h-12 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted"
                />
                {loading && <Loader2 className="size-4 animate-spin text-muted" />}
              </div>
              <Command.List className="max-h-96 overflow-y-auto p-2 scrollbar-thin">
                {query.trim().length < 2 && (
                  <p className="px-3 py-6 text-center text-sm text-muted">Type at least 2 characters to search across Measure Pixel.</p>
                )}
                {query.trim().length >= 2 && !loading && groups.length === 0 && (
                  <p className="px-3 py-6 text-center text-sm text-muted">No results found for &ldquo;{query}&rdquo;.</p>
                )}
                {groups.map((g) => (
                  <Command.Group key={g.label} heading={g.label} className="px-1 py-1.5 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:text-muted">
                    {g.items.map((item) => (
                      <Command.Item
                        key={item.id}
                        value={item.id}
                        onSelect={() => select(item.href)}
                        className="flex cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-sm data-[selected=true]:bg-surface-2"
                      >
                        <span className="text-foreground">{item.title}</span>
                        {item.subtitle && <span className="text-xs text-muted">{item.subtitle}</span>}
                      </Command.Item>
                    ))}
                  </Command.Group>
                ))}
              </Command.List>
            </Command>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
