"use client";

import { useEffect, useState } from "react";
import { getBudget } from "@/lib/api";
import type { BudgetLine } from "@/lib/types";
import { SplitFlap } from "./SplitFlap";
import { SourceChip } from "./SourceChip";

const COMMON_BASES = ["USD", "EUR", "GBP", "JPY", "AUD", "CAD", "CHF", "INR", "SGD"];

function formatAmount(n: number): string {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function BudgetBoard() {
  const [base, setBase] = useState("USD");
  const [amountInput, setAmountInput] = useState("1000");
  const [results, setResults] = useState<BudgetLine[]>([]);
  const [source, setSource] = useState<"api" | "fixture">("api");
  const [loading, setLoading] = useState(false);

  const amount = Number(amountInput);
  const validAmount = Number.isFinite(amount) && amount >= 0;

  useEffect(() => {
    if (!validAmount) return;
    queueMicrotask(() => setLoading(true));
    const t = setTimeout(async () => {
      const res = await getBudget(base, amount);
      setResults(res.results);
      setSource(res.fromFixture ? "fixture" : "api");
      setLoading(false);
    }, 350);
    return () => clearTimeout(t);
  }, [base, amount, validAmount]);

  return (
    <div className="flex flex-col gap-6">
      <div className="board-panel rounded-lg p-6">
        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end">
          <label className="flex min-w-0 flex-col gap-1.5">
            <span className="font-display text-[11px] font-medium uppercase tracking-[0.14em] text-ink-dim">
              Home currency
            </span>
            <select
              value={base}
              onChange={(e) => setBase(e.target.value)}
              className="min-h-11 w-full min-w-0 cursor-pointer rounded-md border border-hairline bg-panel-raised px-3 py-2 font-mono text-lg text-ink outline-none focus-visible:ring-2 focus-visible:ring-amber-bright"
            >
              {COMMON_BASES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <label className="flex min-w-0 flex-col gap-1.5">
            <span className="font-display text-[11px] font-medium uppercase tracking-[0.14em] text-ink-dim">
              Travel budget
            </span>
            <input
              inputMode="decimal"
              value={amountInput}
              onChange={(e) => setAmountInput(e.target.value.replace(/[^0-9.]/g, ""))}
              className="min-h-11 w-full min-w-0 rounded-md border border-hairline bg-panel-raised px-3 py-2 font-mono text-lg tabular text-ink outline-none focus-visible:ring-2 focus-visible:ring-amber-bright"
            />
          </label>
          <div className="pb-2.5">{!loading && results.length > 0 && <SourceChip source={source} />}</div>
        </div>
      </div>

      {!validAmount ? (
        <p className="font-mono text-sm text-ink-dim">Enter a valid budget amount.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {(loading ? Array.from({ length: 5 }) : results).map((line, i) => (
            <BoardingPass
              key={loading ? i : (line as BudgetLine).currency}
              line={loading ? null : (line as BudgetLine)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function BoardingPass({ line }: { line: BudgetLine | null }) {
  return (
    <div className="relative overflow-hidden rounded-lg border border-hairline bg-panel">
      <div
        className="pointer-events-none absolute top-0 bottom-0 w-4 -translate-x-1/2 border-r border-dashed border-hairline"
        style={{ left: 76 }}
        aria-hidden
      />
      <span
        className="absolute -top-2 h-4 w-4 -translate-x-1/2 rounded-full bg-board"
        style={{ left: 76 }}
        aria-hidden
      />
      <span
        className="absolute -bottom-2 h-4 w-4 -translate-x-1/2 rounded-full bg-board"
        style={{ left: 76 }}
        aria-hidden
      />
      <div className="flex">
        <div className="flex w-[76px] flex-none items-center justify-center py-5">
          <span className="font-display text-sm font-semibold tracking-widest text-ink-dim">
            {line ? line.currency : "···"}
          </span>
        </div>
        <div className="flex-1 py-5 pl-6 pr-4">
          <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-dim">
            Converted
          </div>
          {line ? (
            <SplitFlap value={formatAmount(line.converted)} className="font-mono text-2xl font-semibold text-ink" />
          ) : (
            <div className="font-mono text-2xl text-ink-dim">…</div>
          )}
          <div className="mt-1 font-mono text-[11px] text-ink-dim">
            {line ? `rate ${line.rate.toFixed(4)}` : " "}
          </div>
        </div>
      </div>
    </div>
  );
}
