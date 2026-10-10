import type { PokemonTypeName } from "@/lib/types";
import { getMoveQuickInfo } from "@/lib/logic/moveFlags";

const MIN_COVERAGE_POWER = 50; // skips Fake Out / Aqua Jet-style chip; 0 = variable power, kept
const NORMAL_CONVERTERS: Record<string, PokemonTypeName> = {
  pixilate: "fairy", aerilate: "flying", refrigerate: "ice", galvanize: "electric",
};

/** Types this mon can really hit with: its chosen damaging moves, or its own types (STAB) if none are known. */
export function attackTypesOf(mon: { types: PokemonTypeName[]; moves?: string[]; ability?: string | null }): PokemonTypeName[] {
  if (!mon.moves?.length) return mon.types;
  const found = new Set<PokemonTypeName>();
  for (const slug of mon.moves) {
    const q = getMoveQuickInfo(slug);
    if (!q?.type || q.category === "status") continue;
    if (q.basePower > 0 && q.basePower < MIN_COVERAGE_POWER) continue;
    const conv = mon.ability ? NORMAL_CONVERTERS[mon.ability] : undefined;
    found.add(q.type === "normal" && conv ? conv : q.type);
  }
  return found.size > 0 ? [...found] : mon.types;
}