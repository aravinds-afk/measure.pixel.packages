import "server-only";
import { prisma } from "@/lib/prisma";
import type { SessionPayload } from "@/lib/session";
import { scopedUserIds } from "@/lib/data/scope";
import { startOfMonth, subMonths, format } from "date-fns";

export async function getDashboardData(session: SessionPayload) {
  const userIds = await scopedUserIds(session);
  const assignedFilter = userIds ? { assignedToId: { in: userIds } } : {};
  const employeeFilter = userIds ? { employeeId: { in: userIds } } : {};

  const [
    totalCustomers, newLeadsCount, activeDeals, wonDeals, lostDeals,
    pendingTasks, todaysFollowUps, revenueAgg, pendingPaymentsAgg,
    allLeadsForFunnel, allDealsCount,
  ] = await Promise.all([
    prisma.customer.count({ where: userIds ? { assignedToId: { in: userIds } } : {} }),
    prisma.lead.count({ where: { ...assignedFilter, status: "NEW" } }),
    prisma.deal.count({ where: { ...assignedFilter, stage: { notIn: ["WON", "LOST"] } } }),
    prisma.deal.count({ where: { ...assignedFilter, stage: "WON" } }),
    prisma.deal.count({ where: { ...assignedFilter, stage: "LOST" } }),
    prisma.task.count({ where: { ...(userIds ? { assignedToId: { in: userIds } } : {}), status: { in: ["TODO", "IN_PROGRESS"] } } }),
    prisma.followUp.count({
      where: {
        ...(userIds ? { assignedToId: { in: userIds } } : {}),
        scheduledAt: { gte: startOfMonth(new Date()) },
        status: "PENDING",
      },
    }),
    prisma.payment.aggregate({ _sum: { amount: true } }),
    prisma.invoice.aggregate({ where: { status: { in: ["SENT", "OVERDUE", "PARTIALLY_PAID"] } }, _count: true }),
    prisma.lead.findMany({ where: assignedFilter, select: { status: true } }),
    prisma.deal.count({ where: assignedFilter }),
  ]);

  const conversionRate = allDealsCount > 0 ? Math.round((wonDeals / allDealsCount) * 100) : 0;

  // Revenue overview: last 6 months
  const months = Array.from({ length: 6 }).map((_, i) => subMonths(new Date(), 5 - i));
  const payments = await prisma.payment.findMany({ select: { amount: true, paidAt: true } });
  const revenueSeries = months.map((m) => {
    const label = format(m, "MMM");
    const monthTotal = payments
      .filter((p) => format(p.paidAt, "MMM yyyy") === format(m, "MMM yyyy"))
      .reduce((sum, p) => sum + p.amount, 0);
    return { month: label, revenue: Math.round(monthTotal) };
  });

  const deals = await prisma.deal.findMany({ where: assignedFilter, select: { stage: true, updatedAt: true, value: true } });
  const dealsSeries = months.map((m) => {
    const label = format(m, "MMM");
    const inMonth = deals.filter((d) => format(d.updatedAt, "MMM yyyy") === format(m, "MMM yyyy"));
    return {
      month: label,
      won: inMonth.filter((d) => d.stage === "WON").length,
      lost: inMonth.filter((d) => d.stage === "LOST").length,
    };
  });

  const funnelOrder = ["NEW", "CONTACTED", "QUALIFIED", "PROPOSAL", "NEGOTIATION", "WON"] as const;
  const leadFunnel = funnelOrder.map((status) => ({
    name: status.charAt(0) + status.slice(1).toLowerCase(),
    value: allLeadsForFunnel.filter((l) => l.status === status).length,
  }));

  const teamScopeIds = userIds ?? (await prisma.user.findMany({ where: { role: { not: "CUSTOMER" } }, select: { id: true } })).map((u) => u.id);
  const teamMembers = await prisma.user.findMany({
    where: { id: { in: teamScopeIds } },
    select: { id: true, name: true, avatar: true, designation: true },
  });
  const teamPerformance = await Promise.all(
    teamMembers.map(async (member) => {
      const [leadCount, dealCount, revenue, tasksCompleted] = await Promise.all([
        prisma.lead.count({ where: { assignedToId: member.id } }),
        prisma.deal.count({ where: { assignedToId: member.id, stage: "WON" } }),
        prisma.deal.aggregate({ where: { assignedToId: member.id, stage: "WON" }, _sum: { value: true } }),
        prisma.task.count({ where: { assignedToId: member.id, status: "COMPLETED" } }),
      ]);
      const totalDeals = await prisma.deal.count({ where: { assignedToId: member.id } });
      return {
        id: member.id,
        name: member.name,
        designation: member.designation ?? "",
        leads: leadCount,
        deals: dealCount,
        revenue: revenue._sum.value ?? 0,
        conversion: totalDeals > 0 ? Math.round((dealCount / totalDeals) * 100) : 0,
        tasksCompleted,
      };
    })
  );

  const recentActivities = await prisma.activity.findMany({
    where: userIds ? { userId: { in: userIds } } : {},
    orderBy: { createdAt: "desc" },
    take: 8,
    include: { user: { select: { name: true } } },
  });

  const upcomingTasks = await prisma.task.findMany({
    where: {
      ...(userIds ? { assignedToId: { in: userIds } } : {}),
      status: { in: ["TODO", "IN_PROGRESS"] },
    },
    orderBy: { dueDate: "asc" },
    take: 6,
    include: { customer: { select: { name: true } }, assignedTo: { select: { name: true } } },
  });

  return {
    kpis: {
      totalCustomers,
      newLeads: newLeadsCount,
      activeDeals,
      wonDeals,
      lostDeals,
      pendingTasks,
      todaysFollowUps,
      revenue: revenueAgg._sum.amount ?? 0,
      pendingInvoices: pendingPaymentsAgg._count,
      conversionRate,
    },
    revenueSeries,
    dealsSeries,
    leadFunnel,
    teamPerformance: teamPerformance.sort((a, b) => b.revenue - a.revenue),
    recentActivities,
    upcomingTasks,
  };
}
