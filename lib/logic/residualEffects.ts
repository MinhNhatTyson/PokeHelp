import type { BattleSide, FieldState, HpChange, MonRef, PokemonTypeName, StatusKind } from "@/lib/types";

export const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const title = (slug: string) => slug.split("-").map(cap).join(" ");
const pct = (fraction: number) => Math.round(fraction * 100); // 1/16 → 6, 1/8 → 13, 1/3 → 33

// Deliberately small and curated, same philosophy as abilitySignals.ts / itemSignals.ts:
// only effects that change HP on their own, without needing the real HP stat.
export interface BerrySignal { threshold: number; heal: number; label: string }
const pinch = (label: string): BerrySignal => ({ threshold: 25, heal: pct(1 / 3), label });
export const BERRIES: Record<string, BerrySignal> = {
  "sitrus-berry": { threshold: 50, heal: pct(1 / 4), label: "Sitrus Berry" },
  "figy-berry": pinch("Figy Berry"),
  "wiki-berry": pinch("Wiki Berry"),
  "mago-berry": pinch("Mago Berry"),
  "aguav-berry": pinch("Aguav Berry"),
  "iapapa-berry": pinch("Iapapa Berry"),
};

export function checkBerry(item: string | null | undefined, hp: number, used: boolean): BerrySignal | null {
  if (!item || used || hp <= 0) return null;
  const b = BERRIES[item];
  return b && hp <= b.threshold ? b : null;
}

const SAND_SAFE_TYPES: PokemonTypeName[] = ["rock", "ground", "steel"];
const SAND_SAFE_ABILITIES = new Set(["magic-guard", "overcoat", "sand-veil", "sand-rush", "sand-force"]);

export interface ResidualMon {
  side: BattleSide;
  name: string;
  hp: number;                 // % of max HP
  types: PokemonTypeName[];
  item: string | null;
  ability: string | null;
  status: StatusKind | null;
  toxicTurns: number;         // end-of-turn ticks already taken while badly poisoned
  itemUsed: boolean;          // berry already eaten
  assumed: boolean;           // item/ability is a scouting guess (opponent)
}

export interface ResidualOutcome {
  changes: HpChange[];        // signed: + = HP lost, − = HP restored
  notes: string[];
  toxic: { side: BattleSide; name: string; turns: number }[]; // new counters; anyone missing resets to 0
  consumed: MonRef[];
  fainted: MonRef[];
}

export function computeEndOfTurn(
  mons: ResidualMon[],
  field: Pick<FieldState, "weather" | "weatherTurnsLeft" | "terrain" | "terrainTurnsLeft">
): ResidualOutcome {
  const out: ResidualOutcome = { changes: [], notes: [], toxic: [], consumed: [], fainted: [] };
  // On its final turn, weather/terrain ends before its residual effect fires
  const weather = field.weatherTurnsLeft === 1 ? "none" : field.weather;
  const terrain = field.terrainTurnsLeft === 1 ? "none" : field.terrain;

  for (const m of mons) {
    if (m.hp <= 0) continue;
    let hp = m.hp;
    const ability = m.ability ?? "";
    const magicGuard = ability === "magic-guard";
    const tag = m.assumed ? " (assumed item)" : "";

    const apply = (delta: number, why: string) => {
      if (hp <= 0) return;
      const applied = delta > 0 ? Math.min(hp, delta) : -Math.min(100 - hp, -delta);
      if (applied === 0) return;
      const before = hp;
      hp -= applied;
      out.changes.push({ side: m.side, name: m.name, pct: applied });
      out.notes.push(
        `${cap(m.name)} ${applied > 0 ? "lost" : "recovered"} ${Math.abs(applied)}% ${applied > 0 ? "to" : "from"} ${why} (${before}% → ${hp}%)`
      );
    };

    // Weather
    if (weather === "sand" && !m.types.some((t) => SAND_SAFE_TYPES.includes(t)) && !SAND_SAFE_ABILITIES.has(ability)) {
      apply(pct(1 / 16), "Sandstorm");
    }
    if (weather === "rain") {
      if (ability === "rain-dish") apply(-pct(1 / 16), "Rain Dish");
      if (ability === "dry-skin") apply(-pct(1 / 8), "Dry Skin");
    }
    if (weather === "sun" && !magicGuard && (ability === "dry-skin" || ability === "solar-power")) {
      apply(pct(1 / 8), title(ability));
    }
    if (weather === "snow" && ability === "ice-body") apply(-pct(1 / 16), "Ice Body");

    // Terrain (grounded mons only)
    if (terrain === "grassy" && !m.types.includes("flying") && ability !== "levitate") {
      apply(-pct(1 / 16), "Grassy Terrain");
    }

    // Held items
    if (m.item === "leftovers") apply(-pct(1 / 16), `Leftovers${tag}`);
    if (m.item === "black-sludge") {
      if (m.types.includes("poison")) apply(-pct(1 / 16), `Black Sludge${tag}`);
      else if (!magicGuard) apply(pct(1 / 8), `Black Sludge${tag}`);
    }

    // Status chip
    let toxicTurns: number | null = null;
    const poisoned = m.status === "poison" || m.status === "toxic";
    if (poisoned && ability === "poison-heal") {
      apply(-pct(1 / 8), "Poison Heal");
    } else if (m.status === "burn" && !magicGuard) {
      apply(pct(1 / 16), "its burn");
    } else if (m.status === "poison" && !magicGuard) {
      apply(pct(1 / 8), "poison");
    } else if (m.status === "toxic") {
      toxicTurns = m.toxicTurns + 1;
      if (!magicGuard) apply(pct(Math.min(toxicTurns, 15) / 16), `bad poison (turn ${toxicTurns})`);
    }

    // Berries (also checked right after hits, in the store's addEvent)
    const berry = checkBerry(m.item, hp, m.itemUsed);
    if (berry && hp > 0) {
      apply(-berry.heal, `its ${berry.label}${tag}`);
      out.consumed.push({ side: m.side, name: m.name });
    }

    if (hp <= 0) {
      out.fainted.push({ side: m.side, name: m.name });
      out.notes.push(`${cap(m.name)} fainted`);
    } else if (toxicTurns !== null) {
      out.toxic.push({ side: m.side, name: m.name, turns: toxicTurns });
    }
  }
  return out;
}