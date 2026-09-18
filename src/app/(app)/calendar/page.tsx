import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { scopedUserIds } from "@/lib/data/scope";
import { PageHeader } from "@/components/ui/misc";
import CalendarClient from "./calendar-client";

export default async function CalendarPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const userIds = await scopedUserIds(session);
  const [events, tasks, followUps, customers] = await Promise.all([
    prisma.calendarEvent.findMany({
      where: userIds ? { userId: { in: userIds } } : {},
      include: { customer: { select: { name: true } } },
    }),
    prisma.task.findMany({
      where: { ...(userIds ? { assignedToId: { in: userIds } } : {}), dueDate: { not: null } },
      select: { id: true, title: true, dueDate: true },
    }),
    prisma.followUp.findMany({
      where: userIds ? { assignedToId: { in: userIds } } : {},
      select: { id: true, type: true, scheduledAt: true },
    }),
    prisma.customer.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div>
      <PageHeader
        title="Calendar"
        description="Every meeting, call, demo and deadline in one view."
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Calendar" }]}
      />
      <CalendarClient
        events={events.map((e) => ({ id: e.id, title: e.title, type: e.type, start: e.start.toISOString(), end: e.end.toISOString(), notes: e.notes, customer: e.customer?.name ?? null }))}
        tasks={tasks.map((t) => ({ id: t.id, title: t.title, dueDate: t.dueDate!.toISOString() }))}
        followUps={followUps.map((f) => ({ id: f.id, type: f.type, scheduledAt: f.scheduledAt.toISOString() }))}
        customers={customers}
      />
    </div>
  );
}
