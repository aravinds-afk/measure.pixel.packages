import { z } from "zod";

export const employeeSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().min(1, "Email is required").email("Enter a valid email"),
  phone: z.string().optional(),
  department: z.string().optional(),
  designation: z.string().optional(),
  role: z.enum(["SUPER_ADMIN", "ADMIN", "MANAGER", "SALES_EXECUTIVE", "EMPLOYEE"]),
  managerId: z.string().optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]),
});
export type EmployeeInput = z.infer<typeof employeeSchema>;
