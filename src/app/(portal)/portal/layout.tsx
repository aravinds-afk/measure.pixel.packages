import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { PortalShell } from "@/components/app-shell/portal-shell";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "CUSTOMER") redirect("/dashboard");

  return <PortalShell name={session.name}>{children}</PortalShell>;
}
