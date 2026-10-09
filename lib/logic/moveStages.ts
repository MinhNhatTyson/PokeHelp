import type { BattleSide, StageChange, StageStat } from "@/lib/types";

export type StageMap = Partial<Record<StageStat, number>>;
export interface MoveStageEffect { self?: StageMap; target?: StageMap }

// Deliberately curated, same philosophy as abilitySignals.ts: only effects that ALWAYS happen when the move lands
// (setup moves, guaranteed self-drops, 100% secondary drops, debuff moves). Chance-based side effects
// (Moonblast's 30% Sp. Atk drop, Psychic's 10%...) are left to the manual Stat stages panel.
export const MOVE_STAGE_EFFECTS: Record<string, MoveStageEffect> = {
  // --- setup (user) ---
  "swords-dance": { self: { atk: 2 } },
  "nasty-plot": { self: { spa: 2 } },
  "calm-mind": { self: { spa: 1, spd: 1 } },
  "dragon-dance": { self: { atk: 1, spe: 1 } },
  "bulk-up": { self: { atk: 1, def: 1 } },
  "quiver-dance": { self: { spa: 1, spd: 1, spe: 1 } },
  agility: { self: { spe: 2 } },
  "rock-polish": { self: { spe: 2 } },
  autotomize: { self: { spe: 2 } },
  "iron-defense": { self: { def: 2 } },
  barrier: { self: { def: 2 } },
  "acid-armor": { self: { def: 2 } },
  amnesia: { self: { spd: 2 } },
  "cosmic-power": { self: { def: 1, spd: 1 } },
  "defend-order": { self: { def: 1, spd: 1 } },
  "shell-smash": { self: { atk: 2, spa: 2, spe: 2, def: -1, spd: -1 } },
  "work-up": { self: { atk: 1, spa: 1 } },
  coil: { self: { atk: 1, def: 1 } },
  "hone-claws": { self: { atk: 1 } },
  "tail-glow": { self: { spa: 3 } },
  "shift-gear": { self: { atk: 1, spe: 2 } },
  "victory-dance": { self: { atk: 1, def: 1, spe: 1 } },
  "tidy-up": { self: { atk: 1, spe: 1 } },

  // --- damaging moves: guaranteed self changes ---
  "close-combat": { self: { def: -1, spd: -1 } },
  superpower: { self: { atk: -1, def: -1 } },
  "draco-meteor": { self: { spa: -2 } },
  overheat: { self: { spa: -2 } },
  "leaf-storm": { self: { spa: -2 } },
  "fleur-cannon": { self: { spa: -2 } },
  "psycho-boost": { self: { spa: -2 } },
  "make-it-rain": { self: { spa: -1 } },
  "hammer-arm": { self: { spe: -1 } },
  "v-create": { self: { def: -1, spd: -1, spe: -1 } },
  "armor-cannon": { self: { def: -1, spd: -1 } },
  "dragon-ascent": { self: { def: -1, spd: -1 } },
  "headlong-rush": { self: { def: -1, spd: -1 } },
  "clanging-scales": { self: { def: -1 } },
  "spin-out": { self: { spe: -2 } },
  "scale-shot": { self: { spe: 1, def: -1 } },
  "power-up-punch": { self: { atk: 1 } },
  "flame-charge": { self: { spe: 1 } },
  trailblaze: { self: { spe: 1 } },
  "rapid-spin": { self: { spe: 1 } },
  "aqua-step": { self: { spe: 1 } },
  "torch-song": { self: { spa: 1 } },

  // --- damaging moves: guaranteed drops on every target hit ---
  "icy-wind": { target: { spe: -1 } },
  electroweb: { target: { spe: -1 } },
  bulldoze: { target: { spe: -1 } },
  "rock-tomb": { target: { spe: -1 } },
  "low-sweep": { target: { spe: -1 } },
  "mud-shot": { target: { spe: -1 } },
  pounce: { target: { spe: -1 } },
  snarl: { target: { spa: -1 } },
  "struggle-bug": { target: { spa: -1 } },
  "spirit-break": { target: { spa: -1 } },
  "skitter-smack": { target: { spa: -1 } },
  "mystical-fire": { target: { spa: -1 } },
  "breaking-swipe": { target: { atk: -1 } },
  lunge: { target: { atk: -1 } },
  "trop-kick": { target: { atk: -1 } },
  "apple-acid": { target: { spd: -1 } },
  "acid-spray": { target: { spd: -2 } },
  "lumina-crash": { target: { spd: -2 } },
  "grav-apple": { target: { def: -1 } },
  "thunderous-kick": { target: { def: -1 } },
  "fire-lash": { target: { def: -1 } },

  // --- status moves that lower stats ---
  "toxic-thread": { target: { spe: -1 } },
  "tar-shot": { target: { spe: -1 } },
  "parting-shot": { target: { atk: -1, spa: -1 } },
  "noble-roar": { target: { atk: -1, spa: -1 } },
  tickle: { target: { atk: -1, def: -1 } },
  growl: { target: { atk: -1 } },
  leer: { target: { def: -1 } },
  charm: { target: { atk: -2 } },
  "feather-dance": { target: { atk: -2 } },
  screech: { target: { def: -2 } },
  "fake-tears": { target: { spd: -2 } },
  "metal-sound": { target: { spd: -2 } },
  "scary-face": { target: { spe: -2 } },
  "string-shot": { target: { spe: -2 } },
  "cotton-spore": { target: { spe: -2 } },
  "eerie-impulse": { target: { spa: -2 } },
};

