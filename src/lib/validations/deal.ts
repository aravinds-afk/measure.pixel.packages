import { z } from "zod";

export const dealSchema = z.object({
  name: z.string().min(2, "Deal name must be at least 2 characters"),
  customerId: z.string().optional(),
  leadId: z.string().optional(),
  value: z.number().min(0, "Value must be positive"),
  probability: z.number().min(0).max(100),
  stage: z.enum(["NEW", "QUALIFIED", "PROPOSAL", "NEGOTIATION", "WON", "LOST"]),
  expectedClose: z.string().optional(),
  assignedToId: z.string().optional(),
  notes: z.string().optional(),
  lostReason: z.string().optional(),
});
export type DealInput = z.infer<typeof dealSchema>;

export const DEAL_STAGES = ["NEW", "QUALIFIED", "PROPOSAL", "NEGOTIATION", "WON", "LOST"] as const;
