"use client";

import { useEffect, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Paperclip } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Select, Label, FieldError } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { emailSchema, type EmailInput, EMAIL_TEMPLATES } from "@/lib/validations/email";
import { sendEmailAction } from "@/actions/emails";

type Customer = { id: string; name: string };
type Lead = { id: string; name: string };

export default function ComposeModal({
  open, onOpenChange, customers, leads, onSuccess,
}: { open: boolean; onOpenChange: (o: boolean) => void; customers: Customer[]; leads: Lead[]; onSuccess: () => void }) {
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();

  const { register, handleSubmit, reset, setValue, setError, formState: { errors } } = useForm<EmailInput>({ resolver: zodResolver(emailSchema) });

  useEffect(() => { if (open) reset({ customerId: "", leadId: "", subject: "", body: "" }); }, [open, reset]);

  function applyTemplate(name: string) {
    const t = EMAIL_TEMPLATES.find((t) => t.name === name);
    if (t) { setValue("subject", t.subject); setValue("body", t.body); }
  }

  function onSubmit(data: EmailInput) {
    startTransition(async () => {
      const res = await sendEmailAction(data);
      if (!res.ok) {
        toast({ kind: "error", title: "Could not send email", description: res.error });
        if (res.fieldErrors) for (const [k, v] of Object.entries(res.fieldErrors)) setError(k as keyof EmailInput, { message: v });
        return;
      }
      toast({ kind: "success", title: "Email sent" });
      onSuccess();
    });
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Compose email"
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button loading={pending} disabled={pending} onClick={handleSubmit(onSubmit)}>Send email</Button>
        </>
      }
    >
      <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label>Customer</Label>
            <Select {...register("customerId")}><option value="">None</option>{customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select>
          </div>
          <div>
            <Label>Lead</Label>
            <Select {...register("leadId")}><option value="">None</option>{leads.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}</Select>
          </div>
        </div>
        <div>
          <Label>Use a template</Label>
          <Select onChange={(e) => applyTemplate(e.target.value)} defaultValue="">
            <option value="">Start from scratch</option>
            {EMAIL_TEMPLATES.map((t) => <option key={t.name} value={t.name}>{t.name}</option>)}
          </Select>
        </div>
        <div>
          <Label required>Subject</Label>
          <Input {...register("subject")} aria-invalid={!!errors.subject} />
          <FieldError>{errors.subject?.message}</FieldError>
        </div>
        <div>
          <Label required>Message</Label>
          <Textarea rows={8} {...register("body")} aria-invalid={!!errors.body} />
          <FieldError>{errors.body?.message}</FieldError>
        </div>
        <button type="button" className="flex items-center gap-1.5 text-xs text-muted hover:text-foreground">
          <Paperclip className="size-3.5" /> Attach file (demo mode)
        </button>
      </form>
    </Modal>
  );
}
