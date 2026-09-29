"use client";

import { useMemo, useState } from "react";
import { useTeamStore } from "@/lib/store/teamStore";
import { useSavedTeamsStore } from "@/lib/store/savedTeamsStore";
import { getTeamDefenseMatrix, getTeamOffenseReport } from "@/lib/logic/teamAnalysis";
import TeamSlotPicker from "@/components/TeamSlotPicker";
import TeamCoverageReport from "@/components/TeamCoverageReport";
import TeamSuggestionPanel from "./TeamSuggestionPanel";
import TeamSlotCard from "@/components/TeamSlotCard";
import SlotEditorModal from "@/components/SlotEditorModal";
import TeamSummaryStrip from "@/components/TeamSummaryStrip";
import ImportTeamModal from "@/components/ImportTeamModal";

export default function TeamBuilder() {
  const slots = useTeamStore((s) => s.slots);
  const clearTeam = useTeamStore((s) => s.clearTeam);
  const loadSlots = useTeamStore((s) => s.loadSlots);

  const savedTeams = useSavedTeamsStore((s) => s.teams);
  const saveTeam = useSavedTeamsStore((s) => s.saveTeam);
  const deleteTeam = useSavedTeamsStore((s) => s.deleteTeam);
  const [saveName, setSaveName] = useState("");
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [confirmNew, setConfirmNew] = useState(false);
  const [showImport, setShowImport] = useState(false);

  function startNewTeam(saveFirst: boolean) {
    if (saveFirst && isComplete) saveTeam(saveName, slots, teamStrategy);
    clearTeam();
    setSaveName("");
    setConfirmNew(false);
  }

  const isComplete = slots.every((s) => s.pokemon && s.itemName && s.abilityName);
  const filledCount = slots.filter((s) => s.pokemon && s.itemName && s.abilityName).length;
  const defenseMatrix = useMemo(() => (isComplete ? getTeamDefenseMatrix(slots) : null), [slots, isComplete]);
  const offense = useMemo(() => (isComplete ? getTeamOffenseReport(slots) : null), [slots, isComplete]);

  const teamStrategy = useTeamStore((s) => s.teamStrategy);
  const setTeamStrategy = useTeamStore((s) => s.setTeamStrategy);
  const hasContent = slots.some((s) => s.pokemon) || teamStrategy.trim() !== "";

  const activeTeamId = useTeamStore((s) => s.activeTeamId);
  const setActiveTeamId = useTeamStore((s) => s.setActiveTeamId);
  const updateTeam = useSavedTeamsStore((s) => s.updateTeam);

  const activeTeamName = savedTeams.find((t) => t.id === activeTeamId)?.name ?? null;

  function handleSave() {
    if (!isComplete) return;
    if (activeTeamId) {
      updateTeam(activeTeamId, saveName || activeTeamName || "Untitled team", slots, teamStrategy);
    } else {
      saveTeam(saveName, slots, teamStrategy);
    }
    setSaveName("");
  }

  return (
    <div className="w-full max-w-4xl rounded-2xl border-4 border-[color:var(--shell)] bg-[color:var(--shell)] shadow-none">
      <div className="h-2 rounded-t-lg bg-[color:var(--shell-accent)]" />

      <div className="rounded-b-lg bg-[color:var(--screen)] p-6 sm:p-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="font-logo text-2xl sm:text-3xl text-[color:var(--ink)]">Team builder</h1>
            <p className="mt-1 text-sm text-[color:var(--ink)]/70">Fill all 6 slots — Pokémon, item, ability — to see your team&apos;s coverage.</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => setShowImport(true)}
              className="rounded-md border border-black/15 bg-white px-3 py-1.5 text-sm font-medium text-[color:var(--ink)] hover:bg-black/5 btn-tactile"
            >
              Import
            </button>
            <button
              type="button"
              onClick={() => setConfirmNew(true)}
              disabled={!hasContent}
              className="rounded-md bg-[color:var(--shell-accent)] px-3 py-1.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-40 btn-tactile btn-glow-accent"
            >
              + New team
            </button>
          </div>
          {confirmNew && (
            <div role="alertdialog" className="mt-3 rounded-lg border border-[color:var(--shell-accent)]/40 bg-red-50 p-3 text-sm text-[color:var(--ink)]">
              <p>Start a new team? Your current team and game plan will be cleared.</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => startNewTeam(true)}
                  disabled={!isComplete}
                  className="rounded-md bg-[color:var(--shell-accent)] px-3 py-1.5 font-medium text-white disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Save &amp; start new
                </button>
                <button type="button" onClick={() => startNewTeam(false)} className="rounded-md bg-black/10 px-3 py-1.5 font-medium">
                  Discard &amp; start new
                </button>
                <button type="button" onClick={() => setConfirmNew(false)} className="px-3 py-1.5 text-[color:var(--ink)]/60 hover:underline">
                  Cancel
                </button>
              </div>
              {!isComplete && <p className="mt-1.5 text-xs text-[color:var(--ink)]/50">Saving needs all 6 slots complete.</p>}
            </div>
          )}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2 rounded-lg bg-black/5 p-3">
          {activeTeamId && (
            <p className="w-full text-xs text-[color:var(--ink)]/50">
              Editing <span className="font-medium">{activeTeamName}</span> — Update overwrites it, or clear the name box first to save as new.
            </p>
          )}
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
            className="shrink-0 rounded-md bg-[color:var(--shell-accent)] px-3 py-1.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-40 btn-tactile btn-glow-accent"
          >
            {activeTeamId ? "Update team" : "Save team"}
          </button>
          {!isComplete && <p className="w-full text-xs text-[color:var(--ink)]/40">Fill all 6 slots to save.</p>}
        </div>

        <div className="mt-4">
          <label htmlFor="team-strategy" className="text-xs font-medium uppercase text-[color:var(--ink)]/40">
            Overall game plan
          </label>
          <textarea
            id="team-strategy"
            value={teamStrategy}
            onChange={(e) => setTeamStrategy(e.target.value)}
            placeholder="e.g. Weather-based offense — Torkoal sets sun turn 1, then Charizard and Sylveon clean up behind Tailwind."
            rows={2}
            className="mt-1 w-full resize-none rounded-md border border-black/10 bg-white px-3 py-2 text-sm text-[color:var(--ink)] outline-none placeholder:text-black/30 focus-visible:ring-2 focus-visible:ring-[color:var(--accent-gold)]"
          />
        </div>

        {savedTeams.length > 0 && (
          <div className="mt-3">
            <p className="text-xs font-medium uppercase text-[color:var(--ink)]/40">Saved teams</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {savedTeams.map((t) => (
                <div key={t.id} className="flex items-center gap-1 rounded-full border border-black/10 bg-white pl-3 pr-1 py-1 text-sm">
                  <button
                    type="button"
                    onClick={() => { loadSlots(t.slots, t.teamStrategy); setActiveTeamId(t.id); setSaveName(t.name); }}
                    className="text-[color:var(--ink)] hover:underline"
                  >
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

        <TeamSummaryStrip />

        <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-3">
          {slots.map((_, i) => (
            <TeamSlotCard key={i} index={i} onOpen={() => setEditingIndex(i)} />
          ))}
        </div>
        <SlotEditorModal index={editingIndex} onClose={() => setEditingIndex(null)} />
        <ImportTeamModal open={showImport} onClose={() => setShowImport(false)} />
          
        <TeamSuggestionPanel />

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