import { PokemonTypeName, POKEMON_TYPES, EffectivenessMultiplier } from "@/lib/types";
import { getSingleMultiplier } from "@/lib/logic/effectiveness";
import { getAbilitySignal } from "@/lib/logic/abilitySignals";
import { getCommonSet } from "@/lib/data/commonSets";
import { checkLeadDamage, LeadDamageCheck } from "@/lib/logic/damageCheck";
import { getItemSignal } from "@/lib/logic/itemSignals";

interface LeadSignals {
  hasFakeOut: boolean;
  hasRedirection: boolean;
  isIntimidate: boolean;
  isWeatherSetter: boolean;
  isTrickRoomSetter: boolean;
  isTailwindSetter: boolean;
}

function effectiveSpeed(mon: CoverageMon): number {
  const item = getItemSignal(mon.itemName);
  return (mon.stats?.speed ?? 0) * (item?.speedMultiplier ?? 1);
}

function getLeadSignals(mon: CoverageMon): LeadSignals {
  const actualMoves = mon.moves?.map((m) => m.replace(/-/g, " ").toLowerCase());
  const moves = actualMoves && actualMoves.length > 0
    ? actualMoves
    : getCommonSet(mon.name)?.commonMoves.map((m) => m.toLowerCase()) ?? [];
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
  score += effectiveSpeed(mon) / 100; // mild tiebreak, now item-aware (Scarf counts as faster)
  return score;
}

function pickLead(
  members: CoverageMon[],
  opposingLeads: CoverageMon[] = []
): { lead: CoverageMon[]; backLine: CoverageMon[] } {
  let bestPair: CoverageMon[] = members.slice(0, 2);
  let bestTotal = -Infinity;

  for (let i = 0; i < members.length; i++) {
    for (let j = i + 1; j < members.length; j++) {
      const pair = [members[i], members[j]];
      const total = leadScore(pair[0]) + leadScore(pair[1]) + leadMatchupScore(pair, opposingLeads);
      if (total > bestTotal) {
        bestTotal = total;
        bestPair = pair;
      }
    }
  }

  const backLine = members.filter((m) => !bestPair.includes(m));
  return { lead: bestPair, backLine };
}

