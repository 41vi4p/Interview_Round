"use client";

import { useEffect, useState } from "react";
import { getCurrencies, getTrend } from "@/lib/api";
import type { Currency, TrendPoint } from "@/lib/types";
import { ConverterCard } from "@/components/ConverterCard";
import { TrendChart } from "@/components/TrendChart";
import { FavoritesPanel } from "@/components/FavoritesPanel";
import { FIXTURE_CURRENCIES } from "@/lib/fixtures";

export default function Home() {
  const [currencies, setCurrencies] = useState<Currency[]>(FIXTURE_CURRENCIES);
  const [base, setBase] = useState("USD");
  const [target, setTarget] = useState("EUR");
  const [trend, setTrend] = useState<TrendPoint[]>([]);
  const [trendLoading, setTrendLoading] = useState(true);

  useEffect(() => {
    getCurrencies().then(({ currencies }) => setCurrencies(currencies));
  }, []);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) setTrendLoading(true);
    });
    getTrend(base, target).then((res) => {
      if (!cancelled) {
        setTrend(res.points);
        setTrendLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [base, target]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-amber">
          Departures / Exchange
        </p>
        <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
          Convert, track, plan.
        </h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,380px)_1fr]">
        <div className="flex flex-col gap-6">
          <ConverterCard
            base={base}
            target={target}
            onBaseChange={setBase}
            onTargetChange={setTarget}
            currencies={currencies}
          />
          <FavoritesPanel
            base={base}
            target={target}
            onSelect={(b, t) => {
              setBase(b);
              setTarget(t);
            }}
          />
        </div>

        <div className="board-panel rounded-lg p-6">
          <h2 className="mb-4 font-display text-[11px] font-medium uppercase tracking-[0.14em] text-ink-dim">
            {base}/{target} · 30 day trend
          </h2>
          <TrendChart points={trend} base={base} target={target} loading={trendLoading} />
        </div>
      </div>
    </div>
  );
}
