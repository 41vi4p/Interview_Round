"use client";

import { useEffect, useState } from "react";
import { getBudget, getCurrencies } from "@/lib/api";
import type { BudgetLine, Currency } from "@/lib/types";
import { FIXTURE_CURRENCIES } from "@/lib/fixtures";
import { CurrencySelect } from "./CurrencySelect";
import { SplitFlap } from "./SplitFlap";
import { SourceChip } from "./SourceChip";

const COMMON_BASES = ["USD", "EUR", "GBP", "JPY", "AUD", "CAD", "CHF", "INR", "SGD"];
const DEFAULT_TARGETS = ["EUR", "GBP", "JPY", "AUD", "CAD"];
const MAX_TARGETS = 8;

function formatAmount(n: number): string {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function BudgetBoard() {
  const [currencies, setCurrencies] = useState<Currency[]>(FIXTURE_CURRENCIES);
  const [base, setBase] = useState("USD");
  const [targets, setTargets] = useState<string[]>(DEFAULT_TARGETS);
  const [amountInput, setAmountInput] = useState("1000");
  const [results, setResults] = useState<BudgetLine[]>([]);
  const [source, setSource] = useState<"api" | "fixture">("api");
  const [loading, setLoading] = useState(false);

  const amount = Number(amountInput);
  const validAmount = Number.isFinite(amount) && amount >= 0;
  const effectiveTargets = targets.filter((t) => t !== base);

  useEffect(() => {
    getCurrencies().then(({ currencies }) => setCurrencies(currencies));
  }, []);

  useEffect(() => {
    if (!validAmount || effectiveTargets.length === 0) return;
    queueMicrotask(() => setLoading(true));
    const t = setTimeout(async () => {
      const res = await getBudget(base, amount, effectiveTargets);
      setResults(res.results);
      setSource(res.fromFixture ? "fixture" : "api");
      setLoading(false);
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [base, amount, validAmount, effectiveTargets.join(",")]);

  function updateTarget(index: number, code: string) {
    setTargets((prev) => prev.map((t, i) => (i === index ? code : t)));
  }

  function removeTarget(index: number) {
    setTargets((prev) => prev.filter((_, i) => i !== index));
  }

  function addTarget() {
    const unused = currencies.find(
      (c) => c.code !== base && !targets.includes(c.code)
    );
    if (unused) setTargets((prev) => [...prev, unused.code]);
  }

  const canAddTarget = targets.length < MAX_TARGETS && targets.length < currencies.length - 1;

  return (
    <div className="flex flex-col gap-6">
      <div className="board-panel rounded-lg p-6">
        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end">
          <CurrencySelect
            id="budget-base"
            label="Home currency"
            value={base}
            onChange={setBase}
            currencies={
              currencies.length > 0
                ? currencies
                : COMMON_BASES.map((code) => ({ code, name: code }))
            }
          />
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

        <div className="mt-5 border-t border-hairline pt-5">
          <span className="font-display text-[11px] font-medium uppercase tracking-[0.14em] text-ink-dim">
            Compare against
          </span>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {targets.map((code, i) => (
              <div key={i} className="flex min-w-0 items-end gap-2">
                <div className="min-w-0 flex-1">
                  <CurrencySelect
                    id={`budget-target-${i}`}
                    label={`Destination ${i + 1}`}
                    value={code}
                    onChange={(next) => updateTarget(i, next)}
                    currencies={
                      currencies.length > 0
                        ? currencies
                        : COMMON_BASES.map((c) => ({ code: c, name: c }))
                    }
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeTarget(i)}
                  aria-label={`Remove ${code} from comparison`}
                  className="mb-0.5 flex h-11 w-11 flex-none cursor-pointer items-center justify-center rounded-md border border-hairline bg-panel-raised text-ink-dim transition-colors hover:border-coral hover:text-coral"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          {canAddTarget && (
            <button
              type="button"
              onClick={addTarget}
              className="mt-3 cursor-pointer font-mono text-xs font-medium text-amber transition-opacity hover:opacity-80"
            >
              + Add currency
            </button>
          )}
          {targets.length === 0 && (
            <p className="mt-3 font-mono text-xs text-ink-dim">
              Add at least one destination currency to compare.
            </p>
          )}
        </div>
      </div>

      {!validAmount ? (
        <p className="font-mono text-sm text-ink-dim">Enter a valid budget amount.</p>
      ) : effectiveTargets.length === 0 ? null : (
        <div className="grid gap-4 sm:grid-cols-2">
          {(loading ? Array.from({ length: effectiveTargets.length }) : results).map((line, i) => (
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
            {line ? `rate ${line.rate.toFixed(4)}` : " "}
          </div>
        </div>
      </div>
    </div>
  );
}
