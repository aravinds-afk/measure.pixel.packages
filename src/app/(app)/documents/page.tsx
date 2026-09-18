import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/misc";
import DocumentsClient from "./documents-client";

export default async function DocumentsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const [documents, customers] = await Promise.all([
    prisma.document.findMany({
      include: { customer: { select: { id: true, name: true } }, uploadedBy: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.customer.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div>
      <PageHeader
        title="Documents"
        description="Contracts, proposals, invoices and internal files in one place."
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Documents" }]}
      />
      <DocumentsClient initialDocuments={documents.map((d) => ({ ...d, createdAt: d.createdAt.toISOString() }))} customers={customers} />
    </div>
  );
}
