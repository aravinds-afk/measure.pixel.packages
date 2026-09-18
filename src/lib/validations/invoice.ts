import { z } from "zod";

export const invoiceItemSchema = z.object({
  name: z.string().min(1, "Item name is required"),
  quantity: z.number().min(1),
  price: z.number().min(0),
});

export const invoiceSchema = z.object({
  customerId: z.string().min(1, "Customer is required"),
  dealId: z.string().optional(),
  issueDate: z.string().min(1),
  dueDate: z.string().min(1),
  tax: z.number().min(0).max(100),
  discount: z.number().min(0).max(100),
  status: z.enum(["DRAFT", "SENT", "PAID", "PARTIALLY_PAID", "OVERDUE", "CANCELLED"]),
  items: z.array(invoiceItemSchema).min(1, "Add at least one line item"),
});
export type InvoiceInput = z.infer<typeof invoiceSchema>;

export const INVOICE_STATUSES = ["DRAFT", "SENT", "PAID", "PARTIALLY_PAID", "OVERDUE", "CANCELLED"] as const;
export const PAYMENT_METHODS = ["Bank Transfer", "UPI", "Credit Card", "Debit Card", "Cheque", "Cash"];

export const paymentSchema = z.object({
  invoiceId: z.string().min(1),
  amount: z.number().min(1, "Amount must be greater than 0"),
  method: z.string().min(1),
});
export type PaymentInput = z.infer<typeof paymentSchema>;
