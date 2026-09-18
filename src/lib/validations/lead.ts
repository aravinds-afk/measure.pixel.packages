import { z } from "zod";

export const leadSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  company: z.string().optional(),
  email: z.string().min(1, "Email is required").email("Enter a valid email"),
  phone: z.string().min(6, "Enter a valid phone number"),
  source: z.string().min(1, "Source is required"),
  industry: z.string().optional(),
  value: z.number().min(0, "Value must be positive"),
  status: z.enum(["NEW", "CONTACTED", "QUALIFIED", "PROPOSAL", "NEGOTIATION", "WON", "LOST"]),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]),
  assignedToId: z.string().optional(),
  nextFollowUp: z.string().optional(),
  notes: z.string().optional(),
});
export type LeadInput = z.infer<typeof leadSchema>;

export const LEAD_STATUSES = ["NEW", "CONTACTED", "QUALIFIED", "PROPOSAL", "NEGOTIATION", "WON", "LOST"] as const;
export const LEAD_SOURCES = ["Website", "Referral", "Cold Call", "LinkedIn", "Google Ads", "Webinar", "Trade Show"];
