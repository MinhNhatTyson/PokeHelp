import { NATURES, NatureName, evToSp, MAX_SP_PER_STAT } from "@/lib/logic/statCalc";

export interface ParsedSet {
  displayName: string;
  species: string;          // PokeAPI-style slug guess
  item: string | null;      // slug
  ability: string | null;   // slug
  nature: NatureName | null;
  speedSp: number;
  spread: Record<"hp" | "atk" | "def" | "spa" | "spd" | "spe", number>;
  moves: string[];          // slugs
}

export const toSlug = (s: string) =>
  s.trim().toLowerCase().replace(/[’'.]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

// Showdown suffixes that PokeAPI spells out
const SPECIES_ALIASES: Record<string, string> = {
  "indeedee-f": "indeedee-female", "indeedee-m": "indeedee-male",
  "meowstic-f": "meowstic-female", "meowstic-m": "meowstic-male",
  "basculegion-f": "basculegion-female", "oinkologne-f": "oinkologne-female",
};

export function parseShowdownTeam(text: string): ParsedSet[] {
  const blocks = text.replace(/\r/g, "").split(/\n\s*\n/);
  const sets: ParsedSet[] = [];

  for (const block of blocks) {
    const lines = block.split("\n").map((l) => l.trim()).filter((l) => l && !l.startsWith("==="));
    if (lines.length === 0) continue;

    // "Nickname (Species) (M) @ Item"
    const [namePartRaw, itemRaw] = lines[0].split(" @ ");
    const namePart = namePartRaw.replace(/\s*\((M|F)\)\s*$/i, "");
    const paren = namePart.match(/\(([^)]+)\)\s*$/);
    const speciesRaw = paren ? paren[1] : namePart;
    const speciesSlug = toSlug(speciesRaw);

    const set: ParsedSet = {
      displayName: speciesRaw.trim(),
      species: SPECIES_ALIASES[speciesSlug] ?? speciesSlug,
      item: itemRaw ? toSlug(itemRaw) : null,
      ability: null, nature: null, speedSp: 0, moves: [],
      spread: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
    };

    for (const line of lines.slice(1)) {
      let m: RegExpMatchArray | null;
      if ((m = line.match(/^ability:\s*(.+)$/i))) {
        set.ability = toSlug(m[1]);
      }  else if ((m = line.match(/^(?:evs|sps?):\s*(.+)$/i))) {
          const parts = m[1].split("/").map((p) => p.trim().match(/^(\d+)\s*(\w+)$/)).filter(Boolean) as RegExpMatchArray[];
          // Any value > 32 must be old-style EVs; otherwise treat as SP
          const isEvs = parts.some((p) => Number(p[1]) > MAX_SP_PER_STAT);
          for (const p of parts) {
            const k = p[2].toLowerCase() as keyof ParsedSet["spread"];
            if (!(k in set.spread)) continue;
            set.spread[k] = isEvs ? evToSp(Number(p[1])) : Math.min(MAX_SP_PER_STAT, Number(p[1]));
          }
          set.speedSp = set.spread.spe;
      } else if ((m = line.match(/^(\w+)\s+nature$/i))) {
        const n = m[1].toLowerCase();
        if (n in NATURES) set.nature = n as NatureName;
      } else if (line.startsWith("-")) {
        const move = toSlug(line.replace(/^-\s*/, ""));
        if (move && set.moves.length < 4) set.moves.push(move);
      }
      // Level / Tera Type / IVs / Shiny / Gender lines are intentionally ignored
    }
    sets.push(set);
  }
  return sets;
}