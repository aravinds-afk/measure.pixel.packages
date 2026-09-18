"use client";

import Link from "next/link";
import { DataTable, type Column } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/badge";
import { formatCurrency, formatDateTime } from "@/lib/utils";

type Payment = {
  id: string; amount: number; method: string; status: string; paidAt: string;
  customer: { id: string; name: string }; invoice: { number: string };
};

export default function PaymentsClient({ initialPayments }: { initialPayments: Payment[] }) {
  const columns: Column<Payment>[] = [
    { key: "invoice", header: "Invoice", render: (p) => <Link href={`/invoices`} className="font-medium text-brand hover:underline">{p.invoice.number}</Link> },
    { key: "customer", header: "Customer", render: (p) => p.customer.name },
    { key: "amount", header: "Amount", sortable: true, render: (p) => formatCurrency(p.amount), exportValue: (p) => String(p.amount) },
    { key: "method", header: "Method", render: (p) => p.method, hideOnMobile: true },
    { key: "status", header: "Status", render: (p) => <StatusBadge status={p.status} />, exportValue: (p) => p.status },
    { key: "paidAt", header: "Date", sortable: true, render: (p) => formatDateTime(p.paidAt) },
  ];

  return (
    <DataTable
      data={initialPayments}
      columns={columns}
      getId={(p) => p.id}
      searchPlaceholder="Search payments..."
      searchFn={(p, q) => [p.customer.name, p.invoice.number, p.method].join(" ").toLowerCase().includes(q.toLowerCase())}
      exportName="payments"
      emptyTitle="No payments recorded"
      emptyDescription="Payments will appear here once invoices are paid."
    />
  );
}
