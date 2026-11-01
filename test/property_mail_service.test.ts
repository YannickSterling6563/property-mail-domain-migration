import { strict as assert } from "node:assert";
import { reminderCopy } from "../src/property_mail_service.js";

const text = reminderCopy({ tenantEmail: "tenant@example.com", unit: "B-12", inspectionDate: "2026-11-04" });
assert.equal(text, "Inspection reminder for unit B-12: please be available on 2026-11-04.");
console.log("domain decision test passed");
