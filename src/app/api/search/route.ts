import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ groups: [] }, { status: 401 });

  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return NextResponse.json({ groups: [] });

  const ci = { mode: "insensitive" as const };
  const [customers, leads, deals, employees, tasks, invoices, documents] = await Promise.all([
    prisma.customer.findMany({ where: { OR: [{ name: { contains: q, ...ci } }, { company: { contains: q, ...ci } }, { email: { contains: q, ...ci } }] }, take: 5 }),
    prisma.lead.findMany({ where: { OR: [{ name: { contains: q, ...ci } }, { company: { contains: q, ...ci } }] }, take: 5 }),
    prisma.deal.findMany({ where: { name: { contains: q, ...ci } }, take: 5 }),
    prisma.user.findMany({ where: { name: { contains: q, ...ci }, role: { not: "CUSTOMER" } }, take: 5 }),
    prisma.task.findMany({ where: { title: { contains: q, ...ci } }, take: 5 }),
    prisma.invoice.findMany({ where: { number: { contains: q, ...ci } }, take: 5 }),
    prisma.document.findMany({ where: { name: { contains: q, ...ci } }, take: 5 }),
  ]);

  const groups = [
    { label: "Customers", items: customers.map((c) => ({ id: c.id, title: c.name, subtitle: c.company ?? c.email, href: `/customers/${c.id}` })) },
    { label: "Leads", items: leads.map((l) => ({ id: l.id, title: l.name, subtitle: l.company ?? l.email, href: `/leads/${l.id}` })) },
    { label: "Deals", items: deals.map((d) => ({ id: d.id, title: d.name, subtitle: d.stage, href: `/deals/${d.id}` })) },
    { label: "Employees", items: employees.map((e) => ({ id: e.id, title: e.name, subtitle: e.designation ?? e.role, href: `/employees/${e.id}` })) },
    { label: "Tasks", items: tasks.map((t) => ({ id: t.id, title: t.title, subtitle: t.status, href: `/tasks?highlight=${t.id}` })) },
    { label: "Invoices", items: invoices.map((i) => ({ id: i.id, title: i.number, subtitle: i.status, href: `/invoices/${i.id}` })) },
    { label: "Documents", items: documents.map((d) => ({ id: d.id, title: d.name, subtitle: d.category, href: `/documents?highlight=${d.id}` })) },
  ].filter((g) => g.items.length > 0);

  return NextResponse.json({ groups });
}
