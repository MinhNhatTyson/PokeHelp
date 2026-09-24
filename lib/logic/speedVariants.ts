import { PokemonDetail } from "@/lib/types";
import { NatureName, calculateEffectiveSpeed } from "@/lib/logic/statCalc";
import { getCommonSet } from "@/lib/data/commonSets";

export interface SpeedVariant {
  label: string;
  nature: NatureName | null;
  speedEv: number;
  itemName: string | null;
  speed: number;
  likelihood: number;
}

function baseSpeedOf(pokemon: PokemonDetail): number {
  return pokemon.stats.find((s) => s.name === "speed")?.baseStat ?? 0;
}

function getWeights(hasCurated: boolean, curatedIsScarf: boolean) {
  if (curatedIsScarf) return { maxSpeed: 20, scarf: 45, bulky: 20, trickRoom: 15, curated: 0 };
  if (hasCurated) return { maxSpeed: 20, scarf: 10, bulky: 15, trickRoom: 10, curated: 45 };
  return { maxSpeed: 35, scarf: 20, bulky: 30, trickRoom: 15, curated: 0 };
}

// We never know an opponent's real spread, so instead of one guess we surface
// the handful of archetypes that actually show up in tournament play. Not
// exhaustive — a deliberately cheap, deterministic stand-in for a real
// usage-stats lookup (see commonSets.ts's own curation caveat).
export function getSpeedVariants(pokemon: PokemonDetail): SpeedVariant[] {
  const base = baseSpeedOf(pokemon);
  const commonSet = getCommonSet(pokemon.name);
  const curatedItemSlug = commonSet?.topItem.toLowerCase().replace(/\s+/g, "-") ?? null;
  const curatedIsScarf = curatedItemSlug === "choice-scarf";
  const weights = getWeights(!!commonSet, curatedIsScarf);

  const variants: Omit<SpeedVariant, "speed">[] = [
    { label: "Max Speed (Jolly/Timid, 252 Spe)", nature: "jolly", speedEv: 252, itemName: null, likelihood: weights.maxSpeed },
    { label: "Max Speed + Choice Scarf", nature: "jolly", speedEv: 252, itemName: "choice-scarf", likelihood: weights.scarf },
    { label: "Bulky / no Speed investment (0 Spe, neutral)", nature: null, speedEv: 0, itemName: null, likelihood: weights.bulky },
    { label: "Trick Room spread (0 Spe, negative nature)", nature: "brave", speedEv: 0, itemName: null, likelihood: weights.trickRoom },
  ];

  if (commonSet && !curatedIsScarf) {
    variants.push({
      label: `Curated common set (${commonSet.topItem})`,
      nature: "jolly",
      speedEv: 252,
      itemName: curatedItemSlug,
      likelihood: weights.curated,
    });
  }

  return variants
    .map((v) => ({ ...v, speed: calculateEffectiveSpeed(base, v.speedEv, v.nature, v.itemName) }))
    .sort((a, b) => b.likelihood - a.likelihood);
}