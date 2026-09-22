import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/misc";
import SupportClient from "./support-client";

export default async function PortalSupportPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const requests = await prisma.activity.findMany({
    where: { userId: session.sub, module: "Support" },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <PageHeader title="Support" description="Need help? Send us a message and we'll respond shortly." />
      <SupportClient initialRequests={requests.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() }))} />
    </div>
  );
}
