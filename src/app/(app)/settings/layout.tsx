import { Notice, PageHeader } from "@/components/ui";
import { requirePageUser } from "@/server/auth";
import { SettingsNav } from "./settings-nav";

export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  const user = await requirePageUser();
  if (user.role !== "admin")
    return (
      <div>
        <PageHeader eyebrow="Settings" title="Settings" />
        <Notice tone="info" title="Admin only">Catalogue, pricing, rules and integrations are managed by an admin. Signed in as {user.name} ({user.email}).</Notice>
      </div>
    );
  return (
    <div>
      <PageHeader eyebrow="Settings" title="Administration" subtitle="Changes apply to new audits and quotations. Issued quotations keep their snapshot." />
      <SettingsNav />
      <div className="mt-6">{children}</div>
    </div>
  );
}
