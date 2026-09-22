import { z } from "zod";

export const followUpSchema = z.object({
  type: z.enum(["PHONE", "EMAIL", "MEETING", "DEMO", "PROPOSAL", "PAYMENT"]),
  customerId: z.string().optional(),
  leadId: z.string().optional(),
  assignedToId: z.string().optional(),
  scheduledAt: z.string().min(1, "Date & time is required"),
  notes: z.string().optional(),
  reminder: z.boolean().optional(),
  status: z.enum(["PENDING", "COMPLETED", "OVERDUE", "CANCELLED"]),
});
export type FollowUpInput = z.infer<typeof followUpSchema>;

export const FOLLOWUP_TYPES = ["PHONE", "EMAIL", "MEETING", "DEMO", "PROPOSAL", "PAYMENT"] as const;
