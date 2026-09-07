"use client";

import { useMemo } from "react";
import { useTeamStore } from "@/lib/store/teamStore";
import { getTeamDefenseReport, getTeamOffenseReport } from "@/lib/logic/teamAnalysis";
import TeamSlotPicker from "@/components/TeamSlotPicker";
import TeamCoverageReport from "@/components/TeamCoverageReport";

export default function TeamBuilder() {
  const slots = useTeamStore((s) => s.slots);
  const clearTeam = useTeamStore((s) => s.clearTeam);

  const isComplete = slots.every((s) => s.pokemon && s.itemName && s.abilityName);
  const filledCount = slots.filter((s) => s.pokemon && s.itemName && s.abilityName).length;

  const defense = useMemo(() => (isComplete ? getTeamDefenseReport(slots) : null), [slots, isComplete]);
  const offense = useMemo(() => (isComplete ? getTeamOffenseReport(slots) : null), [slots, isComplete]);

  return (
    <div className="w-full max-w-4xl rounded-2xl border-4 border-[color:var(--shell)] bg-[color:var(--shell)] shadow-none">
      <div className="h-2 rounded-t-lg bg-[color:var(--shell-accent)]" />

      <div className="rounded-b-lg bg-[color:var(--screen)] p-6 sm:p-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl sm:text-3xl text-[color:var(--ink)]">Team builder</h1>
            <p className="mt-1 text-sm text-[color:var(--ink)]/70">Fill all 6 slots — Pokémon, item, ability — to see your team&apos;s coverage.</p>
          </div>
          <button type="button" onClick={clearTeam} className="shrink-0 text-sm text-[color:var(--ink)]/50 hover:underline">
            Reset team
          </button>
        </div>

        <p className="mt-3 text-xs uppercase tracking-wide text-[color:var(--ink)]/40">{filledCount}/6 slots complete</p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {slots.map((_, i) => (
            <TeamSlotPicker key={i} index={i} />
          ))}
        </div>

        {isComplete && defense && offense ? (
          <TeamCoverageReport defense={defense} offense={offense} teamSize={slots.length} />
        ) : (
          <p className="mt-8 border-t border-black/10 pt-6 text-sm text-[color:var(--ink)]/50">
            Fill in every slot to see your team&apos;s coverage report.
          </p>
        )}
      </div>
    </div>
  );
}