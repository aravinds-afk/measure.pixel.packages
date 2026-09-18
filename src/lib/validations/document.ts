import { z } from "zod";

export const documentSchema = z.object({
  name: z.string().min(1, "File name is required"),
  category: z.enum(["CONTRACT", "PROPOSAL", "INVOICE", "CUSTOMER", "INTERNAL"]),
  customerId: z.string().optional(),
  size: z.number().min(0),
  fileType: z.string().min(1),
});
export type DocumentInput = z.infer<typeof documentSchema>;

export const DOCUMENT_CATEGORIES = ["CONTRACT", "PROPOSAL", "INVOICE", "CUSTOMER", "INTERNAL"] as const;
