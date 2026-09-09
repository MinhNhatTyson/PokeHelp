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
  const { nature, evs } = assumedSpread(mon);

  return new Pokemon(GEN, showdownName, { level: VGC_LEVEL, ability, item: commonSet?.topItem, nature, evs });
}

/**
 * Checks `attacker`'s top known common move against `defender`.
 * Returns null if we don't have curated move data for the attacker (we'd
 * just be guessing at what move to check) or if @smogon/calc's dex doesn't
 * recognize the species/move — fails soft rather than showing a wrong number.
 */
export function checkLeadDamage(attacker: CoverageMon, defender: CoverageMon): LeadDamageCheck | null {
  const attackerSet = getCommonSet(attacker.name);
  if (!attackerSet || attackerSet.commonMoves.length === 0) return null;

  try {
    const attackerPoke = buildPokemon(attacker, attackerSet);
    const defenderPoke = buildPokemon(defender, getCommonSet(defender.name));
    const move = new Move(GEN, attackerSet.commonMoves[0]);
    const result = calculate(GEN, attackerPoke, defenderPoke, move);

    return {
      attacker: attacker.name,
      defender: defender.name,
      move: attackerSet.commonMoves[0],
      description: result.desc(),
    };
  } catch {
    return null;
  }
}