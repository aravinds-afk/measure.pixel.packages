"use client";

import { Plus, UserPlus, Target, Handshake, CheckSquare, ClipboardList, Receipt } from "lucide-react";
import { useRouter } from "next/navigation";
import { Dropdown, DropdownContent, DropdownItem, DropdownLabel, DropdownTrigger } from "@/components/ui/dropdown";
import { Button } from "@/components/ui/button";
import { canAccess, type ModuleKey } from "@/lib/rbac";
import type { Role } from "@prisma/client";

const ITEMS: { key: ModuleKey; label: string; href: string; icon: typeof Plus }[] = [
  { key: "customers", label: "Add Customer", href: "/customers?new=1", icon: UserPlus },
  { key: "leads", label: "Add Lead", href: "/leads?new=1", icon: Target },
  { key: "deals", label: "Add Deal", href: "/deals?new=1", icon: Handshake },
  { key: "tasks", label: "Add Task", href: "/tasks?new=1", icon: CheckSquare },
  { key: "followups", label: "Schedule Follow-up", href: "/followups?new=1", icon: ClipboardList },
  { key: "invoices", label: "Create Invoice", href: "/invoices?new=1", icon: Receipt },
];

export function QuickAdd({ role }: { role: Role }) {
  const router = useRouter();
  const items = ITEMS.filter((i) => canAccess(role, i.key));
  if (items.length === 0) return null;

  return (
    <Dropdown>
      <DropdownTrigger asChild>
        <Button size="sm"><Plus className="size-4" /> <span className="hidden sm:inline">Quick Add</span></Button>
      </DropdownTrigger>
      <DropdownContent className="w-56">
        <DropdownLabel>Create new</DropdownLabel>
        {items.map((item) => (
          <DropdownItem key={item.href} onSelect={() => router.push(item.href)}>
            <item.icon className="size-4 text-muted" /> {item.label}
          </DropdownItem>
        ))}
      </DropdownContent>
    </Dropdown>
  );
}
