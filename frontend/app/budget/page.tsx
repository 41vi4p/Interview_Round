import { BudgetBoard } from "@/components/BudgetBoard";

export const metadata = {
  title: "Budget — Rate Board",
};

export default function BudgetPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-amber">
          Travel Budgeting
        </p>
        <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
          One budget, five destinations.
        </h1>
        <p className="mt-2 max-w-xl font-mono text-sm text-ink-dim">
          Set your home currency and travel budget, then pick which
          destinations to compare it against — up to 8 at once.
        </p>
      </div>
      <BudgetBoard />
    </div>
  );
}
