import { z } from "zod";

export const emailSchema = z.object({
  customerId: z.string().optional(),
  leadId: z.string().optional(),
  subject: z.string().min(2, "Subject is required"),
  body: z.string().min(2, "Message body is required"),
});
export type EmailInput = z.infer<typeof emailSchema>;

export const EMAIL_TEMPLATES = [
  { name: "Introduction", subject: "Let's connect — Measure Pixel", body: "Hi {{name}},\n\nThanks for your interest in Measure Pixel. I'd love to set up a quick call to understand your requirements better.\n\nBest,\nMeasure Pixel Team" },
  { name: "Proposal follow-up", subject: "Following up on our proposal", body: "Hi {{name}},\n\nJust checking in on the proposal we shared last week. Happy to answer any questions.\n\nBest regards" },
  { name: "Invoice reminder", subject: "Your invoice is ready", body: "Hi {{name}},\n\nYour invoice is now available. Please let us know if you have any questions about payment." },
  { name: "Renewal notice", subject: "Time to renew your plan", body: "Hi {{name}},\n\nYour subscription is coming up for renewal. Let's schedule a quick call to discuss your continued success with Measure Pixel." },
];
