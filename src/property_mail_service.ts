import { z } from "zod";
import { infrai } from "./infrai_client.js";

export const maintenanceRequest = z.object({ tenantEmail: z.string().email(), unit: z.string().min(1), issue: z.string().min(1) });
export const tenantDocument = z.object({ tenantEmail: z.string().email(), documentName: z.string().min(1), downloadNote: z.string().min(1) });
export const inspectionReminder = z.object({ tenantEmail: z.string().email(), unit: z.string().min(1), inspectionDate: z.string().min(1) });
export type Reminder = z.infer<typeof inspectionReminder>;

export function reminderCopy(input: Reminder): string {
  const value = inspectionReminder.parse(input);
  return `Inspection reminder for unit ${value.unit}: please be available on ${value.inspectionDate}.`;
}

export async function configureSendingDomain(domain: string, records: { spf: string; dkim: string; dmarc: string }) {
  const zone = await infrai.dns.domain.get(domain);
  for (const [name, content] of [["@", records.spf], ["selector._domainkey", records.dkim], ["_dmarc", records.dmarc]] as const) {
    await infrai.dns.record.upsert({ zone_id: zone.zone_id, record_type: "TXT", name, content, ttl: 3600 });
  }
  await infrai.email.domain.rotate_dkim(domain);
  return infrai.email.domain.verify(domain);
}

export async function sendInspectionReminder(input: Reminder) {
  const value = inspectionReminder.parse(input);
  return infrai.email.send({ to: value.tenantEmail, subject: `Inspection reminder for ${value.unit}`, body: reminderCopy(value) });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const to = process.env.DEMO_EMAIL_TO;
  if (!to) throw new Error("Set DEMO_EMAIL_TO to run the example");
  const result = await sendInspectionReminder({ tenantEmail: to, unit: "A-204", inspectionDate: "2026-11-04" });
  console.log(`inspection reminder accepted: ${result.message_id}`);
}
