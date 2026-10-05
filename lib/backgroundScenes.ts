import type { PokemonTypeName } from "@/lib/types";

export type SceneMotif =
  | "balls" | "ballTypes" | "cards" | "versus"
  | "rings" | "speedlines" | "embers" | "grid"
  | "arena" | "timeline" | "machinery";
export type SceneGlow = "corner" | "split" | "low" | "center";

export interface BackgroundScene {
  type: PokemonTypeName;
  motif: SceneMotif;
  glow: SceneGlow;
  calm?: boolean;     // slows ball drift
  vignette?: boolean; // darkens the edges (Live Battle)
  figures?: boolean;     // silhouettes are driven by the page via backdropStore.figures
  figureSize?: string;
  arena?: boolean;
}

export const SCENES: Record<string, BackgroundScene> = {
  "/":          { type: "grass",    motif: "balls",      glow: "corner" },
  "/items":     { type: "poison",   motif: "ballTypes",  glow: "corner", figures: true, figureSize: "clamp(200px, 28vw, 380px)" },
  "/team":      { type: "water",    motif: "cards",      glow: "center", figures: true, figureSize: "clamp(160px, calc((100vw - 34rem) / 2), 420px)" },
  "/optimizer": { type: "fighting", motif: "arena",     glow: "split",  figures: true, arena: true },
  "/history":   { type: "psychic",  motif: "timeline",  glow: "center", calm: true },
  "/settings":  { type: "steel",    motif: "machinery", glow: "corner", calm: true },
  "/speed":     { type: "electric", motif: "speedlines", glow: "split" },
  "/battle":    { type: "fire",     motif: "embers",     glow: "low", calm: true, vignette: true },
  "/damage":    { type: "rock",     motif: "grid",       glow: "corner", calm: true },
  "/trainers":  { type: "dragon",   motif: "balls",      glow: "corner" },
  "/moves":     { type: "ghost",    motif: "rings",     glow: "corner" },
};

const DEFAULT_SCENE: BackgroundScene = { type: "dragon", motif: "balls", glow: "corner" };

export function getScene(pathname: string): BackgroundScene {
  return SCENES[pathname] ?? DEFAULT_SCENE;
}