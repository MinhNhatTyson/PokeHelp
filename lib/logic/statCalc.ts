import { getItemSignal } from "@/lib/logic/itemSignals";

export const NATURES = {
  hardy: { up: null, down: null }, lonely: { up: "attack", down: "defense" },
  brave: { up: "attack", down: "speed" }, adamant: { up: "attack", down: "spAttack" },
  naughty: { up: "attack", down: "spDefense" }, bold: { up: "defense", down: "attack" },
  docile: { up: null, down: null }, relaxed: { up: "defense", down: "speed" },
  impish: { up: "defense", down: "spAttack" }, lax: { up: "defense", down: "spDefense" },
  timid: { up: "speed", down: "attack" }, hasty: { up: "speed", down: "defense" },
  serious: { up: null, down: null }, jolly: { up: "speed", down: "spAttack" },
  naive: { up: "speed", down: "spDefense" }, modest: { up: "spAttack", down: "attack" },
  mild: { up: "spAttack", down: "defense" }, quiet: { up: "spAttack", down: "speed" },
  bashful: { up: null, down: null }, rash: { up: "spAttack", down: "spDefense" },
  calm: { up: "spDefense", down: "attack" }, gentle: { up: "spDefense", down: "defense" },
  sassy: { up: "spDefense", down: "speed" }, careful: { up: "spDefense", down: "spAttack" },
  quirky: { up: null, down: null },
} as const;

export type NatureName = keyof typeof NATURES;

export const NATURE_LABEL: Record<NatureName, string> = {
  hardy: "Hardy", lonely: "Lonely (+Atk, -Def)", brave: "Brave (+Atk, -Spe)",
  adamant: "Adamant (+Atk, -SpA)", naughty: "Naughty (+Atk, -SpD)",
  bold: "Bold (+Def, -Atk)", docile: "Docile", relaxed: "Relaxed (+Def, -Spe)",
  impish: "Impish (+Def, -SpA)", lax: "Lax (+Def, -SpD)",
  timid: "Timid (+Spe, -Atk)", hasty: "Hasty (+Spe, -Def)", serious: "Serious",
  jolly: "Jolly (+Spe, -SpA)", naive: "Naive (+Spe, -SpD)",
  modest: "Modest (+SpA, -Atk)", mild: "Mild (+SpA, -Def)", quiet: "Quiet (+SpA, -Spe)",
  bashful: "Bashful", rash: "Rash (+SpA, -SpD)",
  calm: "Calm (+SpD, -Atk)", gentle: "Gentle (+SpD, -Def)", sassy: "Sassy (+SpD, -Spe)",
  careful: "Careful (+SpD, -SpA)", quirky: "Quirky",
};

const VGC_LEVEL = 50;
const SPEED_IV = 31; // competitive default, not user-exposed

export function getSpeedNatureMultiplier(nature: NatureName | null): number {
  if (!nature) return 1;
  const n = NATURES[nature];
  if (n.up === "speed") return 1.1;
  if (n.down === "speed") return 0.9;
  return 1;
}

/** Base Speed stat at Lv.50, 31 IV, given EV investment + nature — no item applied yet. */
export function calculateSpeedStat(baseSpeed: number, speedEv: number, nature: NatureName | null): number {
  const raw = Math.floor((2 * baseSpeed + SPEED_IV + Math.floor(speedEv / 4)) * VGC_LEVEL / 100) + 5;
  return Math.floor(raw * getSpeedNatureMultiplier(nature));
}

/** Full effective Speed: base formula + held-item multiplier (Choice Scarf, Iron Ball, etc.) */
export function calculateEffectiveSpeed(
  baseSpeed: number,
  speedEv: number,
  nature: NatureName | null,
  itemName: string | null
): number {
  const stat = calculateSpeedStat(baseSpeed, speedEv, nature);
  const itemMultiplier = getItemSignal(itemName)?.speedMultiplier ?? 1;
  return Math.floor(stat * itemMultiplier);
}