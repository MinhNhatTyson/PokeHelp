export const POKEMON_TYPES = [
  "normal", "fire", "water", "electric", "grass", "ice", "fighting", "poison",
  "ground", "flying", "psychic", "bug", "rock", "ghost", "dragon", "dark",
  "steel", "fairy",
] as const;

export type PokemonTypeName = (typeof POKEMON_TYPES)[number];

export interface TypeDefenseProfile {
  weakTo: PokemonTypeName[];
  resists: PokemonTypeName[];
  immuneTo: PokemonTypeName[];
}

export interface TypeAttackProfile {
  superEffectiveAgainst: PokemonTypeName[];
  notVeryEffectiveAgainst: PokemonTypeName[];
  noEffectAgainst: PokemonTypeName[];
}

export interface TypeMatchup {
  type: PokemonTypeName;
  attack: TypeAttackProfile;
  defense: TypeDefenseProfile;
}

export interface Pokemon {
  id: number;
  name: string;
  spriteUrl: string | null;
  types: PokemonTypeName[]; // ordered, length 1 or 2
}

export type EffectivenessMultiplier = 0 | 0.25 | 0.5 | 1 | 2 | 4;

export interface DualTypeDefenseProfile {
  quad: PokemonTypeName[];    // 4x weak
  double: PokemonTypeName[];  // 2x weak
  neutral: PokemonTypeName[]; // 1x
  half: PokemonTypeName[];    // 0.5x resist
  quarter: PokemonTypeName[]; // 0.25x resist
  immune: PokemonTypeName[];  // 0x
}