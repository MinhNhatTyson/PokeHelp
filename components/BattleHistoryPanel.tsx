"use client";

import { useState, useSyncExternalStore } from "react";
import { useBattleHistoryStore } from "@/lib/store/battleHistoryStore";

const WIN = "#10b981";
const LOSS = "#ef4444";

export default function BattleHistoryPanel() {
  const stored = useBattleHistoryStore((s) => s.entries);
  const deleteBattle = useBattleHistoryStore((s) => s.deleteBattle);
  const clearHistory = useBattleHistoryStore((s) => s.clearHistory);
  const mounted = useSyncExternalStore(() => () => {}, () => true, () => false);
  const [confirmClear, setConfirmClear] = useState(false);

  const entries = mounted ? stored : [];

  if (entries.length === 0) {
    return (
      <div className="rounded-lg border-2 border-dashed border-black/20 bg-black/5 p-6 text-center">
        <p className="font-heading text-lg text-[color:var(--ink)]">No battles logged yet</p>
        <p className="mt-1 text-sm text-[color:var(--ink)]/60">
          Finish a Live Battle session or log a result from the Battle Optimizer. Logged leads sharpen the opponent lead prediction.
        </p>
      </div>
    );
  }

  const wins = entries.filter((e) => e.outcome === "win").length;
  const rate = Math.round((wins / entries.length) * 100);

  return (
    <div>
      <div className="rounded-lg bg-black/5 p-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase text-[color:var(--ink)]/40">Last {entries.length} battle{entries.length === 1 ? "" : "s"}</p>
            <p className="mt-0.5 text-2xl font-semibold tabular-nums text-[color:var(--ink)]">
              {wins}W – {entries.length - wins}L <span className="text-base font-normal text-[color:var(--ink)]/50">({rate}%)</span>
            </p>
          </div>
          <div className="flex items-center gap-1.5" aria-label="Recent results, newest first">
            {entries.map((e) => (
              <span
                key={e.id}
                title={e.outcome === "win" ? "Win" : "Loss"}
                className="h-3.5 w-3.5 rounded-full"
                style={{ backgroundColor: e.outcome === "win" ? WIN : LOSS }}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {entries.map((e) => {
          const win = e.outcome === "win";
          const leads = e.opponentLeads ?? [];
          return (
            <div key={e.id} className="pokecard" style={{ borderColor: win ? WIN : LOSS }}>
              <div className={`effect-banner ${win ? "effect-banner--resist" : "effect-banner--weak"}`}>
                <span>{win ? "Win" : "Loss"}</span>
                <span className="text-xs font-medium opacity-90">{new Date(e.loggedAt).toLocaleDateString()}</span>
              </div>
              <div className="space-y-3 p-4">
                <div>
                  <p className="text-xs font-medium uppercase text-[color:var(--ink)]/40">You brought</p>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {e.yourTeamNames.map((n) => (
                      <span
                        key={n}
                        className={`rounded-full px-2.5 py-1 text-xs capitalize ${
                          e.recommendedLead.includes(n) ? "bg-[color:var(--accent-gold)] font-medium text-black" : "bg-black/10 text-[color:var(--ink)]"
                        }`}
                      >
                        {n}
                      </span>
                    ))}
                  </div>
                  {e.recommendedLead.length > 0 && <p className="mt-1 text-[11px] text-[color:var(--ink)]/40">Gold = your leads</p>}
                </div>

                <div>
                  <p className="text-xs font-medium uppercase text-[color:var(--ink)]/40">Opponent&apos;s team</p>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {e.opponentTeamNames.map((n) => (
                      <span
                        key={n}
                        className={`rounded-full px-2.5 py-1 text-xs capitalize ${
                          leads.includes(n) ? "bg-[color:var(--shell-accent)] font-medium text-white" : "bg-black/10 text-[color:var(--ink)]"
                        }`}
                      >
                        {n}
                      </span>
                    ))}
                  </div>
                  {leads.length > 0 && <p className="mt-1 text-[11px] text-[color:var(--ink)]/40">Red = their leads</p>}
                </div>

                {e.reason && <p className="border-t border-black/10 pt-3 text-sm text-[color:var(--ink)]/80">{e.reason}</p>}

                <button
                  type="button"
                  onClick={() => deleteBattle(e.id)}
                  className="btn-tactile min-h-[40px] rounded-full bg-black/10 px-4 text-xs font-medium text-[color:var(--ink)] hover:text-red-700"
                >
                  Delete
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-5">
        {!confirmClear ? (
          <button type="button" onClick={() => setConfirmClear(true)} className="min-h-[40px] text-xs text-[color:var(--ink)]/50 hover:underline">
            Clear all history
          </button>
        ) : (
          <div role="alertdialog" className="rounded-lg border border-[color:var(--shell-accent)]/40 bg-red-50 p-3 text-sm text-[color:var(--ink)]">
            <p>Delete all {entries.length} logged battles? This also removes the data behind the lead prediction.</p>
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={() => { clearHistory(); setConfirmClear(false); }}
                className="btn-tactile min-h-[44px] rounded-md bg-[color:var(--shell-accent)] px-4 font-medium text-white"
              >
                Delete all
              </button>
              <button type="button" onClick={() => setConfirmClear(false)} className="btn-tactile min-h-[44px] rounded-md bg-black/10 px-4">
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}