"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";

const LINKS = [
  { href: "#features", label: "Features" },
  { href: "#dashboard", label: "Product" },
  { href: "#insights", label: "Insights" },
  { href: "#security", label: "Security" },
];

export function MarketingNav() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-surface/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Logo />
        <nav className="hidden items-center gap-8 md:flex">
          {LINKS.map((l) => (
            <a key={l.href} href={l.href} className="text-sm font-medium text-muted hover:text-foreground">{l.label}</a>
          ))}
        </nav>
        <div className="hidden items-center gap-2 md:flex">
          <Button href="/login" variant="ghost">Login</Button>
          <Button href="/login">Get Started</Button>
        </div>
        <button onClick={() => setOpen((o) => !o)} className="text-foreground md:hidden">
          {open ? <X className="size-6" /> : <Menu className="size-6" />}
        </button>
      </div>
      {open && (
        <div className="border-t border-border bg-surface px-4 py-4 md:hidden">
          <div className="flex flex-col gap-3">
            {LINKS.map((l) => (
              <a key={l.href} href={l.href} onClick={() => setOpen(false)} className="text-sm font-medium text-muted hover:text-foreground">{l.label}</a>
            ))}
            <div className="mt-2 flex flex-col gap-2">
              <Button href="/login" variant="outline">Login</Button>
              <Button href="/login">Get Started</Button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
