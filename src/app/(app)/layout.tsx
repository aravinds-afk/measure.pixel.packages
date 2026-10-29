import { AppShell } from "@/components/app-shell";
import { requirePageUser } from "@/server/auth";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requirePageUser();
  return <AppShell user={{ name: user.name, role: user.role }}>{children}</AppShell>;
}
