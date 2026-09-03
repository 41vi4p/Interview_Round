"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { getHistory } from "@/lib/api";
import type { HistoryEntry } from "@/lib/types";

function formatTimestamp(iso: string): { date: string; time: string } {
  const d = new Date(iso);
  return {
    date: d.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" }),
    time: d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
  };
}

export function HistoryManifest() {
  const { user, loading: authLoading, getToken } = useAuth();
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [fromFixture, setFromFixture] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!user) {
      queueMicrotask(() => {
        if (!cancelled) setLoading(false);
      });
      return () => {
        cancelled = true;
      };
    }
    (async () => {
      queueMicrotask(() => {
        if (!cancelled) setLoading(true);
      });
      const token = await getToken();
      if (!token) return;
      const res = await getHistory(token, user.uid, 20);
      if (!cancelled) {
        setEntries(res.history);
        setFromFixture(res.fromFixture);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, getToken]);

  if (authLoading || loading) {
    return <p className="font-mono text-sm text-ink-dim">Loading manifest…</p>;
  }

  if (!user) {
    return (
      <div className="board-panel rounded-lg p-6 text-sm text-ink-dim">
        <Link href="/login" className="font-medium text-ink underline underline-offset-4">
          Sign in
        </Link>{" "}
        to see your conversion history.
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="board-panel rounded-lg p-6 font-mono text-sm text-ink-dim">
        No conversions logged yet — every conversion you make while signed in
        shows up here.
      </div>
    );
  }

  return (
    <div className="board-panel overflow-hidden rounded-lg">
      {fromFixture && (
        <div className="border-b border-hairline bg-panel-raised px-5 py-2 font-mono text-[11px] text-ink-dim">
          Backend unreachable — showing locally recorded conversions.
        </div>
      )}
      <table className="w-full font-mono text-sm">
        <thead className="text-left text-ink-dim">
          <tr className="border-b border-hairline">
            <th className="px-5 py-3 font-medium">Date</th>
            <th className="px-5 py-3 font-medium">Pair</th>
            <th className="px-5 py-3 text-right font-medium">Amount</th>
            <th className="px-5 py-3 text-right font-medium">Result</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((e, i) => {
            const { date, time } = formatTimestamp(e.created_at);
            return (
              <tr key={i} className="border-b border-hairline last:border-0">
                <td className="px-5 py-3 text-ink-dim">
                  {date} <span className="text-ink-dim/70">{time}</span>
                </td>
                <td className="px-5 py-3 tabular text-ink">
                  {e.base} → {e.target}
                </td>
                <td className="px-5 py-3 text-right tabular text-ink-dim">{e.amount.toLocaleString()}</td>
                <td className="px-5 py-3 text-right tabular font-medium text-ink">
                  {e.result.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
