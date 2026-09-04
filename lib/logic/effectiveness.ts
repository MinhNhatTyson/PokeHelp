import {
  POKEMON_TYPES,
  PokemonTypeName,
  TypeAttackProfile,
  TypeDefenseProfile,
  TypeMatchup,
} from "@/lib/types";

// Single source of truth: how each type fares on DEFENSE.
// The attacking view is derived from this by inversion below.
const DEFENSE_CHART: Record<PokemonTypeName, TypeDefenseProfile> = {
  normal:   { weakTo: ["fighting"], resists: [], immuneTo: ["ghost"] },
  fire:     { weakTo: ["water", "ground", "rock"], resists: ["fire", "grass", "ice", "bug", "steel", "fairy"], immuneTo: [] },
  water:    { weakTo: ["electric", "grass"], resists: ["fire", "water", "ice", "steel"], immuneTo: [] },
  electric: { weakTo: ["ground"], resists: ["electric", "flying", "steel"], immuneTo: [] },
  grass:    { weakTo: ["fire", "ice", "poison", "flying", "bug"], resists: ["water", "electric", "grass", "ground"], immuneTo: [] },
  ice:      { weakTo: ["fire", "fighting", "rock", "steel"], resists: ["ice"], immuneTo: [] },
  fighting: { weakTo: ["flying", "psychic", "fairy"], resists: ["bug", "rock", "dark"], immuneTo: [] },
  poison:   { weakTo: ["ground", "psychic"], resists: ["grass", "fighting", "poison", "bug", "fairy"], immuneTo: [] },
  ground:   { weakTo: ["water", "grass", "ice"], resists: ["poison", "rock"], immuneTo: ["electric"] },
  flying:   { weakTo: ["electric", "ice", "rock"], resists: ["grass", "fighting", "bug"], immuneTo: ["ground"] },
  psychic:  { weakTo: ["bug", "ghost", "dark"], resists: ["fighting", "psychic"], immuneTo: [] },
  bug:      { weakTo: ["fire", "flying", "rock"], resists: ["grass", "fighting", "ground"], immuneTo: [] },
  rock:     { weakTo: ["water", "grass", "fighting", "ground", "steel"], resists: ["normal", "fire", "poison", "flying"], immuneTo: [] },
  ghost:    { weakTo: ["ghost", "dark"], resists: ["poison", "bug"], immuneTo: ["normal", "fighting"] },
  dragon:   { weakTo: ["ice", "dragon", "fairy"], resists: ["fire", "water", "electric", "grass"], immuneTo: [] },
  dark:     { weakTo: ["fighting", "bug", "fairy"], resists: ["ghost", "dark"], immuneTo: ["psychic"] },
  steel:    { weakTo: ["fire", "fighting", "ground"], resists: ["normal", "grass", "ice", "flying", "psychic", "bug", "rock", "dragon", "steel", "fairy"], immuneTo: ["poison"] },
  fairy:    { weakTo: ["poison", "steel"], resists: ["fighting", "bug", "dark"], immuneTo: ["dragon"] },
};

export function getDefenseProfile(type: PokemonTypeName): TypeDefenseProfile {
  return DEFENSE_CHART[type];
}

export function getAttackProfile(type: PokemonTypeName): TypeAttackProfile {
  const superEffectiveAgainst: PokemonTypeName[] = [];
  const notVeryEffectiveAgainst: PokemonTypeName[] = [];
  const noEffectAgainst: PokemonTypeName[] = [];

  for (const target of POKEMON_TYPES) {
    const profile = DEFENSE_CHART[target];
    if (profile.weakTo.includes(type)) superEffectiveAgainst.push(target);
    else if (profile.resists.includes(type)) notVeryEffectiveAgainst.push(target);
    else if (profile.immuneTo.includes(type)) noEffectAgainst.push(target);
  }

  return { superEffectiveAgainst, notVeryEffectiveAgainst, noEffectAgainst };
}

export function getTypeMatchup(type: PokemonTypeName): TypeMatchup {
  return { type, attack: getAttackProfile(type), defense: getDefenseProfile(type) };
}