import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { scopedUserIds } from "@/lib/data/scope";
import { getStaffList } from "@/lib/data/staff";
import { PageHeader } from "@/components/ui/misc";
import CustomersClient from "./customers-client";

export default async function CustomersPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const userIds = await scopedUserIds(session);
  const [customers, staff] = await Promise.all([
    prisma.customer.findMany({
      where: userIds ? { assignedToId: { in: userIds } } : {},
      include: { assignedTo: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
    }),
    getStaffList(),
  ]);

  return (
    <div>
      <PageHeader
        title="Customers"
        description="Manage every customer relationship in one place."
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Customers" }]}
      />
      <CustomersClient
        initialCustomers={customers.map((c) => ({ ...c, createdAt: c.createdAt.toISOString(), lastContact: c.lastContact?.toISOString() ?? null }))}
        staff={staff}
        canDelete={["SUPER_ADMIN", "ADMIN", "MANAGER"].includes(session.role)}
      />
    </div>
  );
}
