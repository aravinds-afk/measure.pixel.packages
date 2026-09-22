"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { campaignSchema } from "@/lib/validations/campaign";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/actions/auth";

function normalize(data: ReturnType<typeof campaignSchema.parse>) {
  return { ...data, startDate: new Date(data.startDate), endDate: data.endDate ? new Date(data.endDate) : null };
}

export async function createCampaignAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Not authenticated." };

  const parsed = campaignSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] = issue.message;
    return { ok: false, error: "Please fix the errors below.", fieldErrors };
  }

  const campaign = await prisma.campaign.create({ data: normalize(parsed.data) });
  await prisma.activity.create({ data: { userId: session.sub, action: "CREATE", module: "Campaign", description: `created campaign ${campaign.name}` } });

  revalidatePath("/marketing");
  return { ok: true, data: { id: campaign.id } };
}

export async function updateCampaignAction(id: string, input: unknown): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Not authenticated." };

  const parsed = campaignSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] = issue.message;
    return { ok: false, error: "Please fix the errors below.", fieldErrors };
  }

  await prisma.campaign.update({ where: { id }, data: normalize(parsed.data) });
  revalidatePath("/marketing");
  return { ok: true };
}

export async function deleteCampaignAction(id: string): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Not authenticated." };

  await prisma.lead.updateMany({ where: { campaignId: id }, data: { campaignId: null } });
  await prisma.campaign.delete({ where: { id } });
  revalidatePath("/marketing");
  return { ok: true };
}
