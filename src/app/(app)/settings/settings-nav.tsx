"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cx } from "@/components/ui";

const TABS = [
  { href: "/settings", label: "General" },
  { href: "/settings/catalogue", label: "Catalogue" },
  { href: "/settings/checklist", label: "Audit checklist" },
  { href: "/settings/rules", label: "Rules" },
  { href: "/settings/users", label: "Users" },
  { href: "/settings/sheets", label: "Google Sheets" },
];

export function SettingsNav() {
  const path = usePathname();
  return (
    <nav aria-label="Settings" className="-mx-4 flex gap-1 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      {TABS.map((t) => (
        <Link key={t.href} href={t.href} aria-current={path === t.href ? "page" : undefined}
          className={cx("min-h-[38px] shrink-0 rounded-full px-4 py-2 text-[14px] font-medium", path === t.href ? "bg-ink text-white" : "bg-surface-2 text-ink-2 hover:text-ink")}>
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
