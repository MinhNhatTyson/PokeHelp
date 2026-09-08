"use client";

import { useMemo, useState } from "react";
import { useTeamStore } from "@/lib/store/teamStore";
import { useSavedTeamsStore } from "@/lib/store/savedTeamsStore";
import { getTeamDefenseMatrix, getTeamOffenseReport } from "@/lib/logic/teamAnalysis";
import TeamSlotPicker from "@/components/TeamSlotPicker";
import TeamCoverageReport from "@/components/TeamCoverageReport";

export default function TeamBuilder() {
  const slots = useTeamStore((s) => s.slots);
  const clearTeam = useTeamStore((s) => s.clearTeam);
  const loadSlots = useTeamStore((s) => s.loadSlots);

  const savedTeams = useSavedTeamsStore((s) => s.teams);
  const saveTeam = useSavedTeamsStore((s) => s.saveTeam);
  const deleteTeam = useSavedTeamsStore((s) => s.deleteTeam);
  const [saveName, setSaveName] = useState("");

  const isComplete = slots.every((s) => s.pokemon && s.itemName && s.abilityName);
  const filledCount = slots.filter((s) => s.pokemon && s.itemName && s.abilityName).length;
  const defenseMatrix = useMemo(() => (isComplete ? getTeamDefenseMatrix(slots) : null), [slots, isComplete]);
  const offense = useMemo(() => (isComplete ? getTeamOffenseReport(slots) : null), [slots, isComplete]);

  function handleSave() {
    if (!isComplete) return;
    saveTeam(saveName, slots);
    setSaveName("");
  }

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

        <div className="mt-4 flex flex-wrap items-center gap-2 rounded-lg bg-black/5 p-3">
          <input
            value={saveName}
            onChange={(e) => setSaveName(e.target.value)}
            placeholder="Name this team…"
            disabled={!isComplete}
            className="min-w-0 flex-1 rounded-md border border-black/10 bg-white px-3 py-1.5 text-sm text-[color:var(--ink)] outline-none placeholder:text-black/30 disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-[color:var(--accent-gold)]"
          />
          <button
            type="button"
            onClick={handleSave}
            disabled={!isComplete}
            className="shrink-0 rounded-md bg-[color:var(--shell-accent)] px-3 py-1.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            Save team
          </button>
          {!isComplete && <p className="w-full text-xs text-[color:var(--ink)]/40">Fill all 6 slots to save.</p>}
        </div>

        {savedTeams.length > 0 && (
          <div className="mt-3">
            <p className="text-xs font-medium uppercase text-[color:var(--ink)]/40">Saved teams</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {savedTeams.map((t) => (
                <div key={t.id} className="flex items-center gap-1 rounded-full border border-black/10 bg-white pl-3 pr-1 py-1 text-sm">
                  <button type="button" onClick={() => loadSlots(t.slots)} className="text-[color:var(--ink)] hover:underline">
                    {t.name}
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteTeam(t.id)}
                    aria-label={`Delete ${t.name}`}
                    className="rounded-full px-1.5 text-[color:var(--ink)]/40 hover:bg-black/10 hover:text-red-600"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <p className="mt-3 text-xs uppercase tracking-wide text-[color:var(--ink)]/40">{filledCount}/6 slots complete</p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {slots.map((_, i) => (
            <TeamSlotPicker key={i} index={i} />
          ))}
        </div>

        {isComplete && defenseMatrix && offense ? (
          <TeamCoverageReport defenseMatrix={defenseMatrix} offense={offense} />
        ) : (
          <p className="mt-8 border-t border-black/10 pt-6 text-sm text-[color:var(--ink)]/50">
            Fill in every slot to see your team&apos;s coverage report.
          </p>
        )}
      </div>
    </div>
  );
}