import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import SetupForm from "./setup-form";

export default async function SetupPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const user = await prisma.user.findUnique({ where: { id: session.sub }, include: { company: true } });
  if (!user?.company) redirect("/dashboard");
  if (user.company.onboarded) redirect("/dashboard");

  return <SetupForm company={{
    name: user.company.name,
    industry: user.company.industry ?? "",
    email: user.company.email ?? "",
    phone: user.company.phone ?? "",
    timezone: user.company.timezone,
    currency: user.company.currency,
    workingHours: user.company.workingHours,
  }} />;
}
