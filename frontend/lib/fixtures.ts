import type { BudgetLine, Currency, TrendPoint } from "./types";

// Approximate USD-based rates, used only when the backend is unreachable so the
// UI has believable numbers to work with during frontend-only development.
export const FIXTURE_USD_RATES: Record<string, number> = {
  USD: 1,
  EUR: 0.92,
  GBP: 0.79,
  JPY: 147.2,
  AUD: 1.52,
  CAD: 1.36,
  CHF: 0.88,
  CNY: 7.13,
  INR: 83.9,
  SGD: 1.34,
  NZD: 1.64,
  ZAR: 18.1,
  BRL: 5.4,
  MXN: 17.6,
  AED: 3.67,
  SEK: 10.4,
  NOK: 10.6,
  KRW: 1345,
  HKD: 7.82,
  THB: 34.9,
};

export const FIXTURE_CURRENCY_NAMES: Record<string, string> = {
  USD: "United States Dollar",
  EUR: "Euro",
  GBP: "British Pound Sterling",
  JPY: "Japanese Yen",
  AUD: "Australian Dollar",
  CAD: "Canadian Dollar",
  CHF: "Swiss Franc",
  CNY: "Chinese Yuan",
  INR: "Indian Rupee",
  SGD: "Singapore Dollar",
  NZD: "New Zealand Dollar",
  ZAR: "South African Rand",
  BRL: "Brazilian Real",
  MXN: "Mexican Peso",
  AED: "UAE Dirham",
  SEK: "Swedish Krona",
  NOK: "Norwegian Krone",
  KRW: "South Korean Won",
  HKD: "Hong Kong Dollar",
  THB: "Thai Baht",
};

export const FIXTURE_CURRENCIES: Currency[] = Object.keys(FIXTURE_USD_RATES).map(
  (code) => ({ code, name: FIXTURE_CURRENCY_NAMES[code] ?? code })
);

export function fixtureRate(base: string, target: string): number {
  const b = FIXTURE_USD_RATES[base] ?? 1;
  const t = FIXTURE_USD_RATES[target] ?? 1;
  return t / b;
}

// Deterministic pseudo-random walk seeded by pair + date so repeated renders
// (and reloads) show a stable trend line rather than jumping around.
function seededRandom(seed: string): () => number {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };
}

export function fixtureTrend(base: string, target: string): TrendPoint[] {
  const centerRate = fixtureRate(base, target);
  const rand = seededRandom(`${base}:${target}`);
  const points: TrendPoint[] = [];
  let rate = centerRate * (0.985 + rand() * 0.03);
  const today = new Date();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() - i);
    const drift = (rand() - 0.5) * centerRate * 0.012;
    rate = Math.max(rate + drift, centerRate * 0.85);
    points.push({
      date: d.toISOString().slice(0, 10),
      rate: Number(rate.toFixed(6)),
    });
  }
  // anchor the final point to the "live" fixture rate for consistency with /convert
  points[points.length - 1] = {
    date: points[points.length - 1].date,
    rate: Number(centerRate.toFixed(6)),
  };
  return points;
}

const BUDGET_SET = ["USD", "EUR", "GBP", "JPY", "AUD"];

export function fixtureBudget(base: string, amount: number): BudgetLine[] {
  const targets = BUDGET_SET.includes(base)
    ? [...BUDGET_SET.filter((c) => c !== base), "CAD"]
    : BUDGET_SET;
  return targets.map((currency) => {
    const rate = fixtureRate(base, currency);
    return { currency, rate: Number(rate.toFixed(6)), converted: Number((rate * amount).toFixed(2)) };
  });
}
