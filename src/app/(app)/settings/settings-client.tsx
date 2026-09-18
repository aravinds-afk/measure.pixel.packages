"use client";

import { useEffect, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Check, Shield, Bell, Building2, User as UserIcon, Sliders } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Select, Label, FieldError } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { companySettingsSchema, type CompanySettingsInput, userSettingsSchema, type UserSettingsInput, passwordChangeSchema, type PasswordChangeInput } from "@/lib/validations/settings";
import { updateCompanySettingsAction, updateUserSettingsAction, changePasswordAction } from "@/actions/settings";
import { ROLE_LABELS, ROLES, ROLE_MODULES } from "@/lib/rbac";
import type { Role } from "@prisma/client";

type Company = { name: string; industry: string; address: string; phone: string; email: string; website: string; taxId: string; timezone: string; currency: string; workingHours: string };
type UserSettings = { name: string; phone: string; language: string; timezone: string };

const NOTIF_TYPES = [
  { key: "lead", label: "New lead assigned" }, { key: "task", label: "Task due reminders" },
  { key: "followup", label: "Follow-up reminders" }, { key: "deal", label: "Deal stage changes" },
  { key: "payment", label: "Payment received" }, { key: "invoice", label: "Invoice overdue" },
];

const PERMISSIONS = ["View", "Create", "Edit", "Delete", "Export"];

const CRM_DEFAULTS = {
  "Lead Statuses": ["New", "Contacted", "Qualified", "Proposal", "Negotiation", "Won", "Lost"],
  "Deal Stages": ["New", "Qualified", "Proposal", "Negotiation", "Won", "Lost"],
  "Customer Statuses": ["Active", "Inactive", "Prospect", "Churned"],
  "Task Priorities": ["Low", "Medium", "High", "Urgent"],
  "Payment Methods": ["Bank Transfer", "UPI", "Credit Card", "Debit Card", "Cheque", "Cash"],
};

export default function SettingsClient({ role, company, user }: { role: Role; company: Company | null; user: UserSettings }) {
  const isAdmin = role === "SUPER_ADMIN" || role === "ADMIN";

  return (
    <Tabs defaultValue="company">
      <TabsList className="flex-wrap">
        {isAdmin && <TabsTrigger value="company"><Building2 className="size-3.5 mr-1.5 inline" />Company</TabsTrigger>}
        <TabsTrigger value="account"><UserIcon className="size-3.5 mr-1.5 inline" />Account</TabsTrigger>
        {isAdmin && <TabsTrigger value="roles"><Shield className="size-3.5 mr-1.5 inline" />Roles & Permissions</TabsTrigger>}
        <TabsTrigger value="notifications"><Bell className="size-3.5 mr-1.5 inline" />Notifications</TabsTrigger>
        {isAdmin && <TabsTrigger value="crm"><Sliders className="size-3.5 mr-1.5 inline" />CRM Settings</TabsTrigger>}
      </TabsList>

      {isAdmin && company && (
        <TabsContent value="company"><CompanyTab company={company} /></TabsContent>
      )}
      <TabsContent value="account"><AccountTab user={user} /></TabsContent>
      {isAdmin && (
        <TabsContent value="roles"><RolesTab /></TabsContent>
      )}
      <TabsContent value="notifications"><NotificationsTab /></TabsContent>
      {isAdmin && (
        <TabsContent value="crm"><CrmTab /></TabsContent>
      )}
    </Tabs>
  );
}

