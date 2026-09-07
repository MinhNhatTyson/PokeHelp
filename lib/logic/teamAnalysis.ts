import { PokemonTypeName, POKEMON_TYPES, TeamSlot, TeamDefenseReport, TeamOffenseReport } from "@/lib/types";
import { getSingleMultiplier } from "@/lib/logic/effectiveness";

function teamMembers(slots: TeamSlot[]) {
  return slots.filter((s) => s.pokemon).map((s) => s.pokemon!);
}

export function getTeamDefenseReport(slots: TeamSlot[]): TeamDefenseReport {
  const report: TeamDefenseReport = { quad: [], double: [], neutral: [], half: [], quarter: [], immune: [] };
  const members = teamMembers(slots);

  for (const attacker of POKEMON_TYPES) {
    const buckets = { quad: [] as string[], double: [] as string[], neutral: [] as string[], half: [] as string[], quarter: [] as string[], immune: [] as string[] };

    for (const mon of members) {
      const m1 = getSingleMultiplier(attacker, mon.types[0]);
      const m2 = mon.types[1] ? getSingleMultiplier(attacker, mon.types[1]) : 1;
      const combined = m1 * m2;
      if (combined === 4) buckets.quad.push(mon.name);
      else if (combined === 2) buckets.double.push(mon.name);
      else if (combined === 1) buckets.neutral.push(mon.name);
      else if (combined === 0.5) buckets.half.push(mon.name);
      else if (combined === 0.25) buckets.quarter.push(mon.name);
      else buckets.immune.push(mon.name);
    }

    (Object.keys(buckets) as (keyof typeof buckets)[]).forEach((key) => {
      if (buckets[key].length > 0) report[key].push({ type: attacker, count: buckets[key].length, members: buckets[key] });
    });
  }

  (Object.keys(report) as (keyof TeamDefenseReport)[]).forEach((key) => report[key].sort((a, b) => b.count - a.count));
  return report;
}

export function getTeamOffenseReport(slots: TeamSlot[]): TeamOffenseReport {
  const members = teamMembers(slots);
  const superEffectiveAgainst: PokemonTypeName[] = [];
  const neutralOnly: PokemonTypeName[] = [];
  const resistedByAll: PokemonTypeName[] = [];
  const noEffectFromAll: PokemonTypeName[] = [];

  for (const target of POKEMON_TYPES) {
    let best = 0;
    for (const mon of members) {
      for (const attackType of mon.types) {
        best = Math.max(best, getSingleMultiplier(attackType, target));
      }
    }
    if (best >= 2) superEffectiveAgainst.push(target);
    else if (best === 1) neutralOnly.push(target);
    else if (best === 0) noEffectFromAll.push(target);
    else resistedByAll.push(target);
  }

  return { superEffectiveAgainst, neutralOnly, resistedByAll, noEffectFromAll };
}