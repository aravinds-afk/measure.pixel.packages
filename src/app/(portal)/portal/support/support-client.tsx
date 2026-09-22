"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Send } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Label } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/misc";
import { useToast } from "@/components/ui/toast";
import { timeAgo } from "@/lib/utils";
import { createSupportRequestAction } from "@/actions/support";
import { LifeBuoy } from "lucide-react";

type Request = { id: string; description: string; createdAt: string };

export default function SupportClient({ initialRequests }: { initialRequests: Request[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const res = await createSupportRequestAction({ subject, message });
      if (!res.ok) { toast({ kind: "error", title: "Could not submit request", description: res.error }); return; }
      toast({ kind: "success", title: "Support request submitted" });
      setSubject(""); setMessage("");
      router.refresh();
    });
  }

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
      <Card className="lg:col-span-1 h-fit">
        <CardContent className="p-5">
          <p className="mb-3 text-sm font-semibold text-foreground">New support request</p>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div><Label required>Subject</Label><Input value={subject} onChange={(e) => setSubject(e.target.value)} required /></div>
            <div><Label required>Message</Label><Textarea rows={4} value={message} onChange={(e) => setMessage(e.target.value)} required /></div>
            <Button type="submit" className="w-full" loading={pending} disabled={pending}><Send className="size-4" /> Submit request</Button>
          </form>
        </CardContent>
      </Card>
      <div className="lg:col-span-2">
        <p className="mb-3 text-sm font-semibold text-foreground">Your requests</p>
        {initialRequests.length === 0 ? (
          <EmptyState icon={LifeBuoy} title="No support requests yet" description="Submit a request and our team will get back to you." />
        ) : (
          <div className="space-y-2">
            {initialRequests.map((r) => (
              <Card key={r.id} className="p-4">
                <p className="text-sm text-foreground">{r.description}</p>
                <p className="mt-1 text-xs text-muted">{timeAgo(r.createdAt)}</p>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
