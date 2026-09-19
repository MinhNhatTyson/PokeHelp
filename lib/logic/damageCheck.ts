import { calculate, Generations, Pokemon, Move } from "@smogon/calc";
import type { CoverageMon } from "@/lib/logic/battleOptimizer";
import { getCommonSet, CommonSetEntry } from "@/lib/data/commonSets";

const GEN = Generations.get(9);
const VGC_LEVEL = 50; // VGC always battles at Level 50, regardless of in-game level

export interface LeadDamageCheck {
  attacker: string;
  defender: string;
  move: string;
  description: string; // full readable line from @smogon/calc, e.g. "252 Atk Life Orb Garchomp Earthquake vs. ... 79.8 - 94.1% -- guaranteed 2HKO"
}

// We don't have real EV/nature data for every curated species yet — this is a
// generic offense-leaning spread assumption (whichever attacking stat is
// higher gets full investment), NOT the mon's actual real-world spread.
function assumedSpread(mon: CoverageMon) {
  const isSpecial = (mon.stats?.spAttack ?? 0) >= (mon.stats?.attack ?? 0);
  return isSpecial
    ? { nature: "Modest" as const, evs: { hp: 4, spa: 252, spe: 252 } }
    : { nature: "Adamant" as const, evs: { hp: 4, atk: 252, spe: 252 } };
}

function buildPokemon(mon: CoverageMon, commonSet: CommonSetEntry | null) {
  const showdownName = commonSet?.megaForm?.formShowdownName ?? commonSet?.showdownName ?? mon.name;
  const ability = mon.abilityName ?? commonSet?.megaForm?.formAbility ?? commonSet?.likelyAbility;
  const item = mon.itemName ? formatItemForCalc(mon.itemName) : commonSet?.topItem;
  const { nature, evs } = assumedSpread(mon);

  return new Pokemon(GEN, showdownName, { level: VGC_LEVEL, ability, item, nature, evs });
}

/**
 * Checks `attacker`'s top known common move against `defender`.
 * Returns null if we don't have curated move data for the attacker (we'd
 * just be guessing at what move to check) or if @smogon/calc's dex doesn't
 * recognize the species/move — fails soft rather than showing a wrong number.
 */
export function checkLeadDamage(attacker: CoverageMon, defender: CoverageMon): LeadDamageCheck | null {
  const attackerSet = getCommonSet(attacker.name);
  const userMove = pickCheckableMove(attacker.moves);
  const moveName = userMove ? formatMoveForCalc(userMove) : attackerSet?.commonMoves[0];
  if (!moveName) return null; // no real move chosen and no curated fallback — nothing to check

  try {
    const attackerPoke = buildPokemon(attacker, attackerSet);
    const defenderPoke = buildPokemon(defender, getCommonSet(defender.name));
    const move = new Move(GEN, moveName);
    const result = calculate(GEN, attackerPoke, defenderPoke, move);

    return { attacker: attacker.name, defender: defender.name, move: moveName, description: result.desc() };
  } catch {
    return null;
  }
}

// Common non-damaging VGC moves — skipped when picking which of the user's
// actual moves to run through the damage calc, so we don't end up "checking"
// Protect/Tailwind/etc. We don't have real move-category data, so this is a
// hand-maintained exclude-list, not a guarantee — fails soft either way.
const SUPPORT_MOVE_SLUGS = new Set([
  "protect", "detect", "wide-guard", "quick-guard", "follow-me", "rage-powder",
  "tailwind", "trick-room", "helping-hand", "light-screen", "reflect", "aurora-veil",
]);

function formatMoveForCalc(slug: string): string {
  return slug.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

function formatItemForCalc(slug: string): string {
  return slug.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

function pickCheckableMove(moves: string[] | undefined): string | null {
  if (!moves) return null;
  return moves.find((m) => !SUPPORT_MOVE_SLUGS.has(m)) ?? null;
}
