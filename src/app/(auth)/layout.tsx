import { redirect } from "next/navigation";
import { Logo } from "@/components/logo";
import { CheckCircle2 } from "lucide-react";
import { getSession } from "@/lib/session";
import { homeForRole } from "@/lib/rbac";

const POINTS = [
  "Manage customers, leads and deals in one workspace",
  "Role-based access for every team member",
  "Automations for follow-ups, tasks and reminders",
  "Real-time revenue and pipeline analytics",
];

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (session) redirect(homeForRole(session.role));

  return (
    <div className="grid min-h-svh grid-cols-1 lg:grid-cols-2 bg-background">
      <div className="flex flex-col justify-center px-6 py-12 sm:px-10 lg:px-16">
        <div className="mx-auto w-full max-w-sm">
          <Logo className="mb-10" />
          {children}
        </div>
      </div>
      <div className="relative hidden lg:flex flex-col justify-between overflow-hidden bg-gradient-to-br from-indigo-600 via-indigo-600 to-violet-700 p-12 text-white">
        <div className="absolute inset-0 opacity-20 [background-image:radial-gradient(circle_at_1px_1px,white_1px,transparent_0)] [background-size:24px_24px]" />
        <div className="relative">
          <p className="text-xs font-medium uppercase tracking-widest text-indigo-200">Measure Pixel CRM</p>
          <h2 className="mt-4 max-w-md text-3xl font-semibold leading-tight">
            Measure Relationships. Grow Your Business.
          </h2>
          <p className="mt-4 max-w-sm text-sm text-indigo-100">
            A modern CRM platform for managing customers, leads, sales, teams and business relationships from one powerful workspace.
          </p>
        </div>
        <div className="relative space-y-3">
          {POINTS.map((p) => (
            <div key={p} className="flex items-center gap-2.5 text-sm text-indigo-50">
              <CheckCircle2 className="size-4 shrink-0 text-indigo-200" />
              {p}
            </div>
          ))}
        </div>
        <div className="relative rounded-xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm">
          <p className="text-sm italic text-indigo-50">
            &ldquo;Measure Pixel gave our sales team one place to track every deal — our conversion rate is up 34% this quarter.&rdquo;
          </p>
          <p className="mt-2 text-xs text-indigo-200">Rohan Mehta, Sales Manager</p>
        </div>
      </div>
    </div>
  );
}
