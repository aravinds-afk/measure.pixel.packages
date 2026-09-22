import { z } from "zod";

export const campaignSchema = z.object({
  name: z.string().min(2, "Campaign name must be at least 2 characters"),
  type: z.enum(["EMAIL", "SOCIAL", "SEARCH", "EVENT", "REFERRAL"]),
  status: z.enum(["DRAFT", "ACTIVE", "PAUSED", "COMPLETED"]),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().optional(),
  targetAudience: z.string().optional(),
  budget: z.number().min(0),
  revenue: z.number().min(0),
});
export type CampaignInput = z.infer<typeof campaignSchema>;

export const CAMPAIGN_TYPES = ["EMAIL", "SOCIAL", "SEARCH", "EVENT", "REFERRAL"] as const;
export const CAMPAIGN_STATUSES = ["DRAFT", "ACTIVE", "PAUSED", "COMPLETED"] as const;
