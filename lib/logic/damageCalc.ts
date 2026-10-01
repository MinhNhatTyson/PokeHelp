import { calculate, Generations, Pokemon as CalcPokemon, Move, Field } from "@smogon/calc";
import type { PokemonDetail, TeamSlot, OpponentSlot } from "@/lib/types";
import type { NatureName } from "@/lib/logic/statCalc";
import { getCommonSet, getActiveMega } from "@/lib/data/commonSets";

const GEN = Generations.get(9);
const LEVEL = 50;
type CalcOpts = NonNullable<ConstructorParameters<typeof CalcPokemon>[2]>;

export type StatKey = "hp" | "atk" | "def" | "spa" | "spd" | "spe";
export type BoostKey = Exclude<StatKey, "hp">;
export type PresetKey = "offense" | "balanced" | "physBulk" | "specBulk" | "none";

export interface MonConfig {
  detail: PokemonDetail | null;
  useMega: boolean;
  item: string | null;
  ability: string | null;
  nature: NatureName | null;
  sp: Record<StatKey, number>;       // Stat Points, 0-32 each
  boosts: Record<BoostKey, number>;  // stat stages, -6..+6
  burned: boolean;
  knownMoves: string[];              // quick-pick chips for the attacker
}

export interface MonSetup {
  species: string; item: string | null; ability: string | null; nature: NatureName | null;
  sp: Record<StatKey, number>; boosts: Record<BoostKey, number>; burned: boolean;
}

export interface FieldSetup {
  weather: "" | "Sun" | "Rain" | "Sand" | "Snow";
  terrain: "" | "Electric" | "Grassy" | "Misty" | "Psychic";
  crit: boolean; helpingHand: boolean;          // attacker side
  reflect: boolean; lightScreen: boolean; auroraVeil: boolean; // defender side
}
export const DEFAULT_FIELD: FieldSetup = {
  weather: "", terrain: "", crit: false, helpingHand: false, reflect: false, lightScreen: false, auroraVeil: false,
};

export type DamageOutcome =
  | { ok: true; description: string; minDmg: number; maxDmg: number; defenderHp: number; minPct: number; maxPct: number; koText: string }
  | { ok: false; error: string };

export const blankConfig = (): MonConfig => ({
  detail: null, useMega: false, item: null, ability: null, nature: null,
  sp: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
  boosts: { atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
  burned: false, knownMoves: [],
});

const slugify = (s: string) => s.toLowerCase().replace(/\s+/g, "-");
const idOf = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, ""); // same idea as the calc's own toID

/** Every preset spends exactly 66 points (32 max per stat) */
export function applyPreset(cfg: MonConfig, key: PresetKey): MonConfig {
  const get = (n: string) => cfg.detail?.stats.find((s) => s.name === n)?.baseStat ?? 0;
  const special = get("special-attack") >= get("attack");
  const sp = { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 } as Record<StatKey, number>;
  let nature = cfg.nature;
  if (key === "offense") {
    const off: StatKey = special ? "spa" : "atk";
    sp.hp = 2; sp.spe = 32; sp[off] = 32;
    nature = nature ?? (special ? "modest" : "adamant");
  } else if (key === "balanced") { sp.hp = 32; sp.def = 17; sp.spd = 17; }
  else if (key === "physBulk") { sp.hp = 32; sp.def = 32; sp.spd = 2; }
  else if (key === "specBulk") { sp.hp = 32; sp.def = 2; sp.spd = 32; }
  return { ...cfg, sp, nature };
}

export function configFromTeamSlot(slot: TeamSlot): MonConfig | null {
  if (!slot.pokemon) return null;
  const cfg = applyPreset({
    ...blankConfig(), detail: slot.pokemon,
    useMega: !!getActiveMega(slot.pokemon.name, slot.itemName),
    item: slot.itemName, ability: slot.abilityName, nature: slot.nature,
    knownMoves: slot.moves.filter((m): m is string => m !== null),
  }, "offense");
  return { ...cfg, sp: { ...cfg.sp, spe: slot.speedSp } };
}

export function configFromOpponent(slot: OpponentSlot): MonConfig | null {
  if (!slot.pokemon) return null;
  const cs = getCommonSet(slot.pokemon.name);
  return applyPreset({
    ...blankConfig(), detail: slot.pokemon,
    useMega: !!slot.megaFormDetail,
    item: slot.itemName ?? (cs ? slugify(cs.topItem) : null),
    ability: slot.abilityName ?? cs?.likelyAbility ?? null,
    knownMoves: cs?.commonMoves.map(slugify) ?? [],
  }, "balanced");
}

