"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bot, Mic, MicOff, Send, X, Volume2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { runAssistantCommand } from "@/actions/assistant";
import { ROLE_LABELS, type ModuleKey } from "@/lib/rbac";
import type { Role } from "@prisma/client";

type Message = { role: "user" | "assistant"; text: string };

// Minimal shape of the browser SpeechRecognition API (not in TS lib.dom yet).
type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((e: { results: { [i: number]: { [j: number]: { transcript: string } } }; resultIndex: number }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start: () => void;
  stop: () => void;
};

function getSpeechRecognition(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: new () => SpeechRecognitionLike; webkitSpeechRecognition?: new () => SpeechRecognitionLike };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

function speak(text: string) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 1.02;
  window.speechSynthesis.speak(utterance);
}

export function Assistant({ role, allowedModules }: { role: Role; allowedModules: ModuleKey[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [listening, setListening] = useState(false);
  const [pending, setPending] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", text: `Hi, I'm your assistant. I can help based on what your role (${ROLE_LABELS[role]}) can access. Try "open leads" or "add task follow up with Acme".` },
  ]);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setVoiceSupported(!!getSpeechRecognition());
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || pending) return;
    setMessages((m) => [...m, { role: "user", text: trimmed }]);
    setInput("");
    setPending(true);
    try {
      const result = await runAssistantCommand(trimmed);
      setMessages((m) => [...m, { role: "assistant", text: result.reply }]);
      speak(result.reply);
      if (result.navigateTo) router.push(result.navigateTo);
    } catch {
      const errText = "Something went wrong running that command.";
      setMessages((m) => [...m, { role: "assistant", text: errText }]);
      speak(errText);
    } finally {
      setPending(false);
    }
  }

  function toggleListening() {
    const SpeechRecognitionCtor = getSpeechRecognition();
    if (!SpeechRecognitionCtor) return;

    if (listening) {
      recognitionRef.current?.stop();
      return;
    }

    const recognition = new SpeechRecognitionCtor();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";
    recognition.onresult = (e) => {
      const transcript = e.results[e.resultIndex][0].transcript;
      send(transcript);
    };
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);
    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-40 flex size-13 items-center justify-center rounded-full bg-brand text-white shadow-lg transition-transform hover:scale-105"
        aria-label="Open assistant"
      >
        <Bot className="size-6" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-5 right-5 z-40 flex h-[520px] w-[360px] max-w-[calc(100vw-2.5rem)] flex-col rounded-xl border border-border bg-surface shadow-2xl">
      <div className="flex items-center justify-between gap-2 border-b border-border p-4">
        <div className="flex items-center gap-2">
          <Bot className="size-4.5 text-brand" />
          <div>
            <p className="text-sm font-semibold text-foreground">Assistant</p>
            <p className="text-xs text-muted">{ROLE_LABELS[role]} access · {allowedModules.length} modules</p>
          </div>
        </div>
        <button onClick={() => setOpen(false)} className="text-muted hover:text-foreground">
          <X className="size-4.5" />
        </button>
      </div>

      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto scrollbar-thin p-4">
        {messages.map((m, i) => (
          <div key={i} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
            <div
              className={cn(
                "max-w-[85%] rounded-lg px-3 py-2 text-sm",
                m.role === "user" ? "bg-brand text-white" : "bg-surface-2 text-foreground"
              )}
            >
              {m.text}
            </div>
          </div>
        ))}
        {pending && <div className="text-xs text-muted">Thinking…</div>}
      </div>

      <form
        className="flex items-center gap-2 border-t border-border p-3"
        onSubmit={(e) => { e.preventDefault(); send(input); }}
      >
        {voiceSupported && (
          <button
            type="button"
            onClick={toggleListening}
            className={cn(
              "flex size-9 shrink-0 items-center justify-center rounded-lg border transition-colors",
              listening ? "border-danger bg-danger-soft text-danger" : "border-border text-muted hover:text-foreground"
            )}
            aria-label={listening ? "Stop listening" : "Speak a command"}
          >
            {listening ? <MicOff className="size-4" /> : <Mic className="size-4" />}
          </button>
        )}
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={listening ? "Listening…" : "Type a command…"}
          className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand/30"
        />
        <button
          type="submit"
          disabled={pending || !input.trim()}
          className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand text-white disabled:opacity-40"
          aria-label="Send"
        >
          <Send className="size-4" />
        </button>
      </form>
      {!voiceSupported && (
        <p className="flex items-center gap-1 px-3 pb-3 text-[11px] text-muted">
          <Volume2 className="size-3" /> Voice input isn't supported in this browser — try Chrome or Edge.
        </p>
      )}
    </div>
  );
}
