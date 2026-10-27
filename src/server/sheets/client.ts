import "server-only";
import { importPKCS8, SignJWT } from "jose";

/**
 * Google Sheets REST client authenticated as a service account (server-side
 * only). Credentials come from environment variables and never reach the
 * browser, the database or the spreadsheet.
 */

export type SheetsConfig = { email: string; privateKey: string; spreadsheetId: string };

export function getSheetsConfig(): SheetsConfig | null {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = process.env.GOOGLE_PRIVATE_KEY;
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
  if (!email || !key || !spreadsheetId) return null;
  return { email, privateKey: key.replace(/\\n/g, "\n"), spreadsheetId };
}

export class SheetsError extends Error {
  constructor(message: string, public status?: number, public retryable = false) {
    super(message);
  }
}

let cached: { token: string; exp: number; email: string } | null = null;

async function accessToken(cfg: SheetsConfig): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cached && cached.email === cfg.email && cached.exp - 60 > now) return cached.token;
  let key;
  try {
    key = await importPKCS8(cfg.privateKey, "RS256");
  } catch {
    throw new SheetsError("GOOGLE_PRIVATE_KEY is not a valid PKCS#8 private key");
  }
  const assertion = await new SignJWT({ scope: "https://www.googleapis.com/auth/spreadsheets" })
    .setProtectedHeader({ alg: "RS256", typ: "JWT" })
    .setIssuer(cfg.email)
    .setAudience("https://oauth2.googleapis.com/token")
    .setIssuedAt(now)
    .setExpirationTime(now + 3600)
    .sign(key);
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error_description?: string; error?: string };
    throw new SheetsError(`Google auth failed: ${body.error_description ?? body.error ?? res.status}`, res.status, res.status >= 500);
  }
  const data = (await res.json()) as { access_token: string; expires_in: number };
  cached = { token: data.access_token, exp: now + data.expires_in, email: cfg.email };
  return data.access_token;
}

/** Authenticated call to the Sheets API with bounded retries on 429/5xx. */
export async function sheetsRequest<T>(cfg: SheetsConfig, path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(cfg.spreadsheetId)}${path}`;
  let lastErr: SheetsError | null = null;
  for (let attempt = 0; attempt < 4; attempt++) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, 500 * 2 ** attempt));
    const token = await accessToken(cfg);
    let res: Response;
    try {
      res = await fetch(url, {
        method: init.method ?? "GET",
        headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
        body: init.body === undefined ? undefined : JSON.stringify(init.body),
        signal: AbortSignal.timeout(15_000),
      });
    } catch (e) {
      lastErr = new SheetsError(`Network error talking to Google Sheets (${(e as Error).name})`, undefined, true);
      continue;
    }
    if (res.ok) return (await res.json()) as T;
    const body = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
    const message = body.error?.message ?? `HTTP ${res.status}`;
    lastErr = new SheetsError(`Google Sheets: ${message}`, res.status, res.status === 429 || res.status >= 500);
    if (res.status === 401) cached = null;
    if (!lastErr.retryable && res.status !== 401) break;
  }
  throw lastErr ?? new SheetsError("Google Sheets request failed");
}
