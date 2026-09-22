"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRightLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { convertLeadToCustomerAction } from "@/actions/leads";

export default function ConvertButton({ id }: { id: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      loading={pending}
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const res = await convertLeadToCustomerAction(id);
          if (!res.ok) { toast({ kind: "error", title: "Could not convert lead", description: res.error }); return; }
          toast({ kind: "success", title: "Lead converted to customer" });
          router.push(`/customers/${res.data!.customerId}`);
        })
      }
    >
      <ArrowRightLeft className="size-4" /> Convert to Customer
    </Button>
  );
}
