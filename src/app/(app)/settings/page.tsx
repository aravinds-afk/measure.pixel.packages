import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/misc";
import { getPermissionsMap } from "@/lib/permissions";
import SettingsClient from "./settings-client";

export default async function SettingsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const user = await prisma.user.findUnique({ where: { id: session.sub }, include: { company: true } });
  if (!user) redirect("/login");

  const company = user.company
    ? {
        name: user.company.name,
        industry: user.company.industry ?? "",
        address: user.company.address ?? "",
        phone: user.company.phone ?? "",
        email: user.company.email ?? "",
        website: user.company.website ?? "",
        taxId: user.company.taxId ?? "",
        timezone: user.company.timezone,
        currency: user.company.currency,
        workingHours: user.company.workingHours,
      }
    : null;

  const permissions = session.role === "SUPER_ADMIN" || session.role === "ADMIN" ? await getPermissionsMap() : null;

  return (
    <div>
      <PageHeader
        title="Settings"
        description="Configure your company, account and workspace preferences."
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Settings" }]}
      />
      <SettingsClient
        role={session.role}
        company={company}
        user={{ name: user.name, phone: user.phone ?? "", language: user.language, timezone: user.timezone }}
        permissions={permissions}
      />
    </div>
  );
}
