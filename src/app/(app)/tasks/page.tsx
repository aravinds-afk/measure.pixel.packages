import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { scopedUserIds } from "@/lib/data/scope";
import { getStaffList } from "@/lib/data/staff";
import { PageHeader } from "@/components/ui/misc";
import TasksClient from "./tasks-client";

export default async function TasksPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const userIds = await scopedUserIds(session);
  const [tasks, staff, customers] = await Promise.all([
    prisma.task.findMany({
      where: userIds ? { assignedToId: { in: userIds } } : {},
      include: { assignedTo: { select: { id: true, name: true } }, customer: { select: { id: true, name: true } } },
      orderBy: { dueDate: "asc" },
    }),
    getStaffList(),
    prisma.customer.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div>
      <PageHeader
        title="Tasks"
        description="Stay on top of everything that needs doing."
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Tasks" }]}
      />
      <TasksClient
        initialTasks={tasks.map((t) => ({ ...t, dueDate: t.dueDate?.toISOString() ?? null }))}
        staff={staff}
        customers={customers}
      />
    </div>
  );
}
