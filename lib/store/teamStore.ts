import { create } from "zustand";
import { PokemonDetail, TeamSlot } from "@/lib/types";

export const TEAM_SIZE = 6;
const EMPTY_SLOT: TeamSlot = { pokemon: null, itemName: null, abilityName: null };

interface TeamState {
  slots: TeamSlot[];
  setSlotPokemon: (index: number, pokemon: PokemonDetail | null) => void;
  setSlotItem: (index: number, itemName: string | null) => void;
  setSlotAbility: (index: number, abilityName: string | null) => void;
  clearSlot: (index: number) => void;
  clearTeam: () => void;
}

export const useTeamStore = create<TeamState>((set) => ({
  slots: Array.from({ length: TEAM_SIZE }, () => ({ ...EMPTY_SLOT })),
  setSlotPokemon: (index, pokemon) =>
    set((state) => {
      const slots = [...state.slots];
      // New mon invalidates the previous ability selection — it belonged to the old species
      slots[index] = { pokemon, itemName: slots[index].itemName, abilityName: null };
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
  clearTeam: () => set({ slots: Array.from({ length: TEAM_SIZE }, () => ({ ...EMPTY_SLOT })) }),
}));