import type { TeamSlot } from "@/lib/types";
import { evToSp } from "@/lib/logic/statCalc";

type LegacySlot = Partial<TeamSlot> & { speedEv?: number };

/** Brings any older persisted team slot up to the current TeamSlot shape. */
export function normalizeTeamSlot(raw: unknown): TeamSlot {
  const s = (raw ?? {}) as LegacySlot;
  return {
    pokemon: s.pokemon ? { ...s.pokemon, moves: s.pokemon.moves ?? [] } : null,
    itemName: s.itemName ?? null,
    abilityName: s.abilityName ?? null,
    roleNotes: s.roleNotes ?? null,
    moves: Array.isArray(s.moves) ? [0, 1, 2, 3].map((i) => s.moves![i] ?? null) : [null, null, null, null],
    nature: s.nature ?? null,
    speedSp: typeof s.speedSp === "number" ? s.speedSp : evToSp(s.speedEv ?? 0),
  };
}