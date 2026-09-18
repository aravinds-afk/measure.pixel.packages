import { z } from "zod";

export const companySettingsSchema = z.object({
  name: z.string().min(2, "Company name is required"),
  industry: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("Enter a valid email").optional().or(z.literal("")),
  website: z.string().optional(),
  taxId: z.string().optional(),
  timezone: z.string(),
  currency: z.string(),
  workingHours: z.string(),
});
export type CompanySettingsInput = z.infer<typeof companySettingsSchema>;

export const userSettingsSchema = z.object({
  name: z.string().min(2, "Name is required"),
  phone: z.string().optional(),
  language: z.string(),
  timezone: z.string(),
});
export type UserSettingsInput = z.infer<typeof userSettingsSchema>;

export const passwordChangeSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, { message: "Passwords do not match", path: ["confirmPassword"] });
export type PasswordChangeInput = z.infer<typeof passwordChangeSchema>;
