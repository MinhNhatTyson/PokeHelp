import type { SpSpread, TeamSlot } from "@/lib/types";
import { evToSp, MAX_SP_PER_STAT } from "@/lib/logic/statCalc";

type LegacySlot = Partial<TeamSlot> & { speedEv?: number };

export const emptySpread = (): SpSpread => ({ hp: 0, atk: 0, def: 0, spa: 0, spd: 0 });

/** Brings any stored spread (missing, partial or corrupt) to a valid SpSpread. */
export function sanitizeSpread(raw: unknown): SpSpread {
  const r = (raw ?? {}) as Record<string, unknown>;
  const n = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? Math.max(0, Math.min(MAX_SP_PER_STAT, Math.round(v))) : 0);
  return { hp: n(r.hp), atk: n(r.atk), def: n(r.def), spa: n(r.spa), spd: n(r.spd) };
}
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
    spread: sanitizeSpread(s.spread),
  };
}