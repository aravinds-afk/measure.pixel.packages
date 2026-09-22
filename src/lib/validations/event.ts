import { z } from "zod";

export const eventSchema = z.object({
  title: z.string().min(2, "Title must be at least 2 characters"),
  type: z.enum(["meeting", "call", "demo", "deadline", "follow-up"]),
  start: z.string().min(1, "Start date/time is required"),
  end: z.string().min(1, "End date/time is required"),
  customerId: z.string().optional(),
  notes: z.string().optional(),
});
export type EventInput = z.infer<typeof eventSchema>;

export const EVENT_TYPES = ["meeting", "call", "demo", "deadline", "follow-up"] as const;
