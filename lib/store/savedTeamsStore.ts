import { create } from "zustand";
import { persist } from "zustand/middleware";
import { SavedTeam, TeamSlot } from "@/lib/types";
import { normalizeTeamSlot } from "@/lib/store/slotMigration";

interface SavedTeamsState {
  teams: SavedTeam[];
  saveTeam: (name: string, slots: TeamSlot[], teamStrategy: string) => void;
  updateTeam: (id: string, name: string, slots: TeamSlot[], teamStrategy: string) => void;
  deleteTeam: (id: string) => void;
}

export const useSavedTeamsStore = create<SavedTeamsState>()(
  persist(
    (set) => ({
      teams: [],
      saveTeam: (name, slots, teamStrategy) =>
        set((state) => ({
          teams: [
            ...state.teams,
            { id: crypto.randomUUID(), name: name.trim() || "Untitled team", savedAt: Date.now(), slots: slots.map((s) => ({ ...s })), teamStrategy },
          ],
        })),
      updateTeam: (id, name, slots, teamStrategy) =>
        set((state) => ({
          teams: state.teams.map((t) =>
            t.id === id ? { ...t, name: name.trim() || t.name, savedAt: Date.now(), slots: slots.map((s) => ({ ...s })), teamStrategy } : t
          ),
        })),
      deleteTeam: (id) => set((state) => ({ teams: state.teams.filter((t) => t.id !== id) })),
    }),
    {
      name: "pokehelp-saved-teams",
      version: 1,
      migrate: (persisted) => {
        const s = (persisted ?? {}) as { teams?: Partial<SavedTeam>[] };
        const teams = (Array.isArray(s.teams) ? s.teams : [])
          .map((t) => ({
            id: t.id ?? crypto.randomUUID(),
            name: t.name ?? "Untitled team",
            savedAt: t.savedAt ?? Date.now(),
            slots: Array.isArray(t.slots) ? t.slots.map(normalizeTeamSlot) : [],
            teamStrategy: t.teamStrategy ?? "",
          }))
          .filter((t) => t.slots.length > 0); // an empty team would crash TeamBuilder's slots.map
        return { ...s, teams } as SavedTeamsState;
      },
    }
  )
);