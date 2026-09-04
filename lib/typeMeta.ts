import { PokemonTypeName } from "@/lib/types";

export const TYPE_COLOR: Record<PokemonTypeName, string> = {
  normal: "#A8A77A", fire: "#EE8130", water: "#6390F0", electric: "#F7D02C",
  grass: "#7AC74C", ice: "#96D9D6", fighting: "#C22E28", poison: "#A33EA1",
  ground: "#E2BF65", flying: "#A98FF3", psychic: "#F95587", bug: "#A6B91A",
  rock: "#B6A136", ghost: "#735797", dragon: "#6F35FC", dark: "#705746",
  steel: "#B7B7CE", fairy: "#D685AD",
};

// Simple manual contrast pick per swatch (not computed) — good enough for solid pills.
export const TYPE_TEXT_ON_COLOR: Record<PokemonTypeName, "light" | "dark"> = {
  normal: "dark", fire: "light", water: "light", electric: "dark",
  grass: "dark", ice: "dark", fighting: "light", poison: "light",
  ground: "dark", flying: "dark", psychic: "light", bug: "dark",
  rock: "dark", ghost: "light", dragon: "light", dark: "light",
  steel: "dark", fairy: "dark",
};

export const TYPE_LABEL: Record<PokemonTypeName, string> = {
  normal: "Normal", fire: "Fire", water: "Water", electric: "Electric",
  grass: "Grass", ice: "Ice", fighting: "Fighting", poison: "Poison",
  ground: "Ground", flying: "Flying", psychic: "Psychic", bug: "Bug",
  rock: "Rock", ghost: "Ghost", dragon: "Dragon", dark: "Dark",
  steel: "Steel", fairy: "Fairy",
};