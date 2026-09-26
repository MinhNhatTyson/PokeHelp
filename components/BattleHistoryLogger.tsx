"use client";

import { useState } from "react";
import { ComboResult } from "@/lib/logic/battleOptimizer";
import { useBattleHistoryStore } from "@/lib/store/battleHistoryStore";

export default function BattleHistoryLogger({
  opponentTeamNames,
  combo,
}: {
  opponentTeamNames: string[];
  combo: ComboResult;
}) {
  const logBattle = useBattleHistoryStore((s) => s.logBattle);
  const [outcome, setOutcome] = useState<"win" | "loss" | null>(null);
  const [reason, setReason] = useState("");
  const [logged, setLogged] = useState(false);

  function handleSubmit() {
    if (!outcome) return;
    logBattle({
      yourTeamNames: combo.members.map((m) => m.name),
      opponentTeamNames,
      recommendedLead: combo.recommendedLead.map((m) => m.name),
      outcome,
      reason: reason.trim(),
    });
    setLogged(true);
  }

  if (logged) {
    return (
      <div className="mt-4 rounded-md bg-emerald-100 px-4 py-3 text-sm text-emerald-900">
        Logged — PokeHelp will factor this into future AI strategy for similar matchups.
      </div>
    );
  }

  return (
    <div className="mt-4 rounded-lg border border-black/10 bg-white p-4">
      <p className="text-xs font-medium uppercase text-[color:var(--ink)]/40">
        How did it go? (logs against the top-ranked combo above)
      </p>
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          onClick={() => setOutcome("win")}
          className={`rounded-full px-3 py-1 text-sm font-medium ${outcome === "win" ? "bg-emerald-600 text-white" : "bg-black/10 text-[color:var(--ink)]"}`}
        >
          Win
        </button>
        <button
          type="button"
          onClick={() => setOutcome("loss")}
          className={`rounded-full px-3 py-1 text-sm font-medium ${outcome === "loss" ? "bg-red-600 text-white" : "bg-black/10 text-[color:var(--ink)]"}`}
        >
          Loss
        </button>
      </div>
      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Main reason — e.g. Opponent led with Rillaboom + Farigiraf, my Fake Out got redirected, Chi-Yu outsped and OHKO'd my Sylveon before I could act…"
        rows={3}
        className="mt-2 w-full resize-none rounded-md border border-black/10 px-3 py-2 text-sm text-[color:var(--ink)] outline-none placeholder:text-black/30 focus-visible:ring-2 focus-visible:ring-[color:var(--accent-gold)]"
      />
      <button
        type="button"
        onClick={handleSubmit}
        disabled={!outcome}
        className="mt-2 rounded-md bg-[color:var(--shell-accent)] px-3 py-1.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
      >
        Save to battle history
      </button>
    </div>
  );
}