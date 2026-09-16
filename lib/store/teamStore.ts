import { create } from "zustand";
import { persist } from "zustand/middleware";
import { PokemonDetail, TeamSlot } from "@/lib/types";

export const TEAM_SIZE = 6;
const EMPTY_SLOT: TeamSlot = { pokemon: null, itemName: null, abilityName: null, roleNotes: null };

interface TeamState {
  slots: TeamSlot[];
  teamStrategy: string; // overall game-plan text, separate from per-slot roleNotes
  setSlotPokemon: (index: number, pokemon: PokemonDetail | null) => void;
  setSlotItem: (index: number, itemName: string | null) => void;
  setSlotAbility: (index: number, abilityName: string | null) => void;
  setSlotNotes: (index: number, roleNotes: string | null) => void;
  setTeamStrategy: (text: string) => void;
  clearSlot: (index: number) => void;
  clearTeam: () => void;
  loadSlots: (slots: TeamSlot[]) => void;
}

export const useTeamStore = create<TeamState>()(
  persist(
    (set) => ({
      slots: Array.from({ length: TEAM_SIZE }, () => ({ ...EMPTY_SLOT })),
      teamStrategy: "",
      setSlotPokemon: (index, pokemon) =>
        set((state) => {
          const slots = [...state.slots];
          const isDuplicate = pokemon && slots.some((s, i) => i !== index && s.pokemon?.name === pokemon.name);
          if (isDuplicate) return state;
          slots[index] = { pokemon, itemName: slots[index].itemName, abilityName: null, roleNotes: slots[index].roleNotes };
          return { slots };
        }),
      setSlotItem: (index, itemName) =>
        set((state) => {
          const slots = [...state.slots];
          slots[index] = { ...slots[index], itemName };
          return { slots };
        }),
      setSlotAbility: (index, abilityName) =>
        set((state) => {
          const slots = [...state.slots];
          slots[index] = { ...slots[index], abilityName };
          return { slots };
        }),
      clearSlot: (index) =>
        set((state) => {
          const slots = [...state.slots];
          slots[index] = { ...EMPTY_SLOT };
          return { slots };
        }),
      setSlotNotes: (index, roleNotes) =>
        set((state) => {
          const slots = [...state.slots];
          slots[index] = { ...slots[index], roleNotes };
          return { slots };
        }),
      setTeamStrategy: (text) => set({ teamStrategy: text }),
      clearTeam: () => set({ slots: Array.from({ length: TEAM_SIZE }, () => ({ ...EMPTY_SLOT })), teamStrategy: "" }),
      loadSlots: (slots) => set({ slots: slots.map((s) => ({ ...s, roleNotes: s.roleNotes ?? null })) }),
    }),
    { name: "pokehelp-active-team" }
  )
);