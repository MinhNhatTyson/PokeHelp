"use client";

import { useMemo } from "react";
import { useTeamStore } from "@/lib/store/teamStore";
import { getTeamDefenseMatrix, getTeamOffenseReport } from "@/lib/logic/teamAnalysis";
import { POKEMON_TYPES } from "@/lib/types";
import { TYPE_COLOR } from "@/lib/typeMeta";
import TypeChip from "@/components/TypeChip";
import TypeBadge from "@/components/TypeBadge";

export default function TeamSummaryStrip() {
  const slots = useTeamStore((s) => s.slots);
  const memberCount = slots.filter((s) => s.pokemon).length;

  const summary = useMemo(() => {
    if (memberCount === 0) return null;
    const matrix = getTeamDefenseMatrix(slots);
    const shared = POKEMON_TYPES.filter((t) => matrix.weakCounts[t] >= 2).sort(
      (a, b) => matrix.weakCounts[b] - matrix.weakCounts[a]
    );
    const offense = getTeamOffenseReport(slots);
    return { shared, counts: matrix.weakCounts, gaps: [...offense.resistedByAll, ...offense.noEffectFromAll] };
  }, [slots, memberCount]);

  if (!summary) return null;

  return (
    <div className="mt-4 rounded-lg bg-black/5 p-3">
      <div className="flex flex-wrap items-center gap-2">
        {slots.map((s, i) =>
          s.pokemon ? (
            <span
              key={i}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-white"
              style={{ boxShadow: `0 0 0 3px ${TYPE_COLOR[s.pokemon.types[0]]}` }}
              title={s.pokemon.name}
            >
              {s.pokemon.spriteUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={s.pokemon.spriteUrl} alt={s.pokemon.name} className="h-9 w-9 object-contain" />
              )}
            </span>
          ) : (
            <span key={i} className="h-11 w-11 rounded-full border-2 border-dashed border-black/20" aria-label="Empty slot" />
          )
        )}
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div>
          <p className="text-xs font-medium uppercase text-[color:var(--ink)]/40">Shared weaknesses</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {summary.shared.length > 0 ? (
              summary.shared.map((t) => (
                <TypeChip key={t} type={t} multiplier={`${summary.counts[t]}/${memberCount}`} />
              ))
            ) : (
              <span className="text-sm text-emerald-800">No type hits 2+ members</span>
            )}
          </div>
        </div>
        <div>
          <p className="text-xs font-medium uppercase text-[color:var(--ink)]/40">Coverage gaps</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {summary.gaps.length > 0 ? (
              summary.gaps.map((t) => <TypeBadge key={t} type={t} size="sm" />)
            ) : (
              <span className="text-sm text-emerald-800">Everything is hit neutrally or better</span>
            )}
          </div>
        </div>
      </div>
      <p className="mt-2 text-[11px] text-[color:var(--ink)]/40">Types only (STAB) — abilities, items and moves aren&apos;t factored in.</p>
    </div>
  );
}