export function configFromDetail(detail: PokemonDetail, role: "attacker" | "defender"): MonConfig {
  const cs = getCommonSet(detail.name);
  const likely = cs && detail.abilities.some((a) => a.name === cs.likelyAbility) ? cs.likelyAbility : null;
  return applyPreset({
    ...blankConfig(), detail,
    useMega: !!cs?.megaForm,
    item: cs ? slugify(cs.topItem) : null,
    ability: likely ?? detail.abilities.find((a) => !a.isHidden)?.name ?? null,
    knownMoves: cs?.commonMoves.map(slugify) ?? [],
  }, role === "attacker" ? "offense" : "balanced");
}

export function configToSetup(cfg: MonConfig): MonSetup | null {
  if (!cfg.detail) return null;
  const mega = cfg.useMega ? getCommonSet(cfg.detail.name)?.megaForm : undefined;
  return {
    species: mega?.formShowdownName ?? cfg.detail.name,
    item: cfg.item,
    ability: mega ? mega.formAbility : cfg.ability, // the Mega's ability replaces the base one
    nature: cfg.nature, sp: cfg.sp, boosts: cfg.boosts, burned: cfg.burned,
  };
}

// 1 SP = +1 stat at Lv50 = 8 EVs in calc terms; the calc caps EVs at 252, so a 32-SP stat is 1 point low (negligible)
const spToEv = (sp: number) => Math.min(252, Math.max(0, sp) * 8);

function toCalcPokemon(s: MonSetup) {
  const item = s.item && GEN.items.get(idOf(s.item) as never) ? s.item : undefined;
  const ability = s.ability && GEN.abilities.get(idOf(s.ability) as never) ? s.ability : undefined;
  const nature = s.nature ? ((s.nature[0].toUpperCase() + s.nature.slice(1)) as CalcOpts["nature"]) : undefined;
  return new CalcPokemon(GEN, s.species, {
    level: LEVEL, item, ability, nature,
    evs: { hp: spToEv(s.sp.hp), atk: spToEv(s.sp.atk), def: spToEv(s.sp.def), spa: spToEv(s.sp.spa), spd: spToEv(s.sp.spd), spe: spToEv(s.sp.spe) },
    boosts: s.boosts,
    status: s.burned ? "brn" : undefined,
  });
}

const fail = (error: string): DamageOutcome => ({ ok: false, error });
const round1 = (n: number) => Math.round(n * 10) / 10;

export function runDamageCalc(attacker: MonSetup, defender: MonSetup, moveName: string, field: FieldSetup): DamageOutcome {
  if (!GEN.species.get(idOf(attacker.species) as never)) return fail(`The calculator doesn't know "${attacker.species}" yet. Untick Mega to use the base form.`);
  if (!GEN.species.get(idOf(defender.species) as never)) return fail(`The calculator doesn't know "${defender.species}" yet. Untick Mega to use the base form.`);
  const moveData = GEN.moves.get(idOf(moveName) as never);
  if (!moveData) return fail(`Unknown move "${moveName}". Pick one from the list.`);
  if (moveData.category === "Status") return fail("That's a status move — it deals no damage.");

  try {
    const atk = toCalcPokemon(attacker);
    const def = toCalcPokemon(defender);
    const move = new Move(GEN, moveName, { isCrit: field.crit });
    const result = calculate(GEN, atk, def, move, new Field({
      gameType: "Doubles",
      weather: field.weather || undefined,
      terrain: field.terrain || undefined,
      attackerSide: { isHelpingHand: field.helpingHand },
      defenderSide: { isReflect: field.reflect, isLightScreen: field.lightScreen, isAuroraVeil: field.auroraVeil },
    }));
    const [minDmg, maxDmg] = result.range();
    const hp = def.maxHP();
    return {
      ok: true, description: result.desc(), minDmg, maxDmg, defenderHp: hp,
      minPct: round1((minDmg / hp) * 100), maxPct: round1((maxDmg / hp) * 100),
      koText: result.kochance().text,
    };
  } catch {
    return fail("The calculator couldn't evaluate this combination. Try the base form or another move.");
  }
}