import { create } from "zustand";
import { PokemonTypeName } from "@/lib/types";

export interface BackdropFigure {
  src: string;              // image whose alpha becomes the silhouette
  type?: PokemonTypeName;   // tint color; falls back to the page's scene type
}

interface BackdropState {
  override: PokemonTypeName | null;
  setOverride: (type: PokemonTypeName | null) => void;
  figures: BackdropFigure[];
  setFigures: (figures: BackdropFigure[]) => void;
}

export const useBackdropStore = create<BackdropState>((set) => ({
  override: null,
  setOverride: (override) => set({ override }),
  figures: [],
  setFigures: (figures) => set({ figures }),
}));