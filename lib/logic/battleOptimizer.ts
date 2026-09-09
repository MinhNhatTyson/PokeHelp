import { PokemonTypeName, POKEMON_TYPES, EffectivenessMultiplier } from "@/lib/types";
import { getSingleMultiplier } from "@/lib/logic/effectiveness";
import { getAbilitySignal } from "@/lib/logic/abilitySignals";
import { getCommonSet } from "@/lib/data/commonSets";
import { checkLeadDamage, LeadDamageCheck } from "@/lib/logic/damageCheck";

interface LeadSignals {
  hasFakeOut: boolean;
  hasRedirection: boolean;
  isIntimidate: boolean;
  isWeatherSetter: boolean;
  isTrickRoomSetter: boolean;
  isTailwindSetter: boolean;
}

function getLeadSignals(mon: CoverageMon): LeadSignals {
  const moves = getCommonSet(mon.name)?.commonMoves.map((m) => m.toLowerCase()) ?? [];
  const abilitySignal = getAbilitySignal(mon.abilityName);
  return {
    hasFakeOut: moves.includes("fake out"),
    hasRedirection: moves.includes("rage powder") || moves.includes("follow me"),
    isIntimidate: !!abilitySignal?.isIntimidate,
    isWeatherSetter: !!abilitySignal?.weatherSets,
    isTrickRoomSetter: moves.includes("trick room"),
    isTailwindSetter: moves.includes("tailwind"),
  };
}

function leadScore(mon: CoverageMon): number {
  const s = getLeadSignals(mon);
  let score = 0;
  if (s.hasFakeOut) score += 3;
  if (s.isIntimidate) score += 2;
  if (s.hasRedirection) score += 2;
  if (s.isWeatherSetter) score += 2;
  if (s.isTailwindSetter) score += 1;
  if (s.isTrickRoomSetter) score += 1;
  score += (mon.stats?.speed ?? 0) / 100; // mild tiebreak, not a real speed calc
  return score;
}

function pickLead(members: CoverageMon[]): { lead: CoverageMon[]; backLine: CoverageMon[] } {
  const sorted = [...members].sort((a, b) => leadScore(b) - leadScore(a));
  return { lead: sorted.slice(0, 2), backLine: sorted.slice(2) };
}

function buildStrategyNotes(
  lead: CoverageMon[],
  backLine: CoverageMon[],
  breakdown: ComboScoreBreakdown
): string[] {
  const notes: string[] = [];
  const leadNames = lead.map((m) => m.name).join(" + ");

  const leadTags = lead.flatMap((m) => {
    const s = getLeadSignals(m);
    const tags: string[] = [];
    if (s.hasFakeOut) tags.push(`${m.name}'s Fake Out`);
    if (s.isIntimidate) tags.push(`${m.name}'s Intimidate`);
    if (s.hasRedirection) tags.push(`${m.name}'s redirection`);
    if (s.isWeatherSetter) tags.push(`${m.name}'s weather`);
    if (s.isTailwindSetter) tags.push(`${m.name}'s Tailwind`);
    if (s.isTrickRoomSetter) tags.push(`${m.name}'s Trick Room`);
    return tags;
  });

  notes.push(
    leadTags.length > 0
      ? `Lead with ${leadNames} to open with ${leadTags.join(", ")}.`
      : `Lead with ${leadNames} — no standout lead tools in the curated data for these two, so this is mostly a speed/matchup guess.`
  );

  if (breakdown.sharedWeaknesses.length > 0) {
    notes.push(`Watch out: ${breakdown.sharedWeaknesses.join("/")} threats hit more than one member of this lineup at once.`);
  }

  notes.push(
    breakdown.offensiveGaps.length > 0
      ? `This lineup struggles to dent ${breakdown.offensiveGaps.join(", ")} — keep ${backLine.map((m) => m.name).join(" and ")} in the back ready to pivot in on a better matchup.`
      : `Every opposing Pokémon can be hit super-effectively by at least one member here.`
  );

  if (breakdown.abilityScore > 0) {
    notes.push(`Ability synergy (Intimidate/weather) is actively contributing to this combo's score.`);
  }

  return notes;
}

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
  indices: [number, number, number, number];
  members: CoverageMon[];
  breakdown: ComboScoreBreakdown;
  recommendedLead: CoverageMon[];
  backLine: CoverageMon[];
  strategyNotes: string[];
  leadDamageChecks: LeadDamageCheck[];
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

  const { lead: opponentLead } = pickLead(opponentTeam);

  const results = fourOfSixCombinations().map((indices) => {
    const members = indices.map((i) => userTeam[i]);
    const breakdown = scoreCombo(members, opponentTeam);
    const { lead, backLine } = pickLead(members);
    const strategyNotes = buildStrategyNotes(lead, backLine, breakdown);

    // Paired matchup checks (lead[0] vs opponentLead[0], lead[1] vs opponentLead[1])
    // in both directions — a simplification, not a guarantee of real targeting.
    const leadDamageChecks: LeadDamageCheck[] = [];
    for (let i = 0; i < Math.min(lead.length, opponentLead.length); i++) {
      const out = checkLeadDamage(lead[i], opponentLead[i]);
      if (out) leadDamageChecks.push(out);
      const inc = checkLeadDamage(opponentLead[i], lead[i]);
      if (inc) leadDamageChecks.push(inc);
    }

    return { indices, members, breakdown, recommendedLead: lead, backLine, strategyNotes, leadDamageChecks };
  });

  return results.sort((a, b) => b.breakdown.total - a.breakdown.total);
}