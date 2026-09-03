const LABELS: Record<string, string> = {
  cache: "LIVE · REDIS",
  db: "LIVE · DB",
  api: "LIVE · API",
  fixture: "DEMO DATA",
};

const DOT: Record<string, string> = {
  cache: "bg-teal-bright",
  db: "bg-teal-bright",
  api: "bg-amber-bright",
  fixture: "bg-ink-dim",
};

export function SourceChip({ source }: { source: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-hairline bg-panel-raised px-2.5 py-1 font-mono text-[10px] font-medium uppercase tracking-[0.12em] text-ink-dim">
      <span
        className={`h-1.5 w-1.5 rounded-full ${DOT[source] ?? "bg-ink-dim"} ${
          source !== "fixture" ? "animate-pulse" : ""
        }`}
        aria-hidden
      />
      {LABELS[source] ?? source.toUpperCase()}
    </span>
  );
}