export const getMoveStageEffect = (slug: string): MoveStageEffect | null => MOVE_STAGE_EFFECTS[slug] ?? null;

// ---------------------------------------------------------------------------------------------

const clamp = (n: number) => Math.max(-6, Math.min(6, n));
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const pretty = (s: string) => s.replace(/-/g, " ");
const signed = (n: number) => (n > 0 ? `+${n}` : `${n}`);
const STAT_LABEL: Record<StageStat, string> = { atk: "Attack", def: "Defense", spa: "Sp. Atk", spd: "Sp. Def", spe: "Speed" };

// Same small curated philosophy as entryEffects.ts
const BLOCKS_ALL = new Set(["clear-body", "white-smoke", "full-metal-body"]);
const BLOCKS_STAT: Record<string, StageStat> = { "hyper-cutter": "atk", "big-pecks": "def" };

export interface MoveStageInput {
  attacker: { side: BattleSide; name: string; ability: string | null };
  /** Targets the move actually hit. koed = the hit knocked it out, so target effects are skipped. */
  targets: { side: BattleSide; name: string; ability: string | null; koed: boolean }[];
  effect: MoveStageEffect;
  stageOf: (side: BattleSide, name: string, stat: StageStat) => number;
}
export interface MoveStageOutcome { changes: StageChange[]; notes: string[] }

export function computeMoveStages(i: MoveStageInput): MoveStageOutcome {
  const changes: StageChange[] = [];
  const notes: string[] = [];
  const pending = new Map<string, number>();
  const now = (side: BattleSide, name: string, stat: StageStat) => i.stageOf(side, name, stat) + (pending.get(`${side}:${name}:${stat}`) ?? 0);

  const push = (side: BattleSide, name: string, stat: StageStat, delta: number, why?: string): boolean => {
    const cur = now(side, name, stat);
    const applied = clamp(cur + delta) - cur;
    if (applied === 0) {
      notes.push(`${cap(name)}'s ${STAT_LABEL[stat]} can't go any ${delta > 0 ? "higher" : "lower"}`);
      return false;
    }
    const key = `${side}:${name}:${stat}`;
    pending.set(key, (pending.get(key) ?? 0) + applied);
    changes.push({ side, name, stat, delta: applied });
    notes.push(`${cap(name)}'s ${STAT_LABEL[stat]} ${applied > 0 ? "rose" : "fell"} by ${Math.abs(applied)} (now ${signed(cur + applied)})${why ? `: ${why}` : ""}`);
    return true;
  };

  const a = i.attacker;
  const aa = a.ability ?? "";
  for (const [stat, base] of Object.entries(i.effect.self ?? {}) as [StageStat, number][]) {
    let d = base;
    if (aa === "contrary") d = -d;
    else if (aa === "simple") d *= 2;
    push(a.side, a.name, stat, d, aa === "contrary" ? "Contrary reversed it" : aa === "simple" ? "Simple doubled it" : undefined);
  }

  for (const t of i.targets) {
    if (t.koed) continue;
    const ta = t.ability ?? "";
    const foe = t.side !== a.side;
    let lowered = false;
    for (const [stat, base] of Object.entries(i.effect.target ?? {}) as [StageStat, number][]) {
      let d = base;
      if (d < 0) {
        if (BLOCKS_ALL.has(ta) || BLOCKS_STAT[ta] === stat) {
          notes.push(`${cap(t.name)}'s ${pretty(ta)} blocks the ${STAT_LABEL[stat]} drop`);
          continue;
        }
        if (ta === "mirror-armor") {
          push(a.side, a.name, stat, d, `${cap(t.name)}'s Mirror Armor reflected it`);
          continue;
        }
      }
      if (ta === "contrary") d = -d;
      else if (ta === "simple") d *= 2;
      if (push(t.side, t.name, stat, d, ta === "contrary" ? "Contrary reversed it" : ta === "simple" ? "Simple doubled it" : undefined) && d < 0) lowered = true;
    }
    // Defiant / Competitive trigger once per move when an OPPONENT lowers a stat
    if (lowered && foe) {
      if (ta === "defiant") push(t.side, t.name, "atk", 2, "Defiant");
      if (ta === "competitive") push(t.side, t.name, "spa", 2, "Competitive");
    }
  }

  return { changes, notes };
}