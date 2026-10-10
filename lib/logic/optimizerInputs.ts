import type { OpponentSlot, TeamSlot } from "@/lib/types";
import { getActiveMega, getCommonSet } from "@/lib/data/commonSets";
import { statsFromEntries, type CoverageMon } from "@/lib/logic/battleOptimizer";

export function userCoverageOf(slots: TeamSlot[]): CoverageMon[] {
  return slots.map((s) => {
    const mega = s.pokemon ? getActiveMega(s.pokemon.name, s.itemName) : null;
    return {
      name: s.pokemon?.name ?? "",
      types: mega?.formTypes ?? s.pokemon?.types ?? [],
      abilityName: s.abilityName,
      itemName: s.itemName,
      stats: s.pokemon ? statsFromEntries(s.pokemon.stats) : undefined,
      moves: s.moves.filter((m): m is string => m !== null),
      megaActive: !!mega,
      nature: s.nature,
      speedSp: s.speedSp,
      spread: s.spread,
    };
  });
}

export function opponentCoverageOf(slots: OpponentSlot[]): CoverageMon[] {
  return slots.map((s) => {
    const commonSet = s.pokemon ? getCommonSet(s.pokemon.name) : null;
    const effective = s.megaFormDetail ?? s.pokemon;
    const abilityName = s.megaFormDetail ? commonSet?.megaForm?.formAbility ?? null : s.abilityName;
    return {
      name: s.pokemon?.name ?? "",
      types: effective?.types ?? [],
      abilityName,
      itemName: s.itemName,
      stats: effective ? statsFromEntries(effective.stats) : undefined,
      megaActive: !!s.megaFormDetail,
    };
  });
}