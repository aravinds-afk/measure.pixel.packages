import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/misc";
import EmployeesClient from "./employees-client";

export default async function EmployeesPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!["SUPER_ADMIN", "ADMIN"].includes(session.role)) redirect("/dashboard");

  const employees = await prisma.user.findMany({
    where: { role: { not: "CUSTOMER" } },
    include: { manager: { select: { id: true, name: true } } },
    orderBy: { name: "asc" },
  });

  return (
    <div>
      <PageHeader
        title="Employees"
        description="Manage your team members, roles and assignments."
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Employees" }]}
      />
      <EmployeesClient
        initialEmployees={employees.map((e) => ({ ...e, joiningDate: e.joiningDate.toISOString() }))}
      />
    </div>
  );
}
