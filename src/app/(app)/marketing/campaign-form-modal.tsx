"use client";

import { useEffect, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Select, Label, FieldError } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { campaignSchema, type CampaignInput, CAMPAIGN_TYPES, CAMPAIGN_STATUSES } from "@/lib/validations/campaign";
import { createCampaignAction, updateCampaignAction } from "@/actions/campaigns";

type Campaign = {
  id: string; name: string; type: string; status: string; startDate: string; endDate: string | null;
  targetAudience: string | null; budget: number; revenue: number;
};

export default function CampaignFormModal({
  open, onOpenChange, campaign, onSuccess,
}: { open: boolean; onOpenChange: (o: boolean) => void; campaign: Campaign | null; onSuccess: () => void }) {
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const isEdit = !!campaign;

  const { register, handleSubmit, reset, setError, formState: { errors } } = useForm<CampaignInput>({
    resolver: zodResolver(campaignSchema),
    defaultValues: { type: "EMAIL", status: "DRAFT", budget: 0, revenue: 0 },
  });

  useEffect(() => {
    if (open) {
      reset(
        campaign
          ? { name: campaign.name, type: campaign.type as CampaignInput["type"], status: campaign.status as CampaignInput["status"], startDate: campaign.startDate.slice(0, 10), endDate: campaign.endDate?.slice(0, 10) ?? "", targetAudience: campaign.targetAudience ?? "", budget: campaign.budget, revenue: campaign.revenue }
          : { name: "", type: "EMAIL", status: "DRAFT", startDate: new Date().toISOString().slice(0, 10), endDate: "", targetAudience: "", budget: 0, revenue: 0 }
      );
    }
  }, [open, campaign, reset]);

  function onSubmit(data: CampaignInput) {
    startTransition(async () => {
      const res = isEdit ? await updateCampaignAction(campaign!.id, data) : await createCampaignAction(data);
      if (!res.ok) {
        toast({ kind: "error", title: "Could not save campaign", description: res.error });
        if (res.fieldErrors) for (const [k, v] of Object.entries(res.fieldErrors)) setError(k as keyof CampaignInput, { message: v });
        return;
      }
      toast({ kind: "success", title: isEdit ? "Campaign updated" : "Campaign created" });
      onSuccess();
    });
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? "Edit campaign" : "Create campaign"}
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button loading={pending} disabled={pending} onClick={handleSubmit(onSubmit)}>{isEdit ? "Save changes" : "Create campaign"}</Button>
        </>
      }
    >
      <form className="grid grid-cols-1 gap-4 sm:grid-cols-2" onSubmit={handleSubmit(onSubmit)}>
        <div className="sm:col-span-2">
          <Label required>Campaign name</Label>
          <Input {...register("name")} aria-invalid={!!errors.name} />
          <FieldError>{errors.name?.message}</FieldError>
        </div>
        <div>
          <Label required>Type</Label>
          <Select {...register("type")}>{CAMPAIGN_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}</Select>
        </div>
        <div>
          <Label required>Status</Label>
          <Select {...register("status")}>{CAMPAIGN_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}</Select>
        </div>
        <div>
          <Label required>Start date</Label>
          <Input type="date" {...register("startDate")} />
        </div>
        <div>
          <Label>End date</Label>
          <Input type="date" {...register("endDate")} />
        </div>
        <div>
          <Label required>Budget (₹)</Label>
          <Input type="number" min={0} {...register("budget", { valueAsNumber: true })} />
        </div>
        <div>
          <Label required>Revenue generated (₹)</Label>
          <Input type="number" min={0} {...register("revenue", { valueAsNumber: true })} />
        </div>
        <div className="sm:col-span-2">
          <Label>Target audience</Label>
          <Textarea rows={2} {...register("targetAudience")} placeholder="e.g. SMB founders, enterprise IT decision makers" />
        </div>
      </form>
    </Modal>
  );
}
