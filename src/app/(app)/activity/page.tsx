import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/misc";
import ActivityClient from "./activity-client";

export default async function ActivityPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!["SUPER_ADMIN", "ADMIN"].includes(session.role)) redirect("/dashboard");

  const activities = await prisma.activity.findMany({
    include: { user: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" },
    take: 300,
  });

  return (
    <div>
      <PageHeader
        title="Activity Log"
        description="A complete audit trail of every important action in your workspace."
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Activity Log" }]}
      />
      <ActivityClient initialActivities={activities.map((a) => ({ ...a, createdAt: a.createdAt.toISOString() }))} />
    </div>
  );
}
