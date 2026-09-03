"use client";

import type { Currency } from "@/lib/types";

export function CurrencySelect({
  id,
  label,
  value,
  onChange,
  currencies,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (code: string) => void;
  currencies: Currency[];
}) {
  return (
    <label htmlFor={id} className="flex flex-col gap-1.5">
      <span className="font-display text-[11px] font-medium uppercase tracking-[0.14em] text-ink-dim">
        {label}
      </span>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="min-h-11 cursor-pointer appearance-none rounded-md border border-hairline bg-panel-raised px-3 py-2 font-mono text-lg font-medium tracking-wide text-ink outline-none focus-visible:ring-2 focus-visible:ring-amber-bright"
      >
        {currencies.map((c) => (
          <option key={c.code} value={c.code}>
            {c.code} — {c.name}
          </option>
        ))}
      </select>
    </label>
  );
}
