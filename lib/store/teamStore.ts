import { create } from "zustand";
import { persist } from "zustand/middleware";
import { PokemonDetail, SpSpread, TeamSlot } from "@/lib/types";
import { evToSp, MAX_SP_PER_STAT, MAX_TOTAL_SP, NatureName } from "../logic/statCalc";
import { normalizeTeamSlot, emptySpread, sanitizeSpread } from "@/lib/store/slotMigration";

export const TEAM_SIZE = 6;
const EMPTY_SLOT: TeamSlot = {
  pokemon: null, itemName: null, abilityName: null, roleNotes: null,
  moves: [null, null, null, null], nature: null, speedSp: 0, spread: emptySpread(),
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
  setSlotSp: (index: number, stat: keyof SpSpread | "spe", value: number) => void;
  setSlotSpread: (index: number, sp: SpSpread & { spe: number }) => void;
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
          slots[index] = { pokemon, itemName: slots[index].itemName, abilityName: null, roleNotes: slots[index].roleNotes, moves: [null, null, null, null], nature: null, speedSp: 0, spread: emptySpread() }
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
            spread: sanitizeSpread(s.spread),
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
      // One stat at a time: clamped to 32 and to whatever is left of the 66-point budget
      setSlotSp: (index, stat, value) =>
        set((state) => {
          const slots = [...state.slots];
          const s = slots[index];
          const all: Record<string, number> = { ...s.spread, spe: s.speedSp };
          const others = Object.entries(all).reduce((sum, [k, v]) => (k === stat ? sum : sum + v), 0);
          const next = Math.max(0, Math.min(MAX_SP_PER_STAT, MAX_TOTAL_SP - others, Math.round(Number.isFinite(value) ? value : 0)));
          slots[index] = stat === "spe" ? { ...s, speedSp: next } : { ...s, spread: { ...s.spread, [stat]: next } };
          return { slots };
        }),
      // Whole spread at once (presets, Showdown import): each stat clamped to 0-32
      setSlotSpread: (index, sp) =>
        set((state) => {
          const slots = [...state.slots];
          const c = (n: number) => Math.max(0, Math.min(MAX_SP_PER_STAT, Math.round(n) || 0));
          slots[index] = {
            ...slots[index],
            speedSp: c(sp.spe),
            spread: { hp: c(sp.hp), atk: c(sp.atk), def: c(sp.def), spa: c(sp.spa), spd: c(sp.spd) },
          };
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
            spread: sanitizeSpread(s.spread),
            pokemon: s.pokemon ? { ...s.pokemon, moves: s.pokemon.moves ?? [] } : s.pokemon,
          })),
        };
      },
    }
  )
);