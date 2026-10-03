"use client";

import { useState } from "react";
import { LeadPrediction, HISTORY_WEIGHT, SIGNAL_WEIGHT } from "@/lib/logic/battleOptimizer";
import TypeBadge from "@/components/TypeBadge";

export default function OpponentLeadPrediction({
  prediction,
  sprites,
}: {
  prediction: LeadPrediction;
  sprites: Record<string, string | null>;
}) {
  const [showAll, setShowAll] = useState(false);
  const { entries, historyCount } = prediction;
  if (entries.length === 0) return null;

  const top = entries[0].score || 1;
  const rows = showAll ? entries : entries.slice(0, 2);

  return (
    <div className="pokecard mt-6" style={{ borderColor: "var(--accent-gold)" }}>
      <div className="h-2 bg-gradient-to-r from-[color:var(--shell-accent)] via-[color:var(--accent-gold)] to-[color:var(--shell-accent)]" />
      <div className="p-4">
        <h2 className="font-heading text-lg text-[color:var(--ink)]">Predicted opponent lead</h2>
        <p className="mt-1 text-xs text-[color:var(--ink)]/60">
          {historyCount === 0
            ? "No logged battles with leads yet, so this is a signals-only guess. Finish a Live Battle session or log a battle with their leads to sharpen it."
            : `Blends ${historyCount} logged battle${historyCount === 1 ? "" : "s"} (${Math.round(HISTORY_WEIGHT * 100)}%) with move/ability signals (${Math.round(SIGNAL_WEIGHT * 100)}%).`}
        </p>

        <div className="mt-2 flex flex-wrap gap-3 text-[11px] text-[color:var(--ink)]/60">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[color:var(--accent-gold)]" /> Battle History
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[color:var(--shell-accent)]" /> Signals
          </span>
        </div>

        <ul className="mt-3 space-y-2">
          {rows.map((e) => {
            const isLead = entries.indexOf(e) < 2;
            const sprite = sprites[e.name];
            return (
              <li key={e.name} className="rounded-lg bg-black/5 p-3">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                  {sprite && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={sprite} alt="" className="h-10 w-10 shrink-0 object-contain" />
                  )}
                  <span className="text-sm font-medium capitalize text-[color:var(--ink)]">{e.name}</span>
                  <span className="flex gap-1">{e.types.map((t) => <TypeBadge key={t} type={t} size="sm" />)}</span>
                  {isLead && (
                    <span className="rounded-full bg-[color:var(--shell-accent)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                      Lead
                    </span>
                  )}
                </div>

                <div
                  role="img"
                  aria-label={`${e.name} lead score ${Math.round((e.score / top) * 100)} out of 100`}
                  className="mt-2 flex h-2.5 overflow-hidden rounded-full bg-black/10"
                >
                  <div className="h-full bg-[color:var(--accent-gold)]" style={{ width: `${(e.historyPart / top) * 100}%` }} />
                  <div className="h-full bg-[color:var(--shell-accent)]" style={{ width: `${(e.signalPart / top) * 100}%` }} />
                </div>

                <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px] text-[color:var(--ink)]/60">
                  {e.tags.map((t) => (
                    <span key={t} className="rounded-full bg-black/10 px-2 py-0.5 text-[color:var(--ink)]">{t}</span>
                  ))}
                  {e.tags.length === 0 && <span>No lead tools in curated data</span>}
                  {historyCount > 0 && (
                    <span className="ml-auto">
                      {e.seen > 0 ? `led ${e.led} of ${e.seen} past battle${e.seen === 1 ? "" : "s"}` : "not seen in past battles"}
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>

        {entries.length > 2 && (
          <button
            type="button"
            onClick={() => setShowAll((v) => !v)}
            className="btn-tactile mt-3 min-h-[40px] rounded-full bg-black/10 px-4 text-xs font-medium text-[color:var(--ink)]"
          >
            {showAll ? "Show top 2 only" : `Show all ${entries.length}`}
          </button>
        )}
        <p className="mt-3 text-[11px] text-[color:var(--ink)]/40">
          Opponent movesets are never known, so tags only appear for species in the curated common sets.
        </p>
      </div>
    </div>
  );
}