"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { ApiError, convert, recordLocalHistory } from "@/lib/api";
import type { ConvertResult, Currency } from "@/lib/types";
import { CurrencySelect } from "./CurrencySelect";
import { SourceChip } from "./SourceChip";
import { SplitFlap } from "./SplitFlap";

function formatAmount(n: number): string {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function ConverterCard({
  base,
  target,
  onBaseChange,
  onTargetChange,
  currencies,
}: {
  base: string;
  target: string;
  onBaseChange: (code: string) => void;
  onTargetChange: (code: string) => void;
  currencies: Currency[];
}) {
  const { user, getToken } = useAuth();
  const [amountInput, setAmountInput] = useState("100");
  const [result, setResult] = useState<ConvertResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);

  const amount = Number(amountInput);
  const validAmount = Number.isFinite(amount) && amount >= 0;

  useEffect(() => {
    if (!validAmount) return;
    const id = ++requestId.current;
    queueMicrotask(() => {
      if (requestId.current === id) {
        setLoading(true);
        setError(null);
      }
    });
    const t = setTimeout(async () => {
      const token = user ? await getToken() : null;
      try {
        const res = await convert(base, target, amount, token);
        if (requestId.current !== id) return;
        setResult(res);
        if (user && res.source === "fixture") {
          recordLocalHistory(user.uid, {
            base: res.base,
            target: res.target,
            amount: res.amount,
            result: res.result,
            created_at: res.timestamp,
          });
        }
      } catch (err) {
        if (requestId.current !== id) return;
        setError(err instanceof ApiError ? err.message : "Couldn't reach the rate board.");
      } finally {
        if (requestId.current === id) setLoading(false);
      }
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [base, target, amount, validAmount, user]);

  function swap() {
    onBaseChange(target);
    onTargetChange(base);
  }

  return (
    <div className="board-panel rounded-lg p-6">
      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-end gap-3">
        <CurrencySelect id="base" label="From" value={base} onChange={onBaseChange} currencies={currencies} />
        <button
          onClick={swap}
          aria-label="Swap currencies"
          className="mb-0.5 flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border border-hairline bg-panel-raised text-ink transition-transform hover:rotate-180 hover:border-amber-bright"
        >
          ⇄
        </button>
        <CurrencySelect id="target" label="To" value={target} onChange={onTargetChange} currencies={currencies} />
      </div>

      <label htmlFor="amount" className="mt-5 flex flex-col gap-1.5">
        <span className="font-display text-[11px] font-medium uppercase tracking-[0.14em] text-ink-dim">
          Amount
        </span>
        <input
          id="amount"
          inputMode="decimal"
          value={amountInput}
          onChange={(e) => setAmountInput(e.target.value.replace(/[^0-9.]/g, ""))}
          className="min-h-11 rounded-md border border-hairline bg-panel-raised px-3 py-2 font-mono text-lg tabular text-ink outline-none focus-visible:ring-2 focus-visible:ring-amber-bright"
        />
      </label>

      <div className="mt-6 border-t border-hairline pt-6">
        {error ? (
          <p className="font-mono text-sm text-coral" role="alert">
            {error}
          </p>
        ) : !validAmount ? (
          <p className="font-mono text-sm text-ink-dim">Enter a valid amount.</p>
        ) : (
          <>
            <div className="flex items-baseline gap-2">
              <SplitFlap
                value={result ? formatAmount(result.result) : "…"}
                className="font-mono text-4xl font-semibold text-ink"
              />
              <span className="font-display text-lg text-ink-dim">{target}</span>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              {result && (
                <span className="font-mono text-xs text-ink-dim">
                  1 {base} = {result.rate.toFixed(6)} {target}
                </span>
              )}
              {result && !loading && <SourceChip source={result.source} />}
              {loading && <span className="font-mono text-xs text-ink-dim">updating…</span>}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
