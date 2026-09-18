import { z } from "zod";

export const callSchema = z.object({
  customerId: z.string().optional(),
  leadId: z.string().optional(),
  phone: z.string().min(6, "Enter a valid phone number"),
  direction: z.enum(["INCOMING", "OUTGOING", "MISSED"]),
  duration: z.number().min(0),
  outcome: z.enum(["CONNECTED", "NO_ANSWER", "BUSY", "INTERESTED", "NOT_INTERESTED", "FOLLOW_UP_REQUIRED"]),
  notes: z.string().optional(),
  nextFollowUp: z.string().optional(),
});
export type CallInput = z.infer<typeof callSchema>;

export const CALL_OUTCOMES = ["CONNECTED", "NO_ANSWER", "BUSY", "INTERESTED", "NOT_INTERESTED", "FOLLOW_UP_REQUIRED"] as const;
