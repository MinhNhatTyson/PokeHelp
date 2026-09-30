"use client";
import { useState } from "react";
import { TYPE_COLOR } from "@/lib/typeMeta";
import { ComboResult } from "@/lib/logic/battleOptimizer";
import TypeBadge from "@/components/TypeBadge";

export default function ComboResultCard({ rank, result }: { rank: number; result: ComboResult }) {
  const [open, setOpen] = useState(rank === 1);
  const { members, breakdown, recommendedLead, backLine, strategyNotes, leadDamageChecks } = result;
  return (
    <div
      className={`overflow-hidden ${rank === 1 ? "card-holo-light" : "pokecard"}`}
      style={rank > 1 ? { borderColor: TYPE_COLOR[members[0].types[0]] } : undefined}
    >
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open}
        className="flex w-full cursor-pointer items-center justify-between gap-3 p-4 text-left btn-tactile">
        <div>
          <span className="font-heading text-sm uppercase text-[color:var(--ink)]/50">
            {rank === 1 ? "★ Top pick" : `#${rank}`}
          </span>
          <p className="mt-0.5 text-sm capitalize text-[color:var(--ink)]">{members.map((m) => m.name).join(" · ")}</p>
        </div>
        <span className="shrink-0 rounded-full bg-[color:var(--shell)] px-3 py-1 text-sm font-semibold tabular-nums text-[color:var(--screen)]">
          {breakdown.total.toFixed(1)}
        </span>
      </button>
            {open && (
        <div className="space-y-3 px-4 pb-4">
          <div className="flex flex-wrap gap-3">
            {members.map((m) => (
              <div key={m.name} className="flex items-center gap-1.5">
                <span className="text-sm capitalize text-[color:var(--ink)]">{m.name}</span>
                <div className="flex gap-1">{m.types.map((t) => <TypeBadge key={t} type={t} size="sm" />)}</div>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2 rounded-md bg-black/5 px-3 py-2 text-xs">
            <span className="font-medium uppercase text-[color:var(--ink)]/50">Suggested lead</span>
            <span className="capitalize text-[color:var(--ink)]">{recommendedLead.map((m) => m.name).join(" + ")}</span>
            <span className="text-[color:var(--ink)]/30">·</span>
            <span className="text-[color:var(--ink)]/50">back: <span className="capitalize">{backLine.map((m) => m.name).join(" + ")}</span></span>
          </div>

          <div className="grid gap-2 text-xs text-[color:var(--ink)]/70 sm:grid-cols-5">
            <p>Defense: {breakdown.defenseScore.toFixed(1)}</p>
            <p>Offense: {breakdown.offenseScore.toFixed(1)}</p>
            <p>Ability signals: {breakdown.abilityScore.toFixed(1)}</p>
            <p>Item signals: {breakdown.itemScore.toFixed(1)}</p>
            <p>Speed: {breakdown.speedScore.toFixed(1)}</p>
          </div>

          {breakdown.sharedWeaknesses.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <span className="text-[color:var(--ink)]/50">Shared weaknesses:</span>
              {breakdown.sharedWeaknesses.map((t) => <TypeBadge key={t} type={t} size="sm" />)}
            </div>
          )}

          {breakdown.offensiveGaps.length > 0 && (
            <p className="text-xs text-[color:var(--ink)]/50">
              Can&apos;t hit hard: <span className="capitalize">{breakdown.offensiveGaps.join(", ")}</span>
            </p>
          )}

          {strategyNotes.length > 0 && (
            <ul className="space-y-1 border-t border-black/10 pt-2 text-xs text-[color:var(--ink)]/70">
              {strategyNotes.map((note, i) => <li key={i}>{note}</li>)}
            </ul>
          )}

          {leadDamageChecks.length > 0 && (
            <div className="border-t border-black/10 pt-2">
              <p className="text-xs font-medium uppercase text-[color:var(--ink)]/40">Opening damage check</p>
              <ul className="mt-1 space-y-1 text-xs text-[color:var(--ink)]/70">
                {leadDamageChecks.map((c, i) => <li key={i}>{c.description}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>    
  );
}