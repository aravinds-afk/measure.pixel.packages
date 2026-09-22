"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import RecordPaymentModal from "./record-payment-modal";

export default function InvoiceDetailClient({ invoiceId, balanceDue }: { invoiceId: string; balanceDue: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  if (balanceDue <= 0) return null;
  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}><Plus className="size-3.5" /> Record Payment</Button>
      <RecordPaymentModal open={open} onOpenChange={setOpen} invoiceId={invoiceId} balanceDue={balanceDue} onSuccess={() => { setOpen(false); router.refresh(); }} />
    </>
  );
}
