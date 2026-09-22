"use client";

import { useEffect, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Select, Label, FieldError } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { eventSchema, type EventInput, EVENT_TYPES } from "@/lib/validations/event";
import { createEventAction } from "@/actions/events";

type Customer = { id: string; name: string };

export default function EventFormModal({
  open, onOpenChange, customers, defaultDate, onSuccess,
}: { open: boolean; onOpenChange: (o: boolean) => void; customers: Customer[]; defaultDate: Date | null; onSuccess: () => void }) {
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();

  const { register, handleSubmit, reset, setError, formState: { errors } } = useForm<EventInput>({
    resolver: zodResolver(eventSchema),
    defaultValues: { type: "meeting" },
  });

  useEffect(() => {
    if (open) {
      const base = defaultDate ?? new Date();
      const startStr = new Date(base.getTime() - base.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
      const endStr = new Date(base.getTime() + 30 * 60000 - base.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
      reset({ title: "", type: "meeting", start: startStr, end: endStr, customerId: "", notes: "" });
    }
  }, [open, defaultDate, reset]);

  function onSubmit(data: EventInput) {
    startTransition(async () => {
      const res = await createEventAction(data);
      if (!res.ok) {
        toast({ kind: "error", title: "Could not create event", description: res.error });
        if (res.fieldErrors) for (const [k, v] of Object.entries(res.fieldErrors)) setError(k as keyof EventInput, { message: v });
        return;
      }
      toast({ kind: "success", title: "Event created" });
      onSuccess();
    });
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="New calendar event"
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button loading={pending} disabled={pending} onClick={handleSubmit(onSubmit)}>Create event</Button>
        </>
      }
    >
      <form className="grid grid-cols-1 gap-4 sm:grid-cols-2" onSubmit={handleSubmit(onSubmit)}>
        <div className="sm:col-span-2">
          <Label required>Title</Label>
          <Input {...register("title")} aria-invalid={!!errors.title} />
          <FieldError>{errors.title?.message}</FieldError>
        </div>
        <div>
          <Label required>Type</Label>
          <Select {...register("type")}>{EVENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}</Select>
        </div>
        <div>
          <Label>Customer</Label>
          <Select {...register("customerId")}><option value="">None</option>{customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select>
        </div>
        <div>
          <Label required>Start</Label>
          <Input type="datetime-local" {...register("start")} aria-invalid={!!errors.start} />
          <FieldError>{errors.start?.message}</FieldError>
        </div>
        <div>
          <Label required>End</Label>
          <Input type="datetime-local" {...register("end")} aria-invalid={!!errors.end} />
          <FieldError>{errors.end?.message}</FieldError>
        </div>
        <div className="sm:col-span-2">
          <Label>Notes</Label>
          <Textarea rows={3} {...register("notes")} />
        </div>
      </form>
    </Modal>
  );
}
