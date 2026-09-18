import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/misc";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils";
import InvoiceDetailClient from "./invoice-detail-client";

export default async function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) redirect("/login");

  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: { customer: true, items: true, payments: true, deal: { select: { name: true } } },
  });
  if (!invoice) notFound();

  const subtotal = invoice.items.reduce((s, it) => s + it.price * it.quantity, 0);
  const total = subtotal * (1 + invoice.tax / 100) * (1 - invoice.discount / 100);
  const paid = invoice.payments.reduce((s, p) => s + p.amount, 0);
  const balanceDue = total - paid;

  return (
    <div>
      <PageHeader
        title={invoice.number}
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Invoices", href: "/invoices" }, { label: invoice.number }]}
        actions={<InvoiceDetailClient invoiceId={invoice.id} balanceDue={balanceDue} />}
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardContent className="p-6">
            <div className="flex items-start justify-between border-b border-border pb-5">
              <div>
                <p className="text-lg font-semibold text-foreground">Measure Pixel Labs Pvt Ltd</p>
                <p className="text-sm text-muted mt-1">Bill to: <Link href={`/customers/${invoice.customer.id}`} className="text-brand hover:underline">{invoice.customer.name}</Link></p>
                <p className="text-xs text-muted">{invoice.customer.email}</p>
              </div>
              <StatusBadge status={invoice.status} />
            </div>
            <div className="grid grid-cols-2 gap-4 py-5 text-sm sm:grid-cols-3">
              <div><p className="text-xs text-muted">Issue date</p><p className="font-medium text-foreground">{formatDate(invoice.issueDate)}</p></div>
              <div><p className="text-xs text-muted">Due date</p><p className="font-medium text-foreground">{formatDate(invoice.dueDate)}</p></div>
              {invoice.deal && <div><p className="text-xs text-muted">Linked deal</p><p className="font-medium text-foreground">{invoice.deal.name}</p></div>}
            </div>
            <table className="w-full text-left text-sm">
              <thead className="border-y border-border text-xs uppercase text-muted">
                <tr><th className="py-2">Item</th><th className="py-2">Qty</th><th className="py-2">Price</th><th className="py-2 text-right">Total</th></tr>
              </thead>
              <tbody className="divide-y divide-border">
                {invoice.items.map((it) => (
                  <tr key={it.id}><td className="py-2.5 text-foreground">{it.name}</td><td className="py-2.5">{it.quantity}</td><td className="py-2.5">{formatCurrency(it.price)}</td><td className="py-2.5 text-right text-foreground">{formatCurrency(it.price * it.quantity)}</td></tr>
                ))}
              </tbody>
            </table>
            <div className="ml-auto mt-4 w-full max-w-xs space-y-1.5 text-sm">
              <div className="flex justify-between text-muted"><span>Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
              <div className="flex justify-between text-muted"><span>Tax ({invoice.tax}%)</span><span>{formatCurrency(subtotal * (invoice.tax / 100))}</span></div>
              {invoice.discount > 0 && <div className="flex justify-between text-muted"><span>Discount ({invoice.discount}%)</span><span>-{formatCurrency(subtotal * (invoice.discount / 100))}</span></div>}
              <div className="flex justify-between border-t border-border pt-2 text-base font-semibold text-foreground"><span>Total</span><span>{formatCurrency(total)}</span></div>
              <div className="flex justify-between text-success"><span>Paid</span><span>{formatCurrency(paid)}</span></div>
              <div className="flex justify-between font-medium text-foreground"><span>Balance due</span><span>{formatCurrency(balanceDue)}</span></div>
            </div>
          </CardContent>
        </Card>

        <Card className="h-fit">
          <CardContent className="p-5">
            <p className="mb-3 text-sm font-semibold text-foreground">Payment history</p>
            {invoice.payments.length === 0 ? (
              <p className="text-sm text-muted">No payments recorded yet.</p>
            ) : (
              <div className="space-y-2">
                {invoice.payments.map((p) => (
                  <div key={p.id} className="rounded-lg border border-border p-3 text-sm">
                    <div className="flex items-center justify-between"><span className="font-medium text-foreground">{formatCurrency(p.amount)}</span><StatusBadge status={p.status} /></div>
                    <p className="mt-1 text-xs text-muted">{p.method} · {formatDateTime(p.paidAt)}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
