import { Wordmark } from "@/components/ui";
import { LoginForm } from "./login-form";

export const metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-10"><Wordmark /></div>
        <h1 className="text-[28px] font-semibold tracking-[-0.02em]">Growth Advisor</h1>
        <p className="mb-8 mt-1 text-[15px] text-ink-2">Sign in to start an audit.</p>
        <LoginForm />
      </div>
    </main>
  );
}
