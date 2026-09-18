import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getScopedDeals } from "@/lib/data/deals";
import { PageHeader } from "@/components/ui/misc";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { DoughnutChart } from "@/components/ui/charts";
import { formatCurrency } from "@/lib/utils";
import { Wallet, TrendingUp, Trophy, XCircle } from "lucide-react";
import DealsKanban from "./deals-kanban";

export default async function PipelinePage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const deals = await getScopedDeals(session);
  const open = deals.filter((d) => d.stage !== "WON" && d.stage !== "LOST");
  const won = deals.filter((d) => d.stage === "WON");
  const lost = deals.filter((d) => d.stage === "LOST");
  const totalPipeline = open.reduce((s, d) => s + d.value, 0);
  const weightedForecast = open.reduce((s, d) => s + d.value * (d.probability / 100), 0);
  const wonValue = won.reduce((s, d) => s + d.value, 0);
  const winRate = deals.length > 0 ? Math.round((won.length / (won.length + lost.length || 1)) * 100) : 0;

  const wonLostAnalysis = [
    { name: "Won", value: won.length },
    { name: "Lost", value: lost.length },
  ];

  return (
    <div>
      <PageHeader
        title="Sales Pipeline"
        description="Drag deals between stages to update progress."
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Pipeline" }]}
      />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 mb-6">
        <StatCard label="Total Pipeline Value" value={formatCurrency(totalPipeline)} icon={Wallet} tone="brand" />
        <StatCard label="Weighted Forecast" value={formatCurrency(weightedForecast)} icon={TrendingUp} tone="info" />
        <StatCard label="Won Value" value={formatCurrency(wonValue)} icon={Trophy} tone="success" />
        <StatCard label="Win Rate" value={`${winRate}%`} icon={XCircle} tone="warning" />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-4 mb-6">
        <Card className="lg:col-span-3 p-1">
          <CardHeader><CardTitle>Pipeline Board</CardTitle><CardDescription>{open.length} open deals across all stages</CardDescription></CardHeader>
          <CardContent><DealsKanban deals={deals} /></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Won / Lost Analysis</CardTitle></CardHeader>
          <CardContent><DoughnutChart data={wonLostAnalysis} /></CardContent>
        </Card>
      </div>
    </div>
  );
}
