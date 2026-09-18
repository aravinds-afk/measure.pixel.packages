"use server";

import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createSession, destroySession, getSession } from "@/lib/session";
import { loginSchema, forgotPasswordSchema, resetPasswordSchema } from "@/lib/validations/auth";
import { homeForRole } from "@/lib/rbac";
import { redirect } from "next/navigation";
import crypto from "crypto";

export type ActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

export async function loginAction(input: unknown): Promise<ActionResult<{ redirectTo: string }>> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] = issue.message;
    return { ok: false, error: "Please fix the errors below.", fieldErrors };
  }

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email.toLowerCase() } });
  if (!user) {
    return { ok: false, error: "Invalid email or password." };
  }
  const valid = await bcrypt.compare(parsed.data.password, user.passwordHash);
  if (!valid) {
    return { ok: false, error: "Invalid email or password." };
  }

  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await prisma.activity.create({
    data: {
      userId: user.id,
      action: "LOGIN",
      module: "Auth",
      description: "logged into Measure Pixel",
    },
  });

  await createSession({
    sub: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    avatar: user.avatar,
  });

  return { ok: true, data: { redirectTo: homeForRole(user.role) } };
}

export async function logoutAction() {
  const session = await getSession();
  if (session) {
    await prisma.activity.create({
      data: { userId: session.sub, action: "LOGOUT", module: "Auth", description: "logged out of Measure Pixel" },
    });
  }
  await destroySession();
  redirect("/login");
}

export async function forgotPasswordAction(input: unknown): Promise<ActionResult<{ resetUrl?: string }>> {
  const parsed = forgotPasswordSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid email." };
  }

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email.toLowerCase() } });
  // Always behave the same way whether or not the account exists.
  if (user) {
    const token = crypto.randomBytes(24).toString("hex");
    await prisma.user.update({
      where: { id: user.id },
      data: { resetToken: token, resetTokenExpiry: new Date(Date.now() + 1000 * 60 * 30) },
    });
    return { ok: true, data: { resetUrl: `/reset-password?token=${token}` } };
  }

  return { ok: true, data: {} };
}

export async function resetPasswordAction(input: unknown): Promise<ActionResult> {
  const parsed = resetPasswordSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] = issue.message;
    return { ok: false, error: "Please fix the errors below.", fieldErrors };
  }

  const user = await prisma.user.findFirst({
    where: { resetToken: parsed.data.token, resetTokenExpiry: { gt: new Date() } },
  });
  if (!user) {
    return { ok: false, error: "This reset link is invalid or has expired." };
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash, resetToken: null, resetTokenExpiry: null },
  });

  return { ok: true };
}

export async function completeFirstTimeSetupAction(input: {
  companyName: string;
  industry: string;
  email: string;
  phone: string;
  timezone: string;
  currency: string;
  workingHours: string;
}): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Not authenticated." };

  const user = await prisma.user.findUnique({ where: { id: session.sub } });
  if (!user?.companyId) return { ok: false, error: "No company found." };

  await prisma.company.update({
    where: { id: user.companyId },
    data: {
      name: input.companyName,
      industry: input.industry,
      email: input.email,
      phone: input.phone,
      timezone: input.timezone,
      currency: input.currency,
      workingHours: input.workingHours,
      onboarded: true,
    },
  });

  return { ok: true };
}
