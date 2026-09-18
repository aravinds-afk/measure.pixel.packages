"use client";

import { useState } from "react";
import { Sidebar } from "@/components/app-shell/sidebar";
import { Topbar } from "@/components/app-shell/topbar";
import type { Role } from "@prisma/client";

type Notif = { id: string; title: string; message: string; read: boolean; createdAt: string; type: string };

export function AppShell({
  name,
  email,
  role,
  notifications,
  unreadCount,
  children,
}: {
  name: string;
  email: string;
  role: Role;
  notifications: Notif[];
  unreadCount: number;
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-svh w-full">
      <Sidebar role={role} name={name} email={email} mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} />
      <div className="flex min-h-svh min-w-0 flex-1 flex-col">
        <Topbar
          name={name}
          email={email}
          role={role}
          notifications={notifications}
          unreadCount={unreadCount}
          onMenuClick={() => setMobileOpen(true)}
        />
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
