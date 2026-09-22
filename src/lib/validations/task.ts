import { z } from "zod";

export const taskSchema = z.object({
  title: z.string().min(2, "Title must be at least 2 characters"),
  description: z.string().optional(),
  assignedToId: z.string().optional(),
  customerId: z.string().optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]),
  dueDate: z.string().optional(),
  status: z.enum(["TODO", "IN_PROGRESS", "COMPLETED", "CANCELLED"]),
  reminder: z.boolean().optional(),
});
export type TaskInput = z.infer<typeof taskSchema>;

export const TASK_STATUSES = ["TODO", "IN_PROGRESS", "COMPLETED", "CANCELLED"] as const;
