import { create } from "zustand";
import { PokemonDetail, OpponentSlot } from "@/lib/types";

export const OPPONENT_TEAM_SIZE = 6;
const EMPTY_SLOT: OpponentSlot = { pokemon: null, abilityName: null };

interface OpponentTeamState {
  slots: OpponentSlot[];
  setSlotPokemon: (index: number, pokemon: PokemonDetail | null) => void;
  setSlotAbility: (index: number, abilityName: string | null) => void;
  setSlotMegaFormDetail: (index: number, detail: PokemonDetail | null) => void;
  clearSlot: (index: number) => void;
  clearTeam: () => void;
}

export const useOpponentTeamStore = create<OpponentTeamState>((set) => ({
  slots: Array.from({ length: OPPONENT_TEAM_SIZE }, () => ({ ...EMPTY_SLOT })),
  setSlotPokemon: (index, pokemon) =>
    set((state) => {
      const slots = [...state.slots];
      slots[index] = { pokemon, abilityName: null, megaFormDetail: null };
      return { slots };
    }),
  setSlotMegaFormDetail: (index, detail) =>
    set((state) => {
      const slots = [...state.slots];
      slots[index] = { ...slots[index], megaFormDetail: detail };
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
  clearTeam: () =>
    set({ slots: Array.from({ length: OPPONENT_TEAM_SIZE }, () => ({ ...EMPTY_SLOT })) }),
}));

