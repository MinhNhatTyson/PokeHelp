import { create } from "zustand";
import { persist } from "zustand/middleware";
import { SavedTeam, TeamSlot } from "@/lib/types";

interface SavedTeamsState {
  teams: SavedTeam[];
  saveTeam: (name: string, slots: TeamSlot[]) => void;
  updateTeam: (id: string, name: string, slots: TeamSlot[]) => void;
  deleteTeam: (id: string) => void;
}

export const useSavedTeamsStore = create<SavedTeamsState>()(
  persist(
    (set) => ({
      teams: [],
      updateTeam: (id, name, slots) =>
        set((state) => ({
          teams: state.teams.map((t) =>
            t.id === id ? { ...t, name: name.trim() || t.name, savedAt: Date.now(), slots: slots.map((s) => ({ ...s })) } : t
          ),
        })),
      saveTeam: (name, slots) =>
        set((state) => ({
          teams: [
            ...state.teams,
            { id: crypto.randomUUID(), name: name.trim() || "Untitled team", savedAt: Date.now(), slots: slots.map((s) => ({ ...s })) },
          ],
        })),
      deleteTeam: (id) => set((state) => ({ teams: state.teams.filter((t) => t.id !== id) })),
    }),
    { name: "pokehelp-saved-teams" }
  )
);