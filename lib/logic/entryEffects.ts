import type { BattleSide, FieldState, StageChange, StageState, StageStat } from "@/lib/types";
import { getAbilitySignal } from "@/lib/logic/abilitySignals";

const clamp = (n: number) => Math.max(-6, Math.min(6, n));
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const pretty = (s: string) => s.replace(/-/g, " ");

// Abilities that stop Intimidate completely. Deliberately small, same philosophy as abilitySignals.ts.
const INTIMIDATE_IMMUNE = new Set([
  "clear-body", "hyper-cutter", "inner-focus", "oblivious", "own-tempo", "scrappy", "white-smoke", "full-metal-body",
]);

type FieldSlice = Pick<FieldState, "weather" | "weatherTurnsLeft" | "terrain" | "terrainTurnsLeft">;

export interface EntryInput {
  side: BattleSide;
  name: string;
  ability: string | null;                                   // ability right now (Mega ability if it already Mega'd)
  foes: { name: string; ability: string | null }[];         // opposing active, non-fainted mons
  field: FieldSlice;
  stageOf: (side: BattleSide, name: string, stat: StageStat) => number;
  startOfBattle?: boolean;                                  // weather/terrain only set if none is up yet (first setter holds)
}

export interface EntryOutcome {
  stageChanges: StageChange[];
  field?: Partial<FieldSlice>;
  fieldPrev?: FieldSlice;
  notes: string[];
}

export function computeEntryEffects(i: EntryInput): EntryOutcome {
  const out: EntryOutcome = { stageChanges: [], notes: [] };
  const sig = getAbilitySignal(i.ability);
  const other: BattleSide = i.side === "yours" ? "opponent" : "yours";
  const pending = new Map<string, number>();

  const now = (side: BattleSide, name: string, stat: StageStat) =>
    i.stageOf(side, name, stat) + (pending.get(`${side}:${name}:${stat}`) ?? 0);
  const push = (side: BattleSide, name: string, stat: StageStat, delta: number): boolean => {
    const cur = now(side, name, stat);
    const applied = clamp(cur + delta) - cur;
    if (applied === 0) return false;
    const key = `${side}:${name}:${stat}`;
    pending.set(key, (pending.get(key) ?? 0) + applied);
    out.stageChanges.push({ side, name, stat, delta: applied });
    return true;
  };

  if (sig?.isIntimidate) {
    for (const foe of i.foes) {
      const fa = foe.ability ?? "";
      if (INTIMIDATE_IMMUNE.has(fa)) {
        out.notes.push(`${cap(foe.name)}'s ${pretty(fa)} blocks Intimidate`);
        continue;
      }
      if (fa === "mirror-armor") {
        if (push(i.side, i.name, "atk", -1)) out.notes.push(`${cap(foe.name)}'s Mirror Armor reflected Intimidate onto ${cap(i.name)}`);
        continue;
      }
      if (fa === "contrary" || fa === "guard-dog") {
        if (push(other, foe.name, "atk", 1)) out.notes.push(`${cap(foe.name)}'s ${pretty(fa)} raised its Attack instead`);
        continue;
      }
      if (now(other, foe.name, "atk") <= -6) continue; // can't drop further, so Defiant/Competitive don't trigger either
      push(other, foe.name, "atk", -1);
      out.notes.push(`${cap(i.name)}'s Intimidate lowered ${cap(foe.name)}'s Attack`);
      if (fa === "defiant" && push(other, foe.name, "atk", 2)) out.notes.push(`${cap(foe.name)}'s Defiant raised its Attack by 2`);
      if (fa === "competitive" && push(other, foe.name, "spa", 2)) out.notes.push(`${cap(foe.name)}'s Competitive raised its Sp. Atk by 2`);
    }
  }

  const f = i.field;
  const prev: FieldSlice = { weather: f.weather, weatherTurnsLeft: f.weatherTurnsLeft, terrain: f.terrain, terrainTurnsLeft: f.terrainTurnsLeft };
  if (sig?.weatherSets && f.weather !== sig.weatherSets && (!i.startOfBattle || f.weather === "none")) {
    out.fieldPrev = prev;
    out.field = { ...out.field, weather: sig.weatherSets, weatherTurnsLeft: 5 };
    out.notes.push(`${cap(i.name)}'s ${pretty(i.ability ?? "")} set ${sig.weatherSets}`);
  }
  if (sig?.terrainSets && f.terrain !== sig.terrainSets && (!i.startOfBattle || f.terrain === "none")) {
    out.fieldPrev = prev;
    out.field = { ...out.field, terrain: sig.terrainSets, terrainTurnsLeft: 5 };
    out.notes.push(`${cap(i.name)}'s ${pretty(i.ability ?? "")} set ${sig.terrainSets} terrain`);
  }

  return out;
}

/** sign = -1 reverses the changes (used by undo). Results are clamped to -6..+6. */
export function applyStageDeltas(stages: StageState, changes: StageChange[], sign: 1 | -1 = 1): StageState {
  let next = stages;
  for (const c of changes) {
    const cur = next[c.side][c.name] ?? {};
    next = { ...next, [c.side]: { ...next[c.side], [c.name]: { ...cur, [c.stat]: clamp((cur[c.stat] ?? 0) + sign * c.delta) } } };
  }
  return next;
}