import { PokemonTypeName } from "@/lib/types";

export type WeatherKind = "sun" | "rain" | "sand" | "snow";

export interface AbilitySignal {
  /** PokeAPI ability slug, e.g. "sand-stream" */
  name: string;
  /** Overrides this type's damage to 0x for the holder — competitive-relevant immunity abilities only */
  immunity?: PokemonTypeName;
  /** This ability sets the given weather on switch-in */
  weatherSets?: WeatherKind;
  /** This ability gets a meaningful payoff (usually Speed) under the given weather */
  weatherBoostedBy?: WeatherKind;
  /** Lowers opposing physical attackers' Attack on switch-in */
  isIntimidate?: boolean;
}

// Deliberately small and curated — NOT the full ability-effects system (that's
// a separate roadmap item). This only covers signals cheap/safe enough to
// factor into a bring-4 recommendation without simulating actual battle turns.
export const ABILITY_SIGNALS: Record<string, AbilitySignal> = {
  intimidate: { name: "intimidate", isIntimidate: true },

  drought: { name: "drought", weatherSets: "sun" },
  drizzle: { name: "drizzle", weatherSets: "rain" },
  "sand-stream": { name: "sand-stream", weatherSets: "sand" },
  "snow-warning": { name: "snow-warning", weatherSets: "snow" },

  chlorophyll: { name: "chlorophyll", weatherBoostedBy: "sun" },
  "swift-swim": { name: "swift-swim", weatherBoostedBy: "rain" },
  "sand-rush": { name: "sand-rush", weatherBoostedBy: "sand" },
  "slush-rush": { name: "slush-rush", weatherBoostedBy: "snow" },

  levitate: { name: "levitate", immunity: "ground" },
  "water-absorb": { name: "water-absorb", immunity: "water" },
  "volt-absorb": { name: "volt-absorb", immunity: "electric" },
  "storm-drain": { name: "storm-drain", immunity: "water" },
  "lightning-rod": { name: "lightning-rod", immunity: "electric" },
  "flash-fire": { name: "flash-fire", immunity: "fire" },
  "sap-sipper": { name: "sap-sipper", immunity: "grass" },
  "dry-skin": { name: "dry-skin", immunity: "water" },
};

export function getAbilitySignal(abilityName: string | null): AbilitySignal | null {
  if (!abilityName) return null;
  return ABILITY_SIGNALS[abilityName] ?? null;
}