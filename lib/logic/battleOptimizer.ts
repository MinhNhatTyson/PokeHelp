import { PokemonTypeName, POKEMON_TYPES, EffectivenessMultiplier } from "@/lib/types";
import { getSingleMultiplier } from "@/lib/logic/effectiveness";
import { getAbilitySignal } from "@/lib/logic/abilitySignals";

export interface CoverageMon {
  name: string;
  types: PokemonTypeName[];
  abilityName: string | null;
  stats?: { hp: number; attack: number; defense: number; spAttack: number; spDefense: number; speed: number };
}

export function statsFromEntries(entries: { name: string; baseStat: number }[]) {
  const get = (n: string) => entries.find((e) => e.name === n)?.baseStat ?? 0;
  return {
    hp: get("hp"), attack: get("attack"), defense: get("defense"),
    spAttack: get("special-attack"), spDefense: get("special-defense"), speed: get("speed"),
  };
}

const BASELINE_ATTACKING_STAT = 80;

function bestAttackingStat(mon: CoverageMon): number {
  if (!mon.stats) return BASELINE_ATTACKING_STAT; // unknown stats -> assume average threat
  return Math.max(mon.stats.attack, mon.stats.spAttack);
}

export interface ComboScoreBreakdown {
  defenseScore: number;
  offenseScore: number;
  abilityScore: number;
  speedScore: number;
  total: number;
  /** Types where 2+ combo members are weak, weighted by how many opponents carry that type */
  sharedWeaknesses: PokemonTypeName[];
  /** Opponent mons no combo member can hit super-effectively */
  offensiveGaps: string[];
}

export interface ComboResult {
  indices: [number, number, number, number]; // indices into the original 6-mon user team
  members: CoverageMon[];
  breakdown: ComboScoreBreakdown;
}

// All C(6,4) = 15 ways to choose 4 of 6 team slots.
function fourOfSixCombinations(): [number, number, number, number][] {
  const combos: [number, number, number, number][] = [];
  for (let a = 0; a < 6; a++)
    for (let b = a + 1; b < 6; b++)
      for (let c = b + 1; c < 6; c++)
        for (let d = c + 1; d < 6; d++)
          combos.push([a, b, c, d]);
  return combos;
}

function defenseMultiplier(attacker: PokemonTypeName, defender: CoverageMon): EffectivenessMultiplier {
  const signal = getAbilitySignal(defender.abilityName);
  if (signal?.immunity === attacker) return 0;
  const m1 = getSingleMultiplier(attacker, defender.types[0]);
  const m2 = defender.types[1] ? getSingleMultiplier(attacker, defender.types[1]) : 1;
  return (m1 * m2) as EffectivenessMultiplier;
}

function bestOffenseMultiplier(attacker: CoverageMon, defender: CoverageMon): EffectivenessMultiplier {
  const defenderSignal = getAbilitySignal(defender.abilityName);
  let best: EffectivenessMultiplier = 0;
  for (const atkType of attacker.types) {
    const m = defenseMultiplier(atkType, { ...defender, abilityName: defenderSignal ? defender.abilityName : null });
    if (m > best) best = m;
  }
  return best;
}

function scoreCombo(members: CoverageMon[], opponents: CoverageMon[]): ComboScoreBreakdown {
  // --- Defense: how exposed is this 4-mon combo to the opponent's likely STAB attacks? ---
  // Weight each opposing attacking type by how many opponents carry it (a type 3 of
  // their 6 share is a bigger threat than one only a single mon has).
  const opponentTypeWeight = new Map<PokemonTypeName, number>();
  for (const opp of opponents) {
    for (const t of opp.types) {
      opponentTypeWeight.set(t, (opponentTypeWeight.get(t) ?? 0) + 1);
    }
  }

  let defenseScore = 0;
  const weaknessWeight = new Map<PokemonTypeName, number>();
  for (const [attackType, weight] of opponentTypeWeight) {
    const attackersOfType = opponents.filter((o) => o.types.includes(attackType));
    const avgPower = attackersOfType.reduce((sum, o) => sum + bestAttackingStat(o), 0) / attackersOfType.length;
    const powerFactor = avgPower / BASELINE_ATTACKING_STAT; // >1 = hits harder than average

    let membersWeak = 0;
    for (const member of members) {
      const m = defenseMultiplier(attackType, member);
      if (m >= 2) membersWeak += 1;
      else if (m === 0) defenseScore += 1 * weight;
      else if (m <= 0.5) defenseScore += 0.5 * weight;
    }
    if (membersWeak > 0) {
      defenseScore -= membersWeak * weight * powerFactor;
      weaknessWeight.set(attackType, membersWeak * weight);
    }
  }
  const sharedWeaknesses = POKEMON_TYPES.filter((t) => (weaknessWeight.get(t) ?? 0) >= 2);

  // --- Offense: does this combo threaten each of the opponent's 6? ---
  let offenseScore = 0;
  const offensiveGaps: string[] = [];
  for (const opp of opponents) {
    const best = Math.max(...members.map((m) => bestOffenseMultiplier(m, opp)));
    if (best >= 2) offenseScore += 2;
    else if (best === 1) offenseScore += 0; // neutral, no bonus no penalty
    else offenseScore -= 1; // resisted/immune by every member — a real gap
    if (best <= 0.5) offensiveGaps.push(opp.name);
  }

  // --- Ability signals: Intimidate presence, weather-setter/beneficiary synergy ---
  let abilityScore = 0;
  const signals = members.map((m) => getAbilitySignal(m.abilityName));
  if (signals.some((s) => s?.isIntimidate)) abilityScore += 2;
  const weatherSet = signals.find((s) => s?.weatherSets)?.weatherSets;
  if (weatherSet) {
    const beneficiaries = signals.filter((s) => s?.weatherBoostedBy === weatherSet).length;
    abilityScore += beneficiaries * 2; // weather + payoff on the same 4 is a real combo
  }

    // --- Speed: rough proxy for who's more likely to act first as a team ---
  let speedScore = 0;
  const yourFastest = Math.max(0, ...members.map((m) => m.stats?.speed ?? 0));
  const oppFastest = Math.max(0, ...opponents.map((o) => o.stats?.speed ?? 0));
  if (yourFastest > oppFastest) speedScore += 1;
  else if (yourFastest < oppFastest) speedScore -= 1;

  return {
    defenseScore, offenseScore, abilityScore, speedScore,
    total: defenseScore + offenseScore + abilityScore + speedScore,
    sharedWeaknesses, offensiveGaps,
  };
}

export function rankBringFourCombos(userTeam: CoverageMon[], opponentTeam: CoverageMon[]): ComboResult[] {
  if (userTeam.length !== 6) throw new Error("rankBringFourCombos expects exactly 6 user team members");

  const results = fourOfSixCombinations().map((indices) => {
    const members = indices.map((i) => userTeam[i]);
    return { indices, members, breakdown: scoreCombo(members, opponentTeam) };
  });

  return results.sort((a, b) => b.breakdown.total - a.breakdown.total);
}