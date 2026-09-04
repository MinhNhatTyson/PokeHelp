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