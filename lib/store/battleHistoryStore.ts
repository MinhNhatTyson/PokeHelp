import { create } from "zustand";
import { persist } from "zustand/middleware";
import { BattleHistoryEntry } from "@/lib/types";

export const MAX_BATTLE_HISTORY = 10;

interface BattleHistoryState {
  entries: BattleHistoryEntry[];
  logBattle: (entry: Omit<BattleHistoryEntry, "id" | "loggedAt">) => void;
  deleteBattle: (id: string) => void;
  clearHistory: () => void;
}

export const useBattleHistoryStore = create<BattleHistoryState>()(
  persist(
    (set) => ({
      entries: [],
      logBattle: (entry) =>
        set((state) => ({
          entries: [
            { ...entry, id: crypto.randomUUID(), loggedAt: Date.now() },
            ...state.entries,
          ].slice(0, MAX_BATTLE_HISTORY),
        })),
      deleteBattle: (id) =>
        set((state) => ({ entries: state.entries.filter((e) => e.id !== id) })),
      clearHistory: () => set({ entries: [] }),
    }),
    {
      name: "pokehelp-battle-history",
      version: 1,
      migrate: (persisted) => {
        const s = (persisted ?? {}) as { entries?: Partial<BattleHistoryEntry>[] };
        const entries: BattleHistoryEntry[] = (Array.isArray(s.entries) ? s.entries : [])
          .filter((e) => e.outcome === "win" || e.outcome === "loss")
          .map((e) => ({
            id: e.id ?? crypto.randomUUID(),
            loggedAt: e.loggedAt ?? Date.now(),
            yourTeamNames: e.yourTeamNames ?? [],
            opponentTeamNames: e.opponentTeamNames ?? [],
            recommendedLead: e.recommendedLead ?? [],
            outcome: e.outcome as "win" | "loss",
            reason: e.reason ?? "",
            opponentLeads: Array.isArray(e.opponentLeads) && e.opponentLeads.length === 2 ? e.opponentLeads : undefined,
          }))
          .slice(0, MAX_BATTLE_HISTORY);
        return { ...s, entries } as BattleHistoryState;
      },
    }
  )
);