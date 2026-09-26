"use client";

import { useBattleHistoryStore } from "@/lib/store/battleHistoryStore";

export default function BattleHistoryPanel() {
  const entries = useBattleHistoryStore((s) => s.entries);
  const deleteBattle = useBattleHistoryStore((s) => s.deleteBattle);

  if (entries.length === 0) {
    return (
      <p className="text-sm text-[color:var(--ink)]/50">
        No battles logged yet — log one from the Battle Optimizer after a match.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {entries.map((e) => (
        <div key={e.id} className="rounded-lg border border-black/10 bg-white p-4">
          <div className="flex items-center justify-between">
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                e.outcome === "win" ? "bg-emerald-100 text-emerald-900" : "bg-red-100 text-red-900"
              }`}
            >
              {e.outcome === "win" ? "Win" : "Loss"}
            </span>
            <span className="text-xs text-[color:var(--ink)]/40">
              {new Date(e.loggedAt).toLocaleDateString()}
            </span>
          </div>
          <p className="mt-2 text-sm capitalize text-[color:var(--ink)]">
            <span className="text-[color:var(--ink)]/50">Brought:</span> {e.yourTeamNames.join(", ")}
          </p>
          <p className="text-sm capitalize text-[color:var(--ink)]">
            <span className="text-[color:var(--ink)]/50">Opponent:</span> {e.opponentTeamNames.join(", ")}
          </p>
          {e.reason && <p className="mt-2 text-sm text-[color:var(--ink)]/70">{e.reason}</p>}
          <button
            type="button"
            onClick={() => deleteBattle(e.id)}
            className="mt-2 text-xs text-[color:var(--ink)]/40 hover:text-red-600 hover:underline"
          >
            Delete
          </button>
        </div>
      ))}
    </div>
  );
}