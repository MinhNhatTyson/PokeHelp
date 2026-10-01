import { PokemonDetail } from "@/lib/types";
import { NatureName, calculateEffectiveSpeed, SpeedConditions, NO_SPEED_CONDITIONS } from "@/lib/logic/statCalc";
import { getCommonSet } from "@/lib/data/commonSets";

export interface SpeedVariant {
  label: string;
  nature: NatureName | null;
  speedSp: number;
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

export function getSpeedVariants(pokemon: PokemonDetail, cond: SpeedConditions = NO_SPEED_CONDITIONS): SpeedVariant[] {
  const base = baseSpeedOf(pokemon);
  const commonSet = getCommonSet(pokemon.name);
  const curatedItemSlug = commonSet?.topItem.toLowerCase().replace(/\s+/g, "-") ?? null;
  const curatedIsScarf = curatedItemSlug === "choice-scarf";
  const weights = getWeights(!!commonSet, curatedIsScarf);

  const variants: Omit<SpeedVariant, "speed">[] = [
    { label: "Max Speed (Jolly/Timid, 32 SP)", nature: "jolly", speedSp: 32, itemName: null, likelihood: weights.maxSpeed },
    { label: "Max Speed + Choice Scarf", nature: "jolly", speedSp: 32, itemName: "choice-scarf", likelihood: weights.scarf },
    { label: "Bulky / no Speed investment (0 Spe, neutral)", nature: null, speedSp: 0, itemName: null, likelihood: weights.bulky },
    { label: "Trick Room spread (0 Spe, negative nature)", nature: "brave", speedSp: 0, itemName: null, likelihood: weights.trickRoom },
  ];

  if (commonSet && !curatedIsScarf) {
    variants.push({
      label: `Curated common set (${commonSet.topItem})`,
      nature: "jolly",
      speedSp: 32,
      itemName: curatedItemSlug,
      likelihood: weights.curated,
    });
  }

  return variants
    .map((v) => ({ ...v, speed: calculateEffectiveSpeed(base, v.speedSp, v.nature, v.itemName, cond) }))
    .sort((a, b) => b.likelihood - a.likelihood);
}