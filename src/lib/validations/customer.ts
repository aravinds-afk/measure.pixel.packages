import { z } from "zod";

export const customerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  company: z.string().optional(),
  email: z.string().min(1, "Email is required").email("Enter a valid email"),
  phone: z.string().min(6, "Enter a valid phone number"),
  status: z.enum(["ACTIVE", "INACTIVE", "PROSPECT", "CHURNED"]),
  industry: z.string().optional(),
  address: z.string().optional(),
  assignedToId: z.string().optional(),
  notes: z.string().optional(),
});
export type CustomerInput = z.infer<typeof customerSchema>;
