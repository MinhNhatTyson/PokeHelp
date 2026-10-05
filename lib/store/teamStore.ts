import { create } from "zustand";
import { persist } from "zustand/middleware";
import { PokemonDetail, TeamSlot } from "@/lib/types";
import { evToSp, MAX_SP_PER_STAT, NatureName } from "../logic/statCalc";
import { normalizeTeamSlot } from "@/lib/store/slotMigration";

export const TEAM_SIZE = 6;
const EMPTY_SLOT: TeamSlot = {
  pokemon: null, itemName: null, abilityName: null, roleNotes: null,
  moves: [null, null, null, null], nature: null, speedSp: 0,
};
function migrateSpeedSp(s: Partial<TeamSlot> & { speedEv?: number }): number {
  return typeof s.speedSp === "number" ? s.speedSp : evToSp(s.speedEv ?? 0);
}

interface TeamState {
  slots: TeamSlot[];
  teamStrategy: string;
  activeTeamId: string | null;
  setActiveTeamId: (id: string | null) => void;
  setSlotPokemon: (index: number, pokemon: PokemonDetail | null) => void;
  setSlotItem: (index: number, itemName: string | null) => void;
  setSlotAbility: (index: number, abilityName: string | null) => void;
  setSlotMove: (index: number, moveIndex: number, moveName: string | null) => void; // NEW
  setSlotNotes: (index: number, roleNotes: string | null) => void;
  setTeamStrategy: (text: string) => void;
  clearSlot: (index: number) => void;
  clearTeam: () => void;
  loadSlots: (slots: TeamSlot[], teamStrategy?: string) => void;
  setSlotNature: (index: number, nature: NatureName | null) => void;
  setSlotSpeedSp: (index: number, speedSp: number) => void;
}

export const useTeamStore = create<TeamState>()(
  persist(
    (set) => ({
      slots: Array.from({ length: TEAM_SIZE }, () => ({ ...EMPTY_SLOT })),
      activeTeamId: null,
      setActiveTeamId: (activeTeamId) => set({ activeTeamId }),
      teamStrategy: "",
      setSlotPokemon: (index, pokemon) =>
        set((state) => {
          const slots = [...state.slots];
          const isDuplicate = pokemon && slots.some((s, i) => i !== index && s.pokemon?.name === pokemon.name);
          if (isDuplicate) return state;
          slots[index] = { pokemon, itemName: slots[index].itemName, abilityName: null, roleNotes: slots[index].roleNotes, moves: [null, null, null, null], nature: null, speedSp: 0 };
          return { slots };
        }),
      setSlotMove: (index, moveIndex, moveName) =>
        set((state) => {
          const slots = [...state.slots];
          const moves = [...slots[index].moves];
          moves[moveIndex] = moveName;
          slots[index] = { ...slots[index], moves };
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
          slots[index] = { ...EMPTY_SLOT, moves: [null, null, null, null] };
          return { slots };
        }),
      clearTeam: () => set({ slots: Array.from({ length: TEAM_SIZE }, () => ({ ...EMPTY_SLOT, moves: [null, null, null, null] })), teamStrategy: "", activeTeamId: null }),
      loadSlots: (slots, teamStrategy) =>
        set({
          slots: slots.map((s) => ({
            ...s,
            roleNotes: s.roleNotes ?? null,
            moves: s.moves ?? [null, null, null, null],
            nature: s.nature ?? null,
            speedSp: migrateSpeedSp(s),
            pokemon: s.pokemon ? { ...s.pokemon, moves: s.pokemon.moves ?? [] } : s.pokemon,
          })),
          teamStrategy: teamStrategy ?? "",
        }),
      setSlotNotes: (index, roleNotes) =>
        set((state) => {
          const slots = [...state.slots];
          slots[index] = { ...slots[index], roleNotes };
          return { slots };
        }),
      setTeamStrategy: (text) => set({ teamStrategy: text }),     
      setSlotNature: (index, nature) =>
        set((state) => {
          const slots = [...state.slots];
          slots[index] = { ...slots[index], nature };
          return { slots };
        }),
      setSlotSpeedSp: (index, speedSp) =>
        set((state) => {
          const slots = [...state.slots];
          slots[index] = { ...slots[index], speedSp: Math.max(0, Math.min(MAX_SP_PER_STAT, speedSp)) };
          return { slots };
        }),
    }),
    {
      name: "pokehelp-active-team",
      version: 1,
      migrate: (persisted) => {
        const s = (persisted ?? {}) as Partial<TeamState>;
        if (Array.isArray(s.slots)) s.slots = s.slots.map(normalizeTeamSlot);
        return s as TeamState;
      },
      merge: (persistedState, currentState) => {
        const persisted = persistedState as Partial<TeamState> | undefined;
        if (!persisted?.slots) return { ...currentState, ...persisted };
        return {
          ...currentState,
          ...persisted,
          slots: persisted.slots.map((s) => ({
            ...s,
            moves: s.moves ?? [null, null, null, null],
            nature: s.nature ?? null,
            speedSp: migrateSpeedSp(s),
            pokemon: s.pokemon ? { ...s.pokemon, moves: s.pokemon.moves ?? [] } : s.pokemon,
          })),
        };
      },
    }
  )
);