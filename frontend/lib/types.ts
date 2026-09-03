export type Currency = {
  code: string;
  name: string;
};

export type ConvertResult = {
  base: string;
  target: string;
  amount: number;
  rate: number;
  result: number;
  source: "cache" | "db" | "api" | "fixture";
  timestamp: string;
};

export type TrendPoint = {
  date: string;
  rate: number;
};

export type TrendResult = {
  base: string;
  target: string;
  points: TrendPoint[];
};

export type Favorite = {
  id: number;
  base: string;
  target: string;
  created_at: string;
};

export type HistoryEntry = {
  base: string;
  target: string;
  amount: number;
  result: number;
  created_at: string;
};

export type BudgetLine = {
  currency: string;
  rate: number;
  converted: number;
};

export type BudgetResult = {
  base: string;
  amount: number;
  results: BudgetLine[];
};