function CompanyTab({ company }: { company: Company }) {
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const { register, handleSubmit, formState: { errors } } = useForm<CompanySettingsInput>({ resolver: zodResolver(companySettingsSchema), defaultValues: company });

  function onSubmit(data: CompanySettingsInput) {
    startTransition(async () => {
      const res = await updateCompanySettingsAction(data);
      if (!res.ok) { toast({ kind: "error", title: "Could not save", description: res.error }); return; }
      toast({ kind: "success", title: "Company settings updated" });
    });
  }

  return (
    <Card>
      <CardHeader><CardTitle>Company details</CardTitle><CardDescription>Visible on invoices and shared documents.</CardDescription></CardHeader>
      <CardContent>
        <form className="grid grid-cols-1 gap-4 sm:grid-cols-2" onSubmit={handleSubmit(onSubmit)}>
          <div className="sm:col-span-2"><Label required>Company name</Label><Input {...register("name")} aria-invalid={!!errors.name} /><FieldError>{errors.name?.message}</FieldError></div>
          <div><Label>Industry</Label><Input {...register("industry")} /></div>
          <div><Label>Website</Label><Input {...register("website")} /></div>
          <div><Label>Email</Label><Input {...register("email")} aria-invalid={!!errors.email} /><FieldError>{errors.email?.message}</FieldError></div>
          <div><Label>Phone</Label><Input {...register("phone")} /></div>
          <div className="sm:col-span-2"><Label>Address</Label><Input {...register("address")} /></div>
          <div><Label>Tax ID</Label><Input {...register("taxId")} /></div>
          <div><Label>Time zone</Label><Input {...register("timezone")} /></div>
          <div><Label>Currency</Label><Input {...register("currency")} /></div>
          <div><Label>Working hours</Label><Input {...register("workingHours")} /></div>
          <div className="sm:col-span-2"><Button type="submit" loading={pending} disabled={pending}>Save company settings</Button></div>
        </form>
      </CardContent>
    </Card>
  );
}

function AccountTab({ user }: { user: UserSettings }) {
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const { register, handleSubmit, formState: { errors } } = useForm<UserSettingsInput>({ resolver: zodResolver(userSettingsSchema), defaultValues: user });

  const [pwPending, startPwTransition] = useTransition();
  const { register: registerPw, handleSubmit: handlePwSubmit, reset: resetPw, setError: setPwError, formState: { errors: pwErrors } } = useForm<PasswordChangeInput>({ resolver: zodResolver(passwordChangeSchema) });

  function onSubmit(data: UserSettingsInput) {
    startTransition(async () => {
      const res = await updateUserSettingsAction(data);
      if (!res.ok) { toast({ kind: "error", title: "Could not save", description: res.error }); return; }
      toast({ kind: "success", title: "Profile updated" });
    });
  }

  function onPasswordSubmit(data: PasswordChangeInput) {
    startPwTransition(async () => {
      const res = await changePasswordAction(data);
      if (!res.ok) {
        toast({ kind: "error", title: "Could not change password", description: res.error });
        if (res.fieldErrors) for (const [k, v] of Object.entries(res.fieldErrors)) setPwError(k as keyof PasswordChangeInput, { message: v });
        return;
      }
      toast({ kind: "success", title: "Password changed" });
      resetPw({ currentPassword: "", newPassword: "", confirmPassword: "" });
    });
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader><CardTitle>Profile</CardTitle><CardDescription>Update your personal information.</CardDescription></CardHeader>
        <CardContent>
          <form className="grid grid-cols-1 gap-4 sm:grid-cols-2" onSubmit={handleSubmit(onSubmit)}>
            <div><Label required>Full name</Label><Input {...register("name")} aria-invalid={!!errors.name} /><FieldError>{errors.name?.message}</FieldError></div>
            <div><Label>Phone</Label><Input {...register("phone")} /></div>
            <div>
              <Label>Language</Label>
              <Select {...register("language")}><option value="en">English</option><option value="hi">Hindi</option><option value="es">Spanish</option></Select>
            </div>
            <div><Label>Time zone</Label><Input {...register("timezone")} /></div>
            <div className="sm:col-span-2"><Button type="submit" loading={pending} disabled={pending}>Save profile</Button></div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Change password</CardTitle></CardHeader>
        <CardContent>
          <form className="grid grid-cols-1 gap-4 sm:grid-cols-2" onSubmit={handlePwSubmit(onPasswordSubmit)}>
            <div className="sm:col-span-2"><Label required>Current password</Label><Input type="password" {...registerPw("currentPassword")} aria-invalid={!!pwErrors.currentPassword} /><FieldError>{pwErrors.currentPassword?.message}</FieldError></div>
            <div><Label required>New password</Label><Input type="password" {...registerPw("newPassword")} aria-invalid={!!pwErrors.newPassword} /><FieldError>{pwErrors.newPassword?.message}</FieldError></div>
            <div><Label required>Confirm new password</Label><Input type="password" {...registerPw("confirmPassword")} aria-invalid={!!pwErrors.confirmPassword} /><FieldError>{pwErrors.confirmPassword?.message}</FieldError></div>
            <div className="sm:col-span-2"><Button type="submit" loading={pwPending} disabled={pwPending}>Update password</Button></div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function isPermitted(role: Role, perm: string) {
  if (role === "SUPER_ADMIN") return true;
  if (perm === "Delete") return role === "ADMIN" || role === "MANAGER";
  return true;
}

function RolesTab() {
  return (
    <div className="space-y-5">
      <Card>
        <CardHeader><CardTitle>Permission matrix</CardTitle><CardDescription>What each role can view, create, edit, delete or export. This reflects the access rules enforced across the app — it's a reference, not an editable control.</CardDescription></CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[600px] text-left text-sm">
            <thead className="text-xs uppercase text-muted border-b border-border">
              <tr><th className="py-2">Role</th>{PERMISSIONS.map((p) => <th key={p} className="py-2 text-center">{p}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-border">
              {ROLES.filter((r) => r !== "CUSTOMER").map((role) => (
                <tr key={role}>
                  <td className="py-2.5 font-medium text-foreground">{ROLE_LABELS[role]}</td>
                  {PERMISSIONS.map((perm) => (
                    <td key={perm} className="py-2.5 text-center">
                      <span
                        className={cn(
                          "inline-flex size-6 items-center justify-center rounded-md border",
                          isPermitted(role, perm) ? "border-brand bg-brand text-white" : "border-border bg-surface text-transparent"
                        )}
                      >
                        <Check className="size-3.5" />
                      </span>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Module access by role</CardTitle><CardDescription>Reference of which modules each role can navigate to.</CardDescription></CardHeader>
        <CardContent className="space-y-3">
          {ROLES.map((role) => (
            <div key={role} className="flex flex-wrap items-center gap-2 rounded-lg border border-border p-3">
              <Badge tone="brand">{ROLE_LABELS[role]}</Badge>
              <div className="flex flex-wrap gap-1.5">
                {ROLE_MODULES[role].map((m) => <span key={m} className="rounded bg-surface-2 px-2 py-0.5 text-xs text-muted capitalize">{m}</span>)}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function NotificationsTab() {
  const [prefs, setPrefs] = useState<Record<string, boolean>>({});

  useEffect(() => {
    try {
      const stored = localStorage.getItem("mp-notif-prefs");
      if (stored) setPrefs(JSON.parse(stored));
    } catch {}
  }, []);

  function toggle(key: string) {
    setPrefs((p) => {
      const next = { ...p, [key]: !(p[key] ?? true) };
      try { localStorage.setItem("mp-notif-prefs", JSON.stringify(next)); } catch {}
      return next;
    });
  }

  return (
    <Card>
      <CardHeader><CardTitle>Notification preferences</CardTitle><CardDescription>Choose which alerts you want to receive.</CardDescription></CardHeader>
      <CardContent className="space-y-1">
        {NOTIF_TYPES.map((n) => (
          <div key={n.key} className="flex items-center justify-between border-b border-border py-3 last:border-0">
            <span className="text-sm text-foreground">{n.label}</span>
            <button
              onClick={() => toggle(n.key)}
              className={cn("h-6 w-11 rounded-full transition-colors relative", (prefs[n.key] ?? true) ? "bg-brand" : "bg-surface-2")}
            >
              <span className={cn("absolute top-0.5 size-5 rounded-full bg-white transition-transform shadow", (prefs[n.key] ?? true) ? "translate-x-5" : "translate-x-0.5")} />
            </button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function CrmTab() {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
      {Object.entries(CRM_DEFAULTS).map(([title, values]) => (
        <Card key={title}>
          <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {values.map((v) => <Badge key={v} tone="neutral">{v}</Badge>)}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
