import "server-only";
import type { Prefill, Observation } from "./analyze";

/**
 * Instagram profile signals via Apify's Instagram Profile Scraper.
 * Instagram blocks direct automated access, so this runs only when
 * APIFY_TOKEN is set; otherwise the profile stays a manual check.
 * Numbers come from the public profile at fetch time; engagement and
 * frequency are computed from the latest posts Apify returns.
 */

export type InstagramResult =
  | { status: "ok"; handle: string; profileUrl: string; followers: number | null; posts: number | null; bio: string; externalUrl: string; category: string; verified: boolean;
      postsLast30: number; reelsLast30: number; avgEngagementRate: number | null; lastPostAt: string | null; observations: Observation[]; prefill: Prefill[] }
  | { status: "not_configured" | "not_found" | "error"; handle: string; message: string };

export function instagramHandle(input: string): string | null {
  const s = input.trim();
  if (!s) return null;
  const m = s.match(/instagram\.com\/([A-Za-z0-9._]{1,30})/i);
  const h = (m ? m[1] : s.replace(/^@/, "")).replace(/\/$/, "");
  if (!/^[A-Za-z0-9._]{1,30}$/.test(h) || ["p", "reel", "explore", "stories"].includes(h.toLowerCase())) return null;
  return h;
}

type ApifyPost = { timestamp?: string; likesCount?: number; commentsCount?: number; type?: string; productType?: string; videoViewCount?: number };
type ApifyProfile = {
  username?: string; fullName?: string; biography?: string; followersCount?: number; postsCount?: number; verified?: boolean;
  externalUrl?: string; businessCategoryName?: string; latestPosts?: ApifyPost[]; error?: string;
};

export async function fetchInstagram(input: string, fetchImpl: typeof fetch = fetch): Promise<InstagramResult | null> {
  const handle = instagramHandle(input);
  if (!handle) return null;
  const token = process.env.APIFY_TOKEN;
  if (!token) return { status: "not_configured", handle, message: "Instagram was not read automatically: APIFY_TOKEN is not set on the server. Check the profile manually." };
  let data: ApifyProfile[];
  try {
    const res = await fetchImpl(`https://api.apify.com/v2/acts/apify~instagram-profile-scraper/run-sync-get-dataset-items?timeout=60`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify({ usernames: [handle] }),
      signal: AbortSignal.timeout(75_000),
    });
    if (!res.ok) return { status: "error", handle, message: `Instagram lookup failed (Apify HTTP ${res.status}). Check the profile manually.` };
    data = (await res.json()) as ApifyProfile[];
  } catch (e) {
    return { status: "error", handle, message: `Instagram lookup did not finish (${(e as Error).name}). Check the profile manually.` };
  }
  const p = data?.[0];
  if (!p || p.error || !p.username) return { status: "not_found", handle, message: "Instagram profile not found or private." };
  return summarise(handle, p);
}

export function summarise(handle: string, p: ApifyProfile): InstagramResult {
  const url = `https://www.instagram.com/${handle}/`;
  const now = Date.now();
  const posts = (p.latestPosts ?? []).filter((x) => x.timestamp);
  const recent = posts.filter((x) => now - Date.parse(x.timestamp!) <= 30 * 864e5);
  const reels = recent.filter((x) => x.type === "Video" || x.productType === "clips").length;
  const followers = p.followersCount ?? null;
  const er = followers && posts.length ? posts.reduce((n, x) => n + (x.likesCount ?? 0) + (x.commentsCount ?? 0), 0) / posts.length / followers : null;
  const last = posts.map((x) => x.timestamp!).sort().at(-1) ?? null;
  const bio = p.biography ?? "";
  const obs: Observation[] = [
    { kind: "verified", area: "Social", text: `Instagram @${handle}: ${followers?.toLocaleString("en-IN") ?? "?"} followers, ${p.postsCount ?? "?"} posts${p.verified ? ", verified" : ""}.`, evidenceUrl: url },
    { kind: "verified", area: "Social", text: `${recent.length} post(s) in the last 30 days, ${reels} reel(s).${last ? ` Last post ${last.slice(0, 10)}.` : ""}`, evidenceUrl: url },
  ];
  if (er != null) obs.push({ kind: "verified", area: "Social", text: `Average engagement on recent posts: ${(er * 100).toFixed(2)}% of followers.`, evidenceUrl: url });
  obs.push({ kind: p.externalUrl ? "verified" : "verified", area: "Social", text: p.externalUrl ? `Bio link: ${p.externalUrl}` : "No link in the Instagram bio.", evidenceUrl: url });

  const prefill: Prefill[] = [];
  const freq = recent.length;
  prefill.push({
    itemId: "cc-social-active",
    status: freq >= 8 ? "working_well" : freq >= 1 ? "needs_improvement" : "missing",
    suggestion: null,
    evidence: `Instagram: ${freq} posts in 30 days`,
    evidenceUrl: url,
  });
  prefill.push({
    itemId: "cc-video",
    status: null,
    suggestion: reels >= 4 ? { status: "working_well", note: `${reels} reels in 30 days on Instagram` } : { status: "needs_improvement", note: `Only ${reels} reel(s) in 30 days on Instagram` },
    evidence: `Instagram reels: ${reels}`,
    evidenceUrl: url,
  });
  if (er != null && er < 0.01)
    prefill.push({ itemId: "seo-influencer", status: null, suggestion: { status: "needs_improvement", note: `Low engagement (${(er * 100).toFixed(2)}%) — creator/UGC content could help` }, evidence: "", evidenceUrl: url });
  if (/whatsapp|wa\.me|call|book|dm/i.test(bio + (p.externalUrl ?? "")))
    prefill.push({ itemId: "lc-whatsapp", status: null, suggestion: { status: "working_well", note: "Instagram bio offers WhatsApp/booking contact" }, evidence: bio.slice(0, 120), evidenceUrl: url });

  return {
    status: "ok", handle, profileUrl: url, followers, posts: p.postsCount ?? null, bio, externalUrl: p.externalUrl ?? "", category: p.businessCategoryName ?? "", verified: !!p.verified,
    postsLast30: freq, reelsLast30: reels, avgEngagementRate: er, lastPostAt: last, observations: obs, prefill,
  };
}
