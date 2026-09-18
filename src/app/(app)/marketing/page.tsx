import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/misc";
import { StatCard } from "@/components/ui/stat-card";
import { Megaphone, Target, TrendingUp, Wallet } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import MarketingClient from "./marketing-client";

export default async function MarketingPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const campaigns = await prisma.campaign.findMany({
    include: { leads: { select: { id: true, status: true } } },
    orderBy: { startDate: "desc" },
  });

  const withStats = campaigns.map((c) => ({
    ...c,
    startDate: c.startDate.toISOString(),
    endDate: c.endDate?.toISOString() ?? null,
    leadsGenerated: c.leads.length,
    conversion: c.leads.length > 0 ? Math.round((c.leads.filter((l) => l.status === "WON").length / c.leads.length) * 100) : 0,
  }));

  const totalLeads = withStats.reduce((s, c) => s + c.leadsGenerated, 0);
  const totalRevenue = withStats.reduce((s, c) => s + c.revenue, 0);
  const totalBudget = withStats.reduce((s, c) => s + c.budget, 0);
  const activeCampaigns = withStats.filter((c) => c.status === "ACTIVE").length;

  return (
    <div>
      <PageHeader
        title="Marketing"
        description="Plan and measure campaigns that fill your pipeline."
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Campaigns" }]}
      />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 mb-6">
        <StatCard label="Active Campaigns" value={activeCampaigns} icon={Megaphone} tone="brand" />
        <StatCard label="Leads Generated" value={totalLeads} icon={Target} tone="info" />
        <StatCard label="Revenue Attributed" value={formatCurrency(totalRevenue)} icon={TrendingUp} tone="success" />
        <StatCard label="Total Budget" value={formatCurrency(totalBudget)} icon={Wallet} tone="warning" />
      </div>
      <MarketingClient initialCampaigns={withStats.map(({ leads, ...c }) => c)} />
    </div>
  );
}
