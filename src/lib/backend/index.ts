import { createDemoBackend, type LocalWorkspace } from "./demo.ts";
import { createSupabaseBackend } from "./supabase.ts";
import type { Backend } from "./types.ts";

export * from "./types.ts";

/** Live mode when Supabase is configured; otherwise a clearly labelled demo with fictional data. */
export function createBackend(): Backend {
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
  if (url && key) return createSupabaseBackend(url, key);
  return createDemoBackend(getLocalWorkspace());
}

const WORKSPACE_KEY = "connectsphere-workspace";

export function getLocalWorkspace(): LocalWorkspace {
  try {
    return localStorage.getItem(WORKSPACE_KEY) === "private" ? "private" : "demo";
  } catch {
    return "demo";
  }
}

/** Switch between the fictional demo and the private workspace. Reloads the app. */
export function switchLocalWorkspace(w: LocalWorkspace) {
  try {
    localStorage.setItem(WORKSPACE_KEY, w);
  } catch {
    /* ignore */
  }
  window.location.reload();
}
