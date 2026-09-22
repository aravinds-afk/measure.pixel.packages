import { z } from "zod";

const passwordRule = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Z]/, "Include at least one uppercase letter")
  .regex(/[0-9]/, "Include at least one number");

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

export const employeeCreateSchema = employeeSchema.extend({
  password: passwordRule,
});
export type EmployeeCreateInput = z.infer<typeof employeeCreateSchema>;

export const resetPasswordFormSchema = z.object({
  password: passwordRule,
});
export type ResetEmployeePasswordInput = z.infer<typeof resetPasswordFormSchema>;

export function generateSecurePassword() {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghijkmnpqrstuvwxyz";
  const digits = "23456789";
  const symbols = "!@#$%&*";
  const all = upper + lower + digits + symbols;
  const pick = (chars: string) => chars[Math.floor(Math.random() * chars.length)];
  let pass = pick(upper) + pick(lower) + pick(digits) + pick(symbols);
  for (let i = 0; i < 8; i++) pass += pick(all);
  return pass.split("").sort(() => Math.random() - 0.5).join("");
}
