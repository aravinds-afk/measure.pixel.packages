"use client";

import { useMemo, useState } from "react";
import { Download } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { Select, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RevenueAreaChart, DealsBarChart, DoughnutChart, LeadFunnelChart } from "@/components/ui/charts";
import { formatCurrency } from "@/lib/utils";
import { format, subMonths } from "date-fns";
import { Wallet, Target, Users, Handshake, TrendingUp } from "lucide-react";

type Deal = { id: string; name: string; value: number; stage: string; createdAt: string; assignedTo: { id: string; name: string } | null };
type Lead = { id: string; source: string; status: string; value: number; createdAt: string; assignedTo: { id: string; name: string } | null };
type Customer = { id: string; status: string; createdAt: string };
type Payment = { id: string; amount: number; paidAt: string };
type Task = { id: string; status: string; assignedTo: { id: string; name: string } | null };
type FollowUp = { id: string; status: string; assignedTo: { id: string; name: string } | null };
type Staff = { id: string; name: string };

function downloadCsv(filename: string, rows: (string | number)[][]) {
  const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export default function ReportsClient({ deals, leads, customers, payments, tasks, followUps, staff }: {
  deals: Deal[]; leads: Lead[]; customers: Customer[]; payments: Payment[]; tasks: Task[]; followUps: FollowUp[]; staff: Staff[];
}) {
  const [employeeFilter, setEmployeeFilter] = useState("");
  const [monthsBack, setMonthsBack] = useState(6);

  const cutoff = subMonths(new Date(), monthsBack);
  const fDeals = deals.filter((d) => new Date(d.createdAt) >= cutoff && (!employeeFilter || d.assignedTo?.id === employeeFilter));
  const fLeads = leads.filter((l) => new Date(l.createdAt) >= cutoff && (!employeeFilter || l.assignedTo?.id === employeeFilter));
  const fCustomers = customers.filter((c) => new Date(c.createdAt) >= cutoff);
  const fPayments = payments.filter((p) => new Date(p.paidAt) >= cutoff);

  const months = Array.from({ length: monthsBack }).map((_, i) => subMonths(new Date(), monthsBack - 1 - i));
  const salesSeries = months.map((m) => ({
    month: format(m, "MMM"),
    revenue: fPayments.filter((p) => format(new Date(p.paidAt), "MMM yyyy") === format(m, "MMM yyyy")).reduce((s, p) => s + p.amount, 0),
  }));
  const dealsSeries = months.map((m) => {
    const inMonth = fDeals.filter((d) => format(new Date(d.createdAt), "MMM yyyy") === format(m, "MMM yyyy"));
    return { month: format(m, "MMM"), won: inMonth.filter((d) => d.stage === "WON").length, lost: inMonth.filter((d) => d.stage === "LOST").length };
  });

  const totalSales = fDeals.filter((d) => d.stage === "WON").reduce((s, d) => s + d.value, 0);
  const wonCount = fDeals.filter((d) => d.stage === "WON").length;
  const lostCount = fDeals.filter((d) => d.stage === "LOST").length;

  const leadsBySource = useMemo(() => {
    const map = new Map<string, number>();
    fLeads.forEach((l) => map.set(l.source, (map.get(l.source) ?? 0) + 1));
    return Array.from(map, ([name, value]) => ({ name, value }));
  }, [fLeads]);
  const funnel = ["NEW", "CONTACTED", "QUALIFIED", "PROPOSAL", "NEGOTIATION", "WON"].map((s) => ({
    name: s.charAt(0) + s.slice(1).toLowerCase(), value: fLeads.filter((l) => l.status === s).length,
  }));
  const leadConversion = fLeads.length > 0 ? Math.round((fLeads.filter((l) => l.status === "WON").length / fLeads.length) * 100) : 0;

  const employeePerf = staff.filter((s) => !employeeFilter || s.id === employeeFilter).map((s) => {
    const empDeals = fDeals.filter((d) => d.assignedTo?.id === s.id);
    const empLeads = fLeads.filter((l) => l.assignedTo?.id === s.id);
    const empTasks = tasks.filter((t) => t.assignedTo?.id === s.id && t.status === "COMPLETED");
    const empFollowUps = followUps.filter((f) => f.assignedTo?.id === s.id && f.status === "COMPLETED");
    return {
      name: s.name,
      leads: empLeads.length,
      deals: empDeals.filter((d) => d.stage === "WON").length,
      revenue: empDeals.filter((d) => d.stage === "WON").reduce((sum, d) => sum + d.value, 0),
      tasksCompleted: empTasks.length,
      followUpsCompleted: empFollowUps.length,
    };
  }).sort((a, b) => b.revenue - a.revenue);

  const activeCustomers = fCustomers.filter((c) => c.status === "ACTIVE").length;
  const customerGrowth = months.map((m) => ({
    label: format(m, "MMM"),
    value: fCustomers.filter((c) => format(new Date(c.createdAt), "MMM yyyy") === format(m, "MMM yyyy")).length,
  }));

  const totalRevenue = fPayments.reduce((s, p) => s + p.amount, 0);
  const outstanding = fDeals.filter((d) => d.stage === "WON").reduce((s, d) => s + d.value, 0) - totalRevenue;

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-end gap-4">
        <div>
          <Label>Date range</Label>
          <Select value={monthsBack} onChange={(e) => setMonthsBack(Number(e.target.value))} className="w-40">
            <option value={3}>Last 3 months</option>
            <option value={6}>Last 6 months</option>
            <option value={12}>Last 12 months</option>
          </Select>
        </div>
        <div>
          <Label>Employee</Label>
          <Select value={employeeFilter} onChange={(e) => setEmployeeFilter(e.target.value)} className="w-48">
            <option value="">All employees</option>
            {staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </Select>
        </div>
      </div>

      <Tabs defaultValue="sales">
        <TabsList className="flex-wrap">
          <TabsTrigger value="sales">Sales</TabsTrigger>
          <TabsTrigger value="leads">Leads</TabsTrigger>
          <TabsTrigger value="employees">Employee Performance</TabsTrigger>
          <TabsTrigger value="customers">Customers</TabsTrigger>
          <TabsTrigger value="financial">Financial</TabsTrigger>
        </TabsList>

        <TabsContent value="sales">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 mb-5">
            <StatCard label="Total Sales" value={formatCurrency(totalSales)} icon={Wallet} tone="success" />
            <StatCard label="Deals Won" value={wonCount} icon={Handshake} tone="brand" />
            <StatCard label="Deals Lost" value={lostCount} icon={Target} tone="danger" />
            <StatCard label="Win Rate" value={`${wonCount + lostCount > 0 ? Math.round((wonCount / (wonCount + lostCount)) * 100) : 0}%`} icon={TrendingUp} tone="info" />
          </div>
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <Card><CardHeader><CardTitle>Monthly Revenue</CardTitle></CardHeader><CardContent><RevenueAreaChart data={salesSeries} /></CardContent></Card>
            <Card><CardHeader><CardTitle>Won vs Lost Deals</CardTitle></CardHeader><CardContent><DealsBarChart data={dealsSeries} /></CardContent></Card>
          </div>
          <div className="mt-4"><Button variant="outline" size="sm" onClick={() => downloadCsv("sales-report.csv", [["Month", "Revenue"], ...salesSeries.map((s) => [s.month, s.revenue])])}><Download className="size-3.5" /> Export CSV</Button></div>
        </TabsContent>

        <TabsContent value="leads">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 mb-5">
            <StatCard label="Total Leads" value={fLeads.length} icon={Target} tone="info" />
            <StatCard label="Conversion Rate" value={`${leadConversion}%`} icon={TrendingUp} tone="success" />
            <StatCard label="Qualified" value={fLeads.filter((l) => l.status === "QUALIFIED").length} icon={Target} tone="brand" />
            <StatCard label="Lost" value={fLeads.filter((l) => l.status === "LOST").length} icon={Target} tone="danger" />
          </div>
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <Card><CardHeader><CardTitle>Leads by Source</CardTitle></CardHeader><CardContent><DoughnutChart data={leadsBySource} /></CardContent></Card>
            <Card><CardHeader><CardTitle>Lead Funnel</CardTitle></CardHeader><CardContent><LeadFunnelChart data={funnel} /></CardContent></Card>
          </div>
          <div className="mt-4"><Button variant="outline" size="sm" onClick={() => downloadCsv("leads-report.csv", [["Source", "Count"], ...leadsBySource.map((s) => [s.name, s.value])])}><Download className="size-3.5" /> Export CSV</Button></div>
        </TabsContent>

        <TabsContent value="employees">
          <Card>
            <CardHeader><CardTitle>Employee Performance</CardTitle></CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full min-w-[600px] text-left text-sm">
                <thead className="text-xs uppercase text-muted border-b border-border">
                  <tr><th className="py-2">Employee</th><th className="py-2">Leads</th><th className="py-2">Deals Won</th><th className="py-2">Revenue</th><th className="py-2">Tasks Done</th><th className="py-2">Follow-ups Done</th></tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {employeePerf.map((e) => (
                    <tr key={e.name}><td className="py-2.5 font-medium text-foreground">{e.name}</td><td className="py-2.5">{e.leads}</td><td className="py-2.5">{e.deals}</td><td className="py-2.5">{formatCurrency(e.revenue)}</td><td className="py-2.5">{e.tasksCompleted}</td><td className="py-2.5">{e.followUpsCompleted}</td></tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
          <div className="mt-4"><Button variant="outline" size="sm" onClick={() => downloadCsv("employee-performance.csv", [["Employee", "Leads", "Deals Won", "Revenue", "Tasks Done", "Follow-ups Done"], ...employeePerf.map((e) => [e.name, e.leads, e.deals, e.revenue, e.tasksCompleted, e.followUpsCompleted])])}><Download className="size-3.5" /> Export CSV</Button></div>
        </TabsContent>

        <TabsContent value="customers">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 mb-5">
            <StatCard label="New Customers" value={fCustomers.length} icon={Users} tone="brand" />
            <StatCard label="Active Customers" value={activeCustomers} icon={Users} tone="success" />
            <StatCard label="Avg Customer Value" value={formatCurrency(fDeals.filter((d) => d.stage === "WON").reduce((s, d) => s + d.value, 0) / (fCustomers.length || 1))} icon={Wallet} tone="info" />
          </div>
          <Card><CardHeader><CardTitle>Customer Growth</CardTitle></CardHeader><CardContent>
            <div className="h-[220px]">
              <RevenueAreaChart data={customerGrowth.map((c) => ({ month: c.label, revenue: c.value }))} />
            </div>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="financial">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 mb-5">
            <StatCard label="Revenue" value={formatCurrency(totalRevenue)} icon={Wallet} tone="success" />
            <StatCard label="Payments Received" value={fPayments.length} icon={TrendingUp} tone="brand" />
            <StatCard label="Outstanding" value={formatCurrency(Math.max(outstanding, 0))} icon={Target} tone="warning" />
          </div>
          <Card><CardHeader><CardTitle>Revenue Trend</CardTitle></CardHeader><CardContent><RevenueAreaChart data={salesSeries} /></CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
