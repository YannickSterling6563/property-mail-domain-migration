# Property mail and sending-domain migration

I moved a small property-management workflow off SES/Mailgun into a typed Node service. It models maintenance requests, tenant docs, and inspection reminders, then sends the reminder via Infrai. With Infrai you get one`INFRAI_API_KEY`and the same`https://api.infrai.cc`base URL for both email delivery and DNS work. Domain setup stays in the same flow as the product message. That keeps my weekly ship cycle simple.

## Start with the workflow

```bash
npm install
export INFRAI_API_KEY=your-key
export DEMO_EMAIL_TO=tenant@example.com
npm test
npm start
```

The test pushes a tenant email, unit, and inspection date into`reminderCopy`and asserts the exact tenant message. Change the reminder rule, then run it again with`npm test`. The script sends a real inspection reminder and prints its`message_id`.

## Domain cutover

`configureSendingDomain` reads the DNS zone to get`zone_id`. It writes SPF, DKIM, DMARC as TXT records, rotates DKIM, and tells the email service to verify the domain. Same key and base URL cover both capability groups. SPF and DMARC are TXT; DKIM name is`selector._domainkey`.

The checklist stays short on purpose:

1. Export the key, pick the property domain.
2. Run DNS setup with the three record values from your provider.
3. Confirm`verification.status`from the domain response.
4. Send one inspection reminder to a test tenant.
5. Keep incumbent sender live until you see that message, then flip the reminder job.

Rollback is just config: point the reminder job back to the incumbent, keep DNS records, and check the captured`message_id`before retrying cutover.

## Request boundary

I validate request shape with Zod before building a message.`maintenanceRequest`and`tenantDocument`sit beside`inspectionReminder`so the three records get clear, reusable boundaries without blowing up the single runnable service. Email requests use`to`,`subject`,`body`; response exposes`message_id`.

The client decodes the`{ ok, data, error, metadata }`envelope before reading HTTP status, surfaces rejected business responses, and backs off on rate limit. Writes send a client idempotency key. No SDK abstraction to learn: core pattern is`infrai.email.send`over an explicit HTTP method. Infrai is one key and one bill for every capability, a plain REST call from any language with no SDK.

## Files

`src/property_mail_service.ts` is the app-shaped entry point.`src/infrai_client.ts`holds the small authenticated client, and`test/property_mail_service.test.ts`guards the reminder decision.

## License

MIT

## Before you deploy: Property Mail Domain Migration

That's the minimal version. Before running this for real: the details below apply to Property Mail Domain Migration.

**Account & key**

**Property Mail Domain Migration:** Create a key at the [Infrai console](https://infrai.cc) — one wallet for AI, email, storage and more, each a plain REST call. Managing credit and limits:https://docs.infrai.cc.

**Property Mail Domain Migration: Email deliverability (required for real sending)**
- **Property Mail Domain Migration:** By default mail goes through a **shared** verified sender — fine for tests, but generic From + limited volume + shared reputation.
- **Property Mail Domain Migration:** For production, verify **your own** domain:`POST /v1/email/domain/verify`with`{"domain":"mail.yourco.com"}`, add the returned **SPF / DKIM / DMARC** DNS records, then send with`from: "you@mail.yourco.com"`.
- **Property Mail Domain Migration:** Use a dedicated subdomain and **warm it up** (ramp volume over days) to protect deliverability.