import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/app-shell/shell";
import { getEffectiveModules, getCreatableModules } from "@/lib/permissions";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");

  const [notifications, unreadCount, allowedModules, creatableModules] = await Promise.all([
    prisma.notification.findMany({
      where: { userId: session.sub },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
    prisma.notification.count({ where: { userId: session.sub, read: false } }),
    getEffectiveModules(session.role),
    getCreatableModules(session.role),
  ]);

  return (
    <AppShell
      name={session.name}
      email={session.email}
      role={session.role}
      unreadCount={unreadCount}
      allowedModules={allowedModules}
      creatableModules={creatableModules}
      notifications={notifications.map((n) => ({ ...n, createdAt: n.createdAt.toISOString() }))}
    >
      {children}
    </AppShell>
  );
}
