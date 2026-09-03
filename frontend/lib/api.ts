import {
  fixtureBudget,
  fixtureRate,
  fixtureTrend,
  FIXTURE_CURRENCIES,
} from "./fixtures";
import type {
  BudgetResult,
  ChatMessage,
  ChatResult,
  ConvertResult,
  Currency,
  Favorite,
  HistoryEntry,
  TrendResult,
} from "./types";

/**
 * All calls go through same-origin /api/*, proxied to the FastAPI backend by
 * next.config.ts. If the backend isn't up yet (still being built in parallel,
 * per docs/implementation.md), every read falls back to deterministic fixture
 * data so the UI stays usable during frontend-only development.
 */

async function authHeaders(token: string | null): Promise<HeadersInit> {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function parseError(res: Response): Promise<never> {
  let detail = res.statusText;
  try {
    const body = await res.json();
    if (body?.detail) detail = body.detail;
  } catch {
    // ignore
  }
  throw new ApiError(res.status, detail);
}

export async function getCurrencies(): Promise<{
  currencies: Currency[];
  fromFixture: boolean;
}> {
  try {
    const res = await fetch("/api/currencies");
    if (!res.ok) return await parseError(res);
    const data = await res.json();
    return { currencies: data.currencies, fromFixture: false };
  } catch {
    return { currencies: FIXTURE_CURRENCIES, fromFixture: true };
  }
}

export async function convert(
  base: string,
  target: string,
  amount: number,
  token: string | null
): Promise<ConvertResult> {
  try {
    const res = await fetch(
      `/api/convert?base=${base}&target=${target}&amount=${amount}`,
      { headers: await authHeaders(token) }
    );
    if (!res.ok) return await parseError(res);
    return await res.json();
  } catch {
    const rate = fixtureRate(base, target);
    return {
      base,
      target,
      amount,
      rate: Number(rate.toFixed(6)),
      result: Number((rate * amount).toFixed(2)),
      source: "fixture",
      timestamp: new Date().toISOString(),
    };
  }
}

export async function getTrend(
  base: string,
  target: string
): Promise<TrendResult & { fromFixture: boolean }> {
  try {
    const res = await fetch(`/api/trend?base=${base}&target=${target}`);
    if (!res.ok) return await parseError(res);
    const data = await res.json();
    return { ...data, fromFixture: false };
  } catch {
    return { base, target, points: fixtureTrend(base, target), fromFixture: true };
  }
}

export async function getBudget(
  base: string,
  amount: number,
  targets?: string[]
): Promise<BudgetResult & { fromFixture: boolean }> {
  try {
    const res = await fetch("/api/budget", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ base, amount, targets }),
    });
    if (!res.ok) return await parseError(res);
    const data = await res.json();
    return { ...data, fromFixture: false };
  } catch {
    return { base, amount, results: fixtureBudget(base, amount, targets), fromFixture: true };
  }
}

// ---- Favorites & history: auth-required. Fall back to a per-uid localStorage
// store when the backend can't be reached, so signed-in demo flows still work.

function localKey(uid: string, kind: "favorites" | "history") {
  return `rateboard:${kind}:${uid}`;
}

function readLocal<T>(uid: string, kind: "favorites" | "history"): T[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(window.localStorage.getItem(localKey(uid, kind)) ?? "[]");
  } catch {
    return [];
  }
}

function writeLocal<T>(uid: string, kind: "favorites" | "history", value: T[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(localKey(uid, kind), JSON.stringify(value));
}

export async function getFavorites(
  token: string,
  uid: string
): Promise<{ favorites: Favorite[]; fromFixture: boolean }> {
  try {
    const res = await fetch("/api/favorites", { headers: await authHeaders(token) });
    if (!res.ok) return await parseError(res);
    const data = await res.json();
    return { favorites: data.favorites, fromFixture: false };
  } catch {
    return { favorites: readLocal<Favorite>(uid, "favorites"), fromFixture: true };
  }
}

export async function addFavorite(
  token: string,
  uid: string,
  base: string,
  target: string
): Promise<{ favorite: Favorite; fromFixture: boolean }> {
  try {
    const res = await fetch("/api/favorites", {
      method: "POST",
      headers: { ...(await authHeaders(token)), "Content-Type": "application/json" },
      body: JSON.stringify({ base, target }),
    });
    if (!res.ok) return await parseError(res);
    return { favorite: await res.json(), fromFixture: false };
  } catch {
    const existing = readLocal<Favorite>(uid, "favorites");
    if (existing.some((f) => f.base === base && f.target === target)) {
      return { favorite: existing.find((f) => f.base === base && f.target === target)!, fromFixture: true };
    }
    const favorite: Favorite = {
      id: Date.now(),
      base,
      target,
      created_at: new Date().toISOString(),
    };
    writeLocal(uid, "favorites", [...existing, favorite]);
    return { favorite, fromFixture: true };
  }
}

export async function removeFavorite(
  token: string,
  uid: string,
  id: number
): Promise<void> {
  try {
    const res = await fetch(`/api/favorites/${id}`, {
      method: "DELETE",
      headers: await authHeaders(token),
    });
    if (!res.ok && res.status !== 404) return await parseError(res);
  } catch (err) {
    if (err instanceof ApiError) throw err;
  }
  const existing = readLocal<Favorite>(uid, "favorites");
  writeLocal(uid, "favorites", existing.filter((f) => f.id !== id));
}

export async function getHistory(
  token: string,
  uid: string,
  limit = 20
): Promise<{ history: HistoryEntry[]; fromFixture: boolean }> {
  try {
    const res = await fetch(`/api/history?limit=${limit}`, {
      headers: await authHeaders(token),
    });
    if (!res.ok) return await parseError(res);
    const data = await res.json();
    return { history: data.history, fromFixture: false };
  } catch {
    const local = readLocal<HistoryEntry>(uid, "history")
      .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
      .slice(0, limit);
    return { history: local, fromFixture: true };
  }
}

export function recordLocalHistory(uid: string, entry: HistoryEntry) {
  const existing = readLocal<HistoryEntry>(uid, "history");
  writeLocal(uid, "history", [entry, ...existing].slice(0, 100));
}

export async function sendChatMessage(
  token: string,
  message: string,
  history: ChatMessage[]
): Promise<ChatResult> {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { ...(await authHeaders(token)), "Content-Type": "application/json" },
    body: JSON.stringify({ message, history }),
  });
  if (!res.ok) return await parseError(res);
  return await res.json();
}
