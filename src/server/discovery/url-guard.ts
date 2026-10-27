import { isIP } from "node:net";

/**
 * SSRF protection for website discovery. Two layers:
 *  1. normalisePublicUrl() rejects bad schemes, credentials, odd ports and
 *     obviously internal hostnames before any network activity.
 *  2. isPublicAddress() is enforced at socket-connect time (see fetcher.ts),
 *     so DNS rebinding and redirects to internal hosts are also blocked.
 */

export class UnsafeUrlError extends Error {}

const BLOCKED_HOST_SUFFIXES = [".local", ".localhost", ".internal", ".intranet", ".lan", ".home", ".corp", ".localdomain"];

export function normalisePublicUrl(input: string): URL {
  let raw = input.trim();
  if (!raw) throw new UnsafeUrlError("Enter a website address");
  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(raw)) raw = `https://${raw}`;
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new UnsafeUrlError("That doesn't look like a valid web address");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") throw new UnsafeUrlError("Only http and https websites can be inspected");
  if (url.username || url.password) throw new UnsafeUrlError("Addresses with embedded credentials are not allowed");
  if (url.port && url.port !== "80" && url.port !== "443") throw new UnsafeUrlError("Only standard web ports (80/443) are allowed");
  const host = url.hostname.toLowerCase().replace(/\.$/, "");
  if (!host.includes(".") && !isIP(stripBrackets(host))) throw new UnsafeUrlError("Enter a public domain name");
  if (host === "localhost" || BLOCKED_HOST_SUFFIXES.some((s) => host.endsWith(s))) throw new UnsafeUrlError("Internal addresses cannot be inspected");
  const ipHost = stripBrackets(host);
  if (isIP(ipHost) && !isPublicAddress(ipHost)) throw new UnsafeUrlError("Private or reserved IP addresses cannot be inspected");
  url.hash = "";
  return url;
}

const stripBrackets = (h: string) => h.replace(/^\[|\]$/g, "");

function ipv4ToInt(ip: string): number {
  return ip.split(".").reduce((acc, o) => (acc << 8) + Number(o), 0) >>> 0;
}

const V4_BLOCKS: [string, number][] = [
  ["0.0.0.0", 8], ["10.0.0.0", 8], ["100.64.0.0", 10], ["127.0.0.0", 8], ["169.254.0.0", 16],
  ["172.16.0.0", 12], ["192.0.0.0", 24], ["192.0.2.0", 24], ["192.88.99.0", 24], ["192.168.0.0", 16],
  ["198.18.0.0", 15], ["198.51.100.0", 24], ["203.0.113.0", 24], ["224.0.0.0", 4], ["240.0.0.0", 4],
];

function inV4Block(ip: string, base: string, bits: number) {
  const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
  return (ipv4ToInt(ip) & mask) === (ipv4ToInt(base) & mask);
}

function expandV6(ip: string): number[] | null {
  let s = ip.toLowerCase();
  const zone = s.indexOf("%");
  if (zone >= 0) s = s.slice(0, zone);
  // Embedded IPv4 tail (e.g. ::ffff:10.0.0.1)
  const v4 = s.match(/(\d+\.\d+\.\d+\.\d+)$/);
  if (v4) {
    const n = ipv4ToInt(v4[1]);
    s = s.slice(0, -v4[1].length) + `${(n >>> 16).toString(16)}:${(n & 0xffff).toString(16)}`;
  }
  const [head, tail] = s.split("::");
  const h = head ? head.split(":") : [];
  const t = tail !== undefined ? (tail ? tail.split(":") : []) : [];
  if (tail === undefined && h.length !== 8) return null;
  const fill = 8 - h.length - t.length;
  if (fill < 0) return null;
  const parts = [...h, ...Array(tail !== undefined ? fill : 0).fill("0"), ...t].map((x) => parseInt(x || "0", 16));
  return parts.length === 8 && parts.every((n) => Number.isFinite(n) && n >= 0 && n <= 0xffff) ? parts : null;
}

export function isPublicAddress(ip: string): boolean {
  const family = isIP(ip);
  if (family === 4) return !V4_BLOCKS.some(([b, bits]) => inV4Block(ip, b, bits));
  if (family === 6) {
    const p = expandV6(ip);
    if (!p) return false;
    if (p.every((x) => x === 0)) return false; // ::
    if (p.slice(0, 7).every((x) => x === 0) && p[7] === 1) return false; // ::1
    // IPv4-mapped / compatible / NAT64 → check embedded IPv4
    const embedded = `${p[6] >> 8}.${p[6] & 255}.${p[7] >> 8}.${p[7] & 255}`;
    if (p.slice(0, 5).every((x) => x === 0) && (p[5] === 0xffff || p[5] === 0)) return isPublicAddress(embedded);
    if (p[0] === 0x64 && p[1] === 0xff9b) return isPublicAddress(embedded);
    if ((p[0] & 0xfe00) === 0xfc00) return false; // fc00::/7 unique local
    if ((p[0] & 0xffc0) === 0xfe80) return false; // fe80::/10 link local
    if ((p[0] & 0xff00) === 0xff00) return false; // multicast
    if (p[0] === 0x2001 && p[1] === 0x0db8) return false; // documentation
    if (p[0] === 0x2002) return isPublicAddress(`${p[1] >> 8}.${p[1] & 255}.${p[2] >> 8}.${p[2] & 255}`); // 6to4
    return true;
  }
  return false;
}
