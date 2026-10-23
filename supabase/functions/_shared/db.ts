// Data access shared by the Edge Function (Deno) and the browser Supabase backend.
// Takes a supabase-js client; reads go through the caller's own client so RLS applies.

import type { ChapterSettings, ReferralStat } from "./engine/types.ts";
import { DEFAULT_SETTINGS } from "./engine/scoring.ts";
import { rowToProfile, type MemberProfileRow } from "./mapping.ts";
import type { ChapterData } from "./service.ts";

// deno-lint-ignore no-explicit-any
type Client = any;

export async function loadChapterData(client: Client, chapterId: string): Promise<ChapterData> {
  const [chapter, members, stats, suppressed] = await Promise.all([
    client.from("chapters").select("id, name, is_demo, settings").eq("id", chapterId).maybeSingle(),
    client.from("member_profiles").select("*").eq("chapter_id", chapterId),
    client.rpc("chapter_referral_stats", { p_chapter: chapterId }),
    client.from("suppressed_recommendations").select("recommendation_key").eq("chapter_id", chapterId),
  ]);
  for (const r of [chapter, members, stats, suppressed]) if (r.error) throw new Error(r.error.message);
  if (!chapter.data) throw new Error("Chapter not found or you are not a member of it.");
  const settings: ChapterSettings = { ...DEFAULT_SETTINGS, ...(chapter.data.settings ?? {}) };
  return {
    chapter: { id: chapter.data.id, name: chapter.data.name, isDemo: chapter.data.is_demo, settings },
    members: (members.data as MemberProfileRow[]).map(rowToProfile),
    referralStats: ((stats.data ?? []) as { giver_member_id: string; receiver_member_id: string; referrals: number; closed: number }[]).map(
      (s): ReferralStat => ({ giverId: s.giver_member_id, receiverId: s.receiver_member_id, count: Number(s.referrals), closed: Number(s.closed) }),
    ),
    suppressedKeys: (suppressed.data ?? []).map((s: { recommendation_key: string }) => s.recommendation_key),
  };
}
