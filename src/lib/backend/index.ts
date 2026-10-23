import { createDemoBackend } from "./demo.ts";
import { createSupabaseBackend } from "./supabase.ts";
import type { Backend } from "./types.ts";

export * from "./types.ts";

/** Live mode when Supabase is configured; otherwise a clearly labelled demo with fictional data. */
export function createBackend(): Backend {
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
  if (url && key) return createSupabaseBackend(url, key);
  return createDemoBackend();
}
