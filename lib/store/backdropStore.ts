import { create } from "zustand";
import { PokemonTypeName } from "@/lib/types";

interface BackdropState {
  override: PokemonTypeName | null;
  setOverride: (type: PokemonTypeName | null) => void;
}

export const useBackdropStore = create<BackdropState>((set) => ({
  override: null,
  setOverride: (override) => set({ override }),
}));