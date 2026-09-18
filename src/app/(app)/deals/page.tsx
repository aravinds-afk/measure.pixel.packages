import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getScopedDeals } from "@/lib/data/deals";
import { getStaffList } from "@/lib/data/staff";
import { PageHeader } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { GitBranch } from "lucide-react";
import DealsClient from "./deals-client";

export default async function DealsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const [deals, staff, customers] = await Promise.all([
    getScopedDeals(session),
    getStaffList(),
    prisma.customer.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div>
      <PageHeader
        title="Deals"
        description="All deals across your sales pipeline."
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Deals" }]}
        actions={<Button href="/pipeline" variant="outline"><GitBranch className="size-4" /> Pipeline view</Button>}
      />
      <DealsClient
        initialDeals={deals.map((d) => ({ ...d, createdAt: d.createdAt.toISOString(), expectedClose: d.expectedClose?.toISOString() ?? null }))}
        staff={staff}
        customers={customers}
      />
    </div>
  );
}
