"use client";

import { useEffect, useState } from "react";
import { cx } from "./ui";

/** Rupee input that stores integer paise. */
export function MoneyInput({ value, onChange, onBlur, id, disabled, className, ariaLabel }: { value: number; onChange: (paise: number) => void; onBlur?: () => void; id?: string; disabled?: boolean; className?: string; ariaLabel?: string }) {
  const toText = (p: number) => (p ? String(p / 100) : "");
  const [text, setText] = useState(toText(value));
  useEffect(() => {
    if (Math.round(Number(text || 0) * 100) !== value) setText(toText(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return (
    <div className={cx("relative", className)}>
      <span aria-hidden className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-3">₹</span>
      <input
        id={id}
        aria-label={ariaLabel}
        disabled={disabled}
        inputMode="decimal"
        className="field num pl-7"
        value={text}
        placeholder="0"
        onChange={(e) => {
          const t = e.target.value.replace(/[^\d.]/g, "").replace(/(\..*)\./g, "$1").replace(/(\.\d{2})\d+/, "$1");
          setText(t);
          const n = Math.round(Number(t || 0) * 100);
          if (Number.isFinite(n) && n <= 10_000_000_000) onChange(n);
        }}
        onBlur={onBlur}
      />
    </div>
  );
}
