import { create } from "zustand";
import { PokemonTypeName } from "@/lib/types";

export interface BackdropFigure {
  src: string;                 // image whose alpha becomes the silhouette
  types?: PokemonTypeName[];
  side?: "left" | "right";
}

export interface DamageSignal {
  kind: "hit" | "ko" | "immune";
  key: string; // changes whenever the numbers change, so effects can replay
}

export type AiTestStatus = "idle" | "loading" | "ok" | "fail";

interface BackdropState {
  override: PokemonTypeName | null;
  setOverride: (type: PokemonTypeName | null) => void;
  figures: BackdropFigure[];
  setFigures: (figures: BackdropFigure[]) => void;
  speedChance: number | null;       // /speed: % chance you move first
  setSpeedChance: (chance: number | null) => void;
  damage: DamageSignal | null;      // /damage: latest calc result
  setDamage: (damage: DamageSignal | null) => void;
  aiTest: AiTestStatus;             // /settings: state of the "Test selected model" button
  setAiTest: (status: AiTestStatus) => void;
  rankKey: string | null;           // /optimizer: identifies the current top lineup (changes => flare)
  setRankKey: (key: string | null) => void;
  dexPing: { type: PokemonTypeName; n: number } | null; // /: latest Pokédex pick (n increments every pick)
  pingDex: (type: PokemonTypeName | null) => void;
}

export const useBackdropStore = create<BackdropState>((set) => ({
  override: null,
  setOverride: (override) => set({ override }),
  figures: [],
  setFigures: (figures) => set({ figures }),
  speedChance: null,
  setSpeedChance: (speedChance) => set({ speedChance }),
  damage: null,
  setDamage: (damage) => set({ damage }),
  aiTest: "idle",
  setAiTest: (aiTest) => set({ aiTest }),
  rankKey: null,
  setRankKey: (rankKey) => set({ rankKey }),
  dexPing: null,
  pingDex: (type) =>
    set((s) => ({ dexPing: type ? { type, n: (s.dexPing?.n ?? 0) + 1 } : null })),
}));