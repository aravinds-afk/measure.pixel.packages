"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Building2, Globe2, Clock, Wallet, CheckCircle2 } from "lucide-react";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { completeFirstTimeSetupAction } from "@/actions/auth";
import { useToast } from "@/components/ui/toast";

const INDUSTRIES = ["Software & SaaS", "IT Services", "E-commerce", "Manufacturing", "Healthcare", "Education", "FinTech", "Real Estate", "Logistics", "Other"];
const TIMEZONES = ["Asia/Kolkata", "Asia/Dubai", "Asia/Singapore", "Europe/London", "America/New_York", "America/Los_Angeles"];
const CURRENCIES = ["INR", "USD", "EUR", "GBP", "AED", "SGD"];

type CompanyDefaults = {
  name: string; industry: string; email: string; phone: string;
  timezone: string; currency: string; workingHours: string;
};

export default function SetupForm({ company }: { company: CompanyDefaults }) {
  const router = useRouter();
  const { toast } = useToast();
  const [form, setForm] = useState(company);
  const [pending, startTransition] = useTransition();

  function update<K extends keyof CompanyDefaults>(key: K, value: CompanyDefaults[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const res = await completeFirstTimeSetupAction({ companyName: form.name, ...form });
      if (!res.ok) {
        toast({ kind: "error", title: "Setup failed", description: res.error });
        return;
      }
      toast({ kind: "success", title: "Workspace configured", description: "Welcome to Measure Pixel." });
      router.push("/dashboard");
      router.refresh();
    });
  }

  return (
    <div className="min-h-svh bg-background flex flex-col items-center px-4 py-12">
      <Logo className="mb-8" />
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold text-foreground">Set up your workspace</h1>
          <p className="mt-1.5 text-sm text-muted">Tell us about your company to finish configuring Measure Pixel.</p>
        </div>

        <form onSubmit={handleSubmit}>
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2.5">
                <Building2 className="size-4 text-brand" />
                <CardTitle>Company details</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <Label required>Company name</Label>
                <Input value={form.name} onChange={(e) => update("name", e.target.value)} required />
              </div>
              <div>
                <Label required>Industry</Label>
                <Select value={form.industry} onChange={(e) => update("industry", e.target.value)}>
                  {INDUSTRIES.map((i) => <option key={i} value={i}>{i}</option>)}
                </Select>
              </div>
              <div>
                <Label>Company logo</Label>
                <div className="flex h-10 items-center rounded-lg border border-dashed border-border px-3 text-xs text-muted">
                  Drop a file or click to upload (optional)
                </div>
              </div>
              <div>
                <Label required>Contact email</Label>
                <Input type="email" value={form.email} onChange={(e) => update("email", e.target.value)} required />
              </div>
              <div>
                <Label required>Contact phone</Label>
                <Input value={form.phone} onChange={(e) => update("phone", e.target.value)} required />
              </div>
            </CardContent>
          </Card>

          <Card className="mt-5">
            <CardHeader>
              <div className="flex items-center gap-2.5">
                <Globe2 className="size-4 text-brand" />
                <CardTitle>Regional preferences</CardTitle>
              </div>
              <CardDescription />
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <Label required><Clock className="inline size-3.5 mr-1" />Time zone</Label>
                <Select value={form.timezone} onChange={(e) => update("timezone", e.target.value)}>
                  {TIMEZONES.map((t) => <option key={t} value={t}>{t}</option>)}
                </Select>
              </div>
              <div>
                <Label required><Wallet className="inline size-3.5 mr-1" />Currency</Label>
                <Select value={form.currency} onChange={(e) => update("currency", e.target.value)}>
                  {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </Select>
              </div>
              <div>
                <Label required>Working hours</Label>
                <Input value={form.workingHours} onChange={(e) => update("workingHours", e.target.value)} placeholder="09:30-18:30" required />
              </div>
            </CardContent>
          </Card>

          <div className="mt-6 flex items-center justify-between">
            <p className="text-xs text-muted">You can change these anytime from Settings &rarr; Company.</p>
            <Button type="submit" loading={pending} disabled={pending}>
              <CheckCircle2 className="size-4" /> {pending ? "Saving..." : "Finish setup"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
