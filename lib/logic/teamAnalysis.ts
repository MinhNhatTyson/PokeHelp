import { PokemonTypeName, POKEMON_TYPES, TeamSlot, TeamOffenseReport, TeamDefenseMatrixRow, EffectivenessMultiplier, TeamDefenseMatrix } from "@/lib/types";
import { getSingleMultiplier } from "@/lib/logic/effectiveness";

function teamMembers(slots: TeamSlot[]) {
  return slots.filter((s) => s.pokemon).map((s) => s.pokemon!);
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

export function getTeamDefenseMatrix(slots: TeamSlot[]): TeamDefenseMatrix {
  const members = teamMembers(slots);
  const weakCounts = {} as Record<PokemonTypeName, number>;
  POKEMON_TYPES.forEach((t) => (weakCounts[t] = 0));
    
  const rows: TeamDefenseMatrixRow[] = members.map((mon) => {
    const cells = {} as Record<PokemonTypeName, EffectivenessMultiplier>;
    for (const attacker of POKEMON_TYPES) {
      const m1 = getSingleMultiplier(attacker, mon.types[0]);
      const m2 = mon.types[1] ? getSingleMultiplier(attacker, mon.types[1]) : 1;
      const combined = (m1 * m2) as EffectivenessMultiplier;
      cells[attacker] = combined;
      if (combined >= 2) weakCounts[attacker] += 1;
    }
    return { name: mon.name, types: mon.types, cells };
  });

  return { rows, weakCounts };
}