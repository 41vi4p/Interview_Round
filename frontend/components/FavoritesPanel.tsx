"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { addFavorite, getFavorites, removeFavorite } from "@/lib/api";
import type { Favorite } from "@/lib/types";

export function FavoritesPanel({
  base,
  target,
  onSelect,
}: {
  base: string;
  target: string;
  onSelect: (base: string, target: string) => void;
}) {
  const { user, getToken } = useAuth();
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!user) {
      queueMicrotask(() => {
        if (!cancelled) setFavorites([]);
      });
      return () => {
        cancelled = true;
      };
    }
    (async () => {
      const token = await getToken();
      if (!token) return;
      const { favorites } = await getFavorites(token, user.uid);
      if (!cancelled) setFavorites(favorites);
    })();
    return () => {
      cancelled = true;
    };
  }, [user, getToken]);

  if (!user) {
    return (
      <div className="board-panel rounded-lg p-5 text-sm text-ink-dim">
        <Link href="/login" className="font-medium text-ink underline underline-offset-4">
          Sign in
        </Link>{" "}
        to save pairs you check often.
      </div>
    );
  }

  const isSaved = favorites.some((f) => f.base === base && f.target === target);

  async function toggleSave() {
    if (!user || busy) return;
    setBusy(true);
    const token = await getToken();
    if (!token) {
      setBusy(false);
      return;
    }
    if (isSaved) {
      const match = favorites.find((f) => f.base === base && f.target === target);
      if (match) {
        await removeFavorite(token, user.uid, match.id);
        setFavorites((prev) => prev.filter((f) => f.id !== match.id));
      }
    } else {
      const { favorite } = await addFavorite(token, user.uid, base, target);
      setFavorites((prev) => [...prev, favorite]);
    }
    setBusy(false);
  }

  async function remove(id: number) {
    if (!user) return;
    const token = await getToken();
    if (!token) return;
    await removeFavorite(token, user.uid, id);
    setFavorites((prev) => prev.filter((f) => f.id !== id));
  }

  return (
    <div className="board-panel rounded-lg p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-display text-[11px] font-medium uppercase tracking-[0.14em] text-ink-dim">
          Saved pairs
        </h2>
        <button
          onClick={toggleSave}
          disabled={busy}
          className="cursor-pointer font-mono text-xs font-medium text-amber transition-opacity disabled:opacity-50"
        >
          {isSaved ? "★ Saved" : "☆ Save this pair"}
        </button>
      </div>
      {favorites.length === 0 ? (
        <p className="font-mono text-xs text-ink-dim">No saved pairs yet.</p>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {favorites.map((f) => (
            <li key={f.id}>
              <div className="group flex items-center gap-1 rounded-full border border-hairline bg-panel-raised pl-3 pr-1 py-1">
                <button
                  onClick={() => onSelect(f.base, f.target)}
                  className="cursor-pointer font-mono text-xs font-medium text-ink"
                >
                  {f.base}/{f.target}
                </button>
                <button
                  onClick={() => remove(f.id)}
                  aria-label={`Remove ${f.base}/${f.target} from saved pairs`}
                  className="cursor-pointer rounded-full px-1.5 py-0.5 text-ink-dim opacity-0 transition-opacity hover:text-coral group-hover:opacity-100 focus-visible:opacity-100"
                >
                  ×
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
