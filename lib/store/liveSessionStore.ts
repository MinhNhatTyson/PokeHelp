import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface LiveSessionSnapshot {
  sessionId: string;
  endedAt: number;
  yourTeamNames: string[];      // the bring-4 actually used
  opponentTeamNames: string[];  // opponent's previewed roster
  yourLeads: string[];
  opponentLeads: string[];
  turnsPlayed: number;
  log: string[];                // one compiled sentence per turn
  outcome: "win" | "loss" | null;
  reason: string;
  logged: boolean;              // true if "Save & end" already wrote it to Battle History
}

interface LiveSessionState {
  snapshot: LiveSessionSnapshot | null;
  setSnapshot: (snapshot: LiveSessionSnapshot) => void;
  clearSnapshot: () => void;
}

export const useLiveSessionStore = create<LiveSessionState>()(
  persist(
    (set) => ({
      snapshot: null,
      setSnapshot: (snapshot) => set({ snapshot }),
      clearSnapshot: () => set({ snapshot: null }),
    }),
    {
      name: "pokehelp-last-live-session",
      version: 1,
      migrate: (persisted) => {
        const s = (persisted ?? {}) as { snapshot?: Partial<LiveSessionSnapshot> | null };
        const x = s.snapshot;
        const valid = !!x && typeof x.sessionId === "string" && Array.isArray(x.opponentTeamNames) && Array.isArray(x.log);
        return { snapshot: valid ? x : null } as LiveSessionState;
      },
    }
  )
);