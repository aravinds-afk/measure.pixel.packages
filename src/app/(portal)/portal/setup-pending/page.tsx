import { EmptyState } from "@/components/ui/misc";
import { Building2 } from "lucide-react";

export default function SetupPendingPage() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <EmptyState icon={Building2} title="Account not linked yet" description="Your customer account hasn't been linked to a company record. Please contact your account manager." />
    </div>
  );
}
