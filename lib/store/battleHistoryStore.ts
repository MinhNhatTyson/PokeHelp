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
    { name: "pokehelp-battle-history" }
  )
);