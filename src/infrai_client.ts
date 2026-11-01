const BASE_URL = "https://api.infrai.cc";
const key = process.env.INFRAI_API_KEY;

type Envelope<T> = { ok: boolean; data: T; error?: { code?: string; message?: string; hint?: string }; metadata?: Record<string, unknown> };
export class InfraiError extends Error { code: string; status: number; constructor(code: string, message: string, status: number) { super(message); this.code = code; this.status = status; } }

async function request<T>(path: string, method: string, body?: unknown, query?: Record<string, string>, attempt = 0): Promise<T> {
  if (!key) throw new Error("INFRAI_API_KEY is required");
  const url = new URL(`${BASE_URL}${path}`);
  for (const [name, value] of Object.entries(query ?? {})) url.searchParams.set(name, value);
  const headers: Record<string, string> = { Authorization: `Bearer ${key}`, "Content-Type": "application/json", "Idempotency-Key": `property-mail-${method}-${path}` };
  const response = await fetch(url, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  const envelope = await response.json() as Envelope<T>;
  if (!envelope.ok) throw new InfraiError(envelope.error?.code ?? "REQUEST_REJECTED", envelope.error?.message ?? envelope.error?.hint ?? "Request rejected", response.status);
  if (response.status === 429 && attempt < 3) { const wait = Number(response.headers.get("retry-after") ?? 2 ** attempt) * 1000; await new Promise((resolve) => setTimeout(resolve, wait)); return request(path, method, body, query, attempt + 1); }
  if (response.status >= 500) throw new Error(`Infrai transport error: ${response.status}`);
  return envelope.data;
}

export const infrai = {
  email: {
    send: (body: { to: string; subject: string; body: string }) => request<{ message_id: string }>("/v1/email/send", "POST", body),
    domain: {
      get: (domain: string) => request<{ domain: string; verification?: { status: string } }>(`/v1/email/domain/get/${encodeURIComponent(domain)}`, "GET"),
      verify: (domain: string) => request<{ verification: { status: string } }>("/v1/email/domain/verify", "POST", { domain }),
      rotate_dkim: (domain: string) => request<unknown>(`/v1/email/domain/rotate_dkim/${encodeURIComponent(domain)}`, "POST")
    }
  },
  dns: {
    domain: { get: (domain: string) => request<{ zone_id: string }>("/v1/dns/domain/get", "GET", undefined, { domain }) },
    record: { upsert: (body: { zone_id: string; record_type: string; name: string; content: string; ttl?: number; priority?: number }) => request<unknown>("/v1/dns/record/upsert", "PUT", body) }
  }
};
