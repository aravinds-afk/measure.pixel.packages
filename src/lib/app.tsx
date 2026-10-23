import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { MemberProfile } from "@engine/index.ts";
import { createBackend, type Backend, type Session } from "./backend/index.ts";

interface Toast {
  id: number;
  kind: "success" | "error" | "info";
  text: string;
}

interface AppState {
  backend: Backend;
  session: Session | null;
  sessionError: string | null;
  loading: boolean;
  members: MemberProfile[];
  memberById: (id: string | null | undefined) => MemberProfile | undefined;
  me: MemberProfile | undefined;
  refreshMembers: () => Promise<void>;
  refreshSession: () => Promise<void>;
  toast: (text: string, kind?: Toast["kind"]) => void;
  toasts: Toast[];
  isAdmin: boolean;
  isLeader: boolean;
}

const Ctx = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const backend = useMemo(() => createBackend(), []);
  const [session, setSession] = useState<Session | null>(null);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<MemberProfile[]>([]);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const seq = useRef(0);

  const refreshMembers = useCallback(async () => {
    try {
      setMembers(await backend.listMembers());
    } catch {
      setMembers([]);
    }
  }, [backend]);

  const refreshSession = useCallback(async () => {
    try {
      const s = await backend.getSession();
      setSession(s);
      setSessionError(null);
      if (s) setMembers(await backend.listMembers());
      else setMembers([]);
    } catch (e) {
      setSession(null);
      setSessionError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [backend]);

  useEffect(() => {
    refreshSession();
    return backend.onAuthChange(() => {
      refreshSession();
    });
  }, [backend, refreshSession]);

  const toast = useCallback((text: string, kind: Toast["kind"] = "success") => {
    const id = ++seq.current;
    setToasts((t) => [...t, { id, kind, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4500);
  }, []);

  const byId = useMemo(() => new Map(members.map((m) => [m.id, m])), [members]);
  const value: AppState = {
    backend,
    session,
    sessionError,
    loading,
    members,
    memberById: (id) => (id ? byId.get(id) : undefined),
    me: session?.memberId ? byId.get(session.memberId) : undefined,
    refreshMembers,
    refreshSession,
    toast,
    toasts,
    isAdmin: session?.role === "admin",
    isLeader: session?.role === "admin" || session?.role === "leadership",
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp(): AppState {
  const v = useContext(Ctx);
  if (!v) throw new Error("useApp outside AppProvider");
  return v;
}

/** Run an async loader and track loading / error / data. Re-runs when deps change. */
export function useAsync<T>(fn: () => Promise<T>, deps: unknown[]) {
  const [data, setData] = useState<T | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    fn()
      .then((d) => alive && setData(d))
      .catch((e: Error) => alive && setError(e.message))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);
  return { data, error, loading, reload: () => setTick((t) => t + 1), setData };
}
