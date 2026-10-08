"use client";

import type { DamageOutcome } from "@/lib/logic/damageCalc";

export default function LiveDamagePreview({ outcome, currentHp, onUse }: {
  outcome: DamageOutcome;
  currentHp: number;               // target's HP% right now
  onUse: (pct: number) => void;    // fills the damage slider
}) {
  if (!outcome.ok) {
    return <p className="mt-2 text-[11px] text-[color:var(--ink)]/50">Calc unavailable: {outcome.error}</p>;
  }
  if (outcome.kind === "noEffect") {
    return <p className="mt-2 rounded-md bg-black/5 px-2.5 py-1.5 text-[11px] text-[color:var(--ink)]/70">Calc: {outcome.message}</p>;
  }

  const { minPct, maxPct } = outcome;
  const clamp = (n: number) => Math.max(1, Math.min(currentHp, Math.round(n)));
  const verdict = minPct >= currentHp ? "Guaranteed KO" : maxPct >= currentHp ? "Possible KO" : null;
  const picks = [["Min", minPct], ["Avg", (minPct + maxPct) / 2], ["Max", maxPct]] as const;

  return (
    <div className="mt-2 rounded-md border border-dashed border-black/20 bg-black/[0.03] px-2.5 py-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-[color:var(--ink)]">
          <span className="font-medium uppercase text-[color:var(--ink)]/40">Calc </span>
          <span className="font-semibold tabular-nums">{minPct}–{maxPct}%</span>
          <span className="text-[color:var(--ink)]/60"> of max HP</span>
        </p>
        {verdict && (
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase text-white ${verdict === "Guaranteed KO" ? "bg-red-600" : "bg-amber-500"}`}>
            {verdict}
          </span>
        )}
      </div>

      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
        <span className="text-[10px] uppercase text-[color:var(--ink)]/40">Fill slider</span>
        {picks.map(([label, v]) => (
          <button key={label} type="button" onClick={() => onUse(clamp(v))}
            className="btn-tactile min-h-[32px] rounded-full bg-black/10 px-3 text-xs font-medium text-[color:var(--ink)]">
            {label} {clamp(v)}%
          </button>
        ))}
      </div>

      {outcome.warnings.map((w, i) => (
        <p key={i} className="mt-1.5 rounded bg-[color:var(--accent-gold)]/30 px-2 py-1 text-[10px] text-[color:var(--ink)]">{w}</p>
      ))}
      <details className="mt-1.5">
        <summary className="cursor-pointer text-[10px] text-[color:var(--ink)]/50">Show calc line</summary>
        <p className="mt-1 text-[10px] text-[color:var(--ink)]/60">{outcome.description}</p>
      </details>
    </div>
  );
}