import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/misc";
import NotificationsClient from "@/app/(app)/notifications/notifications-client";

export default async function PortalNotificationsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const notifications = await prisma.notification.findMany({ where: { userId: session.sub }, orderBy: { createdAt: "desc" } });

  return (
    <div>
      <PageHeader title="Notifications" description="Updates on your account, invoices and support requests." />
      <NotificationsClient initialNotifications={notifications.map((n) => ({ ...n, createdAt: n.createdAt.toISOString() }))} />
    </div>
  );
}
