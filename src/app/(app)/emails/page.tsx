import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { scopedUserIds } from "@/lib/data/scope";
import { PageHeader } from "@/components/ui/misc";
import EmailsClient from "./emails-client";

export default async function EmailsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const userIds = await scopedUserIds(session);
  const [emails, customers, leads] = await Promise.all([
    prisma.email.findMany({
      where: userIds ? { employeeId: { in: userIds } } : {},
      include: { customer: { select: { id: true, name: true } }, lead: { select: { id: true, name: true } }, employee: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.customer.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.lead.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div>
      <PageHeader
        title="Emails"
        description="Compose, send and track every email conversation."
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Emails" }]}
      />
      <EmailsClient initialEmails={emails.map((e) => ({ ...e, createdAt: e.createdAt.toISOString() }))} customers={customers} leads={leads} />
    </div>
  );
}