function buildStrategyNotes(
  lead: CoverageMon[],
  backLine: CoverageMon[],
  breakdown: ComboScoreBreakdown,
  opponents: CoverageMon[]
): string[] {
  const notes: string[] = [];
  const leadNames = lead.map((m) => m.name).join(" + ");

  const leadTags = lead.flatMap((m) => {
    const s = getLeadSignals(m);
    const itemSignal = getItemSignal(m.itemName);
    const tags: string[] = [];
    if (s.hasFakeOut) tags.push(`${m.name}'s Fake Out`);
    if (s.isIntimidate) tags.push(`${m.name}'s Intimidate`);
    if (s.hasRedirection) tags.push(`${m.name}'s redirection`);
    if (s.isWeatherSetter) tags.push(`${m.name}'s weather`);
    if (s.isTailwindSetter) tags.push(`${m.name}'s Tailwind`);
    if (s.isTrickRoomSetter) tags.push(`${m.name}'s Trick Room`);
    if (itemSignal?.speedMultiplier) tags.push(`${m.name}'s Choice Scarf speed`);
    if (itemSignal?.guaranteesSurvival) tags.push(`${m.name}'s Focus Sash`);
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

  notes.push(...detectWeatherContests([...lead, ...backLine], opponents));

  if (breakdown.abilityScore > 0) {
    notes.push(`Ability synergy (Intimidate/weather) is actively contributing to this combo's score.`);
  }

  if (breakdown.itemScore > 0) {
    notes.push(`Held-item tools (Scarf speed control, Sash survivability, or a safe pivot) are actively contributing to this combo's score.`);
  }

  return notes;
}

export interface CoverageMon {
  name: string;
  types: PokemonTypeName[];
  abilityName: string | null;
  itemName?: string | null;
  stats?: { hp: number; attack: number; defense: number; spAttack: number; spDefense: number; speed: number };
  moves?: string[];
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
  itemScore: number;
  speedScore: number;
  total: number;
  sharedWeaknesses: PokemonTypeName[];
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

function itemWeaknessMitigation(mon: CoverageMon): number {
  const signal = getItemSignal(mon.itemName);
  if (!signal) return 1;
  if (signal.guaranteesSurvival) return 0.5; // Focus Sash softens OHKO risk, doesn't remove the pressure
  if (signal.isWeaknessPolicy) return 0.6;   // real risk, but the punish-back potential is real too
  if (signal.isBulkBoost) return 0.85;       // Assault Vest-style bulk, modest softening
  return 1;
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
    let weakPenalty = 0;
    for (const member of members) {
      const m = defenseMultiplier(attackType, member);
      if (m >= 2) {
        membersWeak += 1;
        weakPenalty += weight * powerFactor * itemWeaknessMitigation(member);
      } else if (m === 0) defenseScore += 1 * weight;
      else if (m <= 0.5) defenseScore += 0.5 * weight;
    }
    if (membersWeak > 0) {
      defenseScore -= weakPenalty;
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

  // --- Item signals: Scarf speed control, Sash survivability, safe pivot tools ---
  let itemScore = 0;
  const itemSignals = members.map((m) => getItemSignal(m.itemName));
  if (itemSignals.some((s) => s?.speedMultiplier)) itemScore += 1;
  if (itemSignals.some((s) => s?.guaranteesSurvival)) itemScore += 1;
  if (itemSignals.some((s) => s?.isEjectTool)) itemScore += 0.5;

  // --- Speed: rough proxy for who's more likely to act first as a team ---
  let speedScore = 0;
  const yourFastest = Math.max(0, ...members.map(effectiveSpeed));
  const oppFastest = Math.max(0, ...opponents.map(effectiveSpeed));
  if (yourFastest > oppFastest) speedScore += 1;
  else if (yourFastest < oppFastest) speedScore -= 1;

  return {
    defenseScore, offenseScore, abilityScore, itemScore, speedScore,
    total: defenseScore + offenseScore + abilityScore + itemScore + speedScore,
    sharedWeaknesses, offensiveGaps,
  };
}

export function rankBringFourCombos(userTeam: CoverageMon[], opponentTeam: CoverageMon[]): ComboResult[] {
  if (userTeam.length !== 6) throw new Error("rankBringFourCombos expects exactly 6 user team members");

  const { lead: opponentLead } = pickLead(opponentTeam); // signal-only guess — opponent side of a simultaneous lead-pick has no matchup target of its own

  const results = fourOfSixCombinations().map((indices) => {
    const members = indices.map((i) => userTeam[i]);
    const breakdown = scoreCombo(members, opponentTeam);
    const { lead, backLine } = pickLead(members, opponentLead); // now matchup-aware
    const strategyNotes = buildStrategyNotes(lead, backLine, breakdown, opponentTeam);

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

function detectWeatherContests(members: CoverageMon[], opponents: CoverageMon[]): string[] {
  const notes: string[] = [];

  for (const mon of members) {
    const ownWeather = getAbilitySignal(mon.abilityName)?.weatherSets;
    if (!ownWeather) continue;

    const opposingSetter = opponents.find((o) => {
      const oppWeather = getAbilitySignal(o.abilityName)?.weatherSets;
      return oppWeather && oppWeather !== ownWeather;
    });
    if (!opposingSetter) continue;

    const commonSet = getCommonSet(mon.name);
    const requiresMegaForWeather = commonSet?.megaForm && commonSet.likelyAbility !== commonSet.megaForm.formAbility;

    notes.push(
      requiresMegaForWeather
        ? `${mon.name}'s ${ownWeather} will likely be contested by ${opposingSetter.name} — since the Mega is what grants ${ownWeather} here, you may still need to Mega early to get any weather value, but expect it to get overwritten and plan a re-answer.`
        : `${mon.name}'s ${ownWeather} will likely be contested by ${opposingSetter.name} — consider holding the Mega Evolution as a reset rather than leading with it, so you can re-flip the weather back after they set theirs.`
    );
  }

  return notes;
}

// Score how safe/threatening a candidate 2-mon lead pair is specifically
// against the opponent's projected leads. This closes the actual gap that
// let bad leads through: pickLead used to rank purely on internal signals
// (Fake Out, Intimidate, weather, speed) with zero awareness of who it was
// about to face — a Fake Out lead into two bulky walls that shrug it off
// scored identically to one into two frail sweepers it can 2HKO.
function leadMatchupScore(pair: CoverageMon[], opposingLeads: CoverageMon[]): number {
  if (opposingLeads.length === 0) return 0; // no opponent context yet (guessing the opponent's own lead)

  let score = 0;
  for (const mon of pair) {
    const bestVsOpp = Math.max(0, ...opposingLeads.map((opp) => bestOffenseMultiplier(mon, opp)));
    if (bestVsOpp >= 2) score += 2;
    else if (bestVsOpp === 0) score -= 1.5; // walled outright by both projected leads

    for (const opp of opposingLeads) {
      const incoming = Math.max(...opp.types.map((t) => defenseMultiplier(t, mon)));
      if (incoming >= 4) score -= 3;
      else if (incoming >= 2) score -= 1.5 * itemWeaknessMitigation(mon);
    }
  }
  return score;
}