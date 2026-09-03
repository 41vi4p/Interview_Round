import { HistoryManifest } from "@/components/HistoryManifest";

export const metadata = {
  title: "History — Rate Board",
};

export default function HistoryPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-amber">Manifest</p>
        <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
          Conversion history.
        </h1>
        <p className="mt-2 max-w-xl font-mono text-sm text-ink-dim">
          Your last 20 conversions, most recent first.
        </p>
      </div>
      <HistoryManifest />
    </div>
  );
}
