import dns from "node:dns";
import type { LookupFunction } from "node:net";
import { Agent, fetch as undiciFetch } from "undici";
import { isPublicAddress, normalisePublicUrl, UnsafeUrlError } from "./url-guard";

export const USER_AGENT = "MeasurePixelGrowthAdvisor/1.0 (+website audit; respects robots.txt)";

/** DNS lookup that refuses private/reserved addresses at connect time (defeats DNS rebinding). */
export const safeLookup: LookupFunction = (hostname, options, callback) => {
  dns.lookup(hostname, { ...options, all: true }, (err, addresses) => {
    if (err) return callback(err, "", 4);
    const list = Array.isArray(addresses) ? addresses : [];
    const bad = list.find((a) => !isPublicAddress(a.address));
    if (bad || list.length === 0) {
      return callback(new UnsafeUrlError(`Refusing to connect to non-public address for ${hostname}`) as NodeJS.ErrnoException, "", 4);
    }
    if ((options as { all?: boolean }).all) return (callback as unknown as (e: null, a: dns.LookupAddress[]) => void)(null, list);
    callback(null, list[0].address, list[0].family);
  });
};

let agent: Agent | null = null;
const getAgent = () => (agent ??= new Agent({ connect: { lookup: safeLookup, timeout: 8000 }, maxRedirections: 0 } as ConstructorParameters<typeof Agent>[0]));

export type FetchResult = {
  url: string;
  finalUrl: string;
  status: number;
  contentType: string;
  body: string;
  elapsedMs: number;
  truncated: boolean;
};

export type Fetcher = (url: string, opts?: { maxBytes?: number; timeoutMs?: number; accept?: string }) => Promise<FetchResult>;

/**
 * GET a public URL with: manual redirects (each hop re-validated, max 4),
 * total timeout, response size cap, connect-time IP checks.
 */
export const safeFetch: Fetcher = async (input, opts = {}) => {
  const maxBytes = opts.maxBytes ?? 1_500_000;
  const timeoutMs = opts.timeoutMs ?? 10_000;
  const started = Date.now();
  let current = normalisePublicUrl(input);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    for (let hop = 0; hop <= 4; hop++) {
      const res = await undiciFetch(current.toString(), {
        method: "GET",
        redirect: "manual",
        signal: controller.signal,
        dispatcher: getAgent(),
        headers: { "user-agent": USER_AGENT, accept: opts.accept ?? "text/html,application/xhtml+xml;q=0.9,*/*;q=0.5", "accept-language": "en-IN,en;q=0.9" },
      });
      if (res.status >= 300 && res.status < 400 && res.headers.get("location")) {
        await res.body?.cancel();
        current = normalisePublicUrl(new URL(res.headers.get("location")!, current).toString());
        continue;
      }
      const contentType = res.headers.get("content-type") ?? "";
      let body = "";
      let truncated = false;
      if (res.body) {
        const reader = res.body.getReader();
        const chunks: Uint8Array[] = [];
        let size = 0;
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          size += value.byteLength;
          if (size > maxBytes) {
            truncated = true;
            chunks.push(value.slice(0, value.byteLength - (size - maxBytes)));
            await reader.cancel();
            break;
          }
          chunks.push(value);
        }
        body = new TextDecoder("utf-8", { fatal: false }).decode(concat(chunks));
      }
      return { url: input, finalUrl: current.toString(), status: res.status, contentType, body, elapsedMs: Date.now() - started, truncated };
    }
    throw new Error("Too many redirects");
  } finally {
    clearTimeout(timer);
  }
};

function concat(chunks: Uint8Array[]) {
  const out = new Uint8Array(chunks.reduce((n, c) => n + c.byteLength, 0));
  let o = 0;
  for (const c of chunks) {
    out.set(c, o);
    o += c.byteLength;
  }
  return out;
}

/** Human-readable reason for a failed fetch, without leaking internals. */
export function describeFetchError(e: unknown): string {
  if (e instanceof UnsafeUrlError) return e.message;
  const err = e as { name?: string; message?: string; cause?: { code?: string; message?: string } };
  if (err?.name === "AbortError") return "Timed out";
  const code = err?.cause?.code;
  if (code === "ENOTFOUND" || code === "EAI_AGAIN") return "Domain could not be resolved";
  if (code === "ECONNREFUSED") return "Connection refused";
  if (code === "ECONNRESET") return "Connection reset";
  if (code?.startsWith("ERR_TLS") || code?.includes("CERT")) return "TLS/certificate error";
  if (err?.cause?.message?.includes("non-public")) return "Resolves to a non-public address";
  return "Could not be fetched";
}
