import { calculate, Generations, Pokemon as CalcPokemon, Move, Field } from "@smogon/calc";
import type { PokemonDetail, TeamSlot, OpponentSlot, PokemonTypeName } from "@/lib/types";
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
  sp: Record<StatKey, number>;
  boosts: Record<BoostKey, number>; 
  burned: boolean;
  knownMoves: string[];      
}

export interface MonSetup {
  species: string;                      
  baseSpecies: string;                  
  megaTypes: PokemonTypeName[] | null; 
  overrideTypes?: PokemonTypeName[]; 
  item: string | null; ability: string | null; nature: NatureName | null;
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
  | { ok: true; kind: "damage"; description: string; minDmg: number; maxDmg: number; defenderHp: number; minPct: number; maxPct: number; koText: string; warnings: string[] }
  | { ok: true; kind: "noEffect"; message: string; warnings: string[] }
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
export function presetSp(detail: PokemonDetail | null, key: PresetKey): Record<StatKey, number> {
  const get = (n: string) => detail?.stats.find((s) => s.name === n)?.baseStat ?? 0;
  const special = get("special-attack") >= get("attack");
  const sp = { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 } as Record<StatKey, number>;
  if (key === "offense") {
    const off: StatKey = special ? "spa" : "atk";
    sp.hp = 2; sp.spe = 32; sp[off] = 32;
  } else if (key === "balanced") { sp.hp = 32; sp.def = 17; sp.spd = 17; }
  else if (key === "physBulk") { sp.hp = 32; sp.def = 32; sp.spd = 2; }
  else if (key === "specBulk") { sp.hp = 32; sp.def = 2; sp.spd = 32; }
  return sp;
}

export function applyPreset(cfg: MonConfig, key: PresetKey): MonConfig {
  const get = (n: string) => cfg.detail?.stats.find((s) => s.name === n)?.baseStat ?? 0;
  const special = get("special-attack") >= get("attack");
  let nature = cfg.nature;
  if (key === "offense") nature = nature ?? (special ? "modest" : "adamant");
  return { ...cfg, sp: presetSp(cfg.detail, key), nature };
}

/** True once the player has put any non-Speed SP on this Team Builder slot. */
export function slotHasSpread(slot: TeamSlot): boolean {
  return Object.values(slot.spread).some((v) => v > 0);
}

export function configFromTeamSlot(slot: TeamSlot): MonConfig | null {
  if (!slot.pokemon) return null;
  const cfg = applyPreset({
    ...blankConfig(), detail: slot.pokemon,
    useMega: !!getActiveMega(slot.pokemon.name, slot.itemName),
    item: slot.itemName, ability: slot.abilityName, nature: slot.nature,
    knownMoves: slot.moves.filter((m): m is string => m !== null),
  }, "offense");
  // Real spread when the player set one; otherwise the offense preset guess (as before)
  const sp = slotHasSpread(slot) ? { ...slot.spread, spe: slot.speedSp } : { ...cfg.sp, spe: slot.speedSp };
  return { ...cfg, sp };
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
    baseSpecies: cfg.detail.name,
    megaTypes: mega?.formTypes ?? null,
    item: cfg.item,
    ability: mega ? mega.formAbility : cfg.ability, // the Mega's ability replaces the base one
    nature: cfg.nature, sp: cfg.sp, boosts: cfg.boosts, burned: cfg.burned,
  };
}

// 1 SP = +1 stat at Lv50 = 8 EVs in calc terms; the calc caps EVs at 252, so a 32-SP stat is 1 point low (negligible)
const spToEv = (sp: number) => Math.min(252, Math.max(0, sp) * 8);

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function toCalcPokemon(s: MonSetup) {
  const item = s.item && GEN.items.get(idOf(s.item) as never) ? s.item : undefined;
  const ability = s.ability && GEN.abilities.get(idOf(s.ability) as never) ? s.ability : undefined;
  const nature = s.nature ? (cap(s.nature) as CalcOpts["nature"]) : undefined;
  return new CalcPokemon(GEN, s.species, {
    level: LEVEL, item, ability, nature,
    evs: { hp: spToEv(s.sp.hp), atk: spToEv(s.sp.atk), def: spToEv(s.sp.def), spa: spToEv(s.sp.spa), spd: spToEv(s.sp.spd), spe: spToEv(s.sp.spe) },
    boosts: s.boosts,
    status: s.burned ? "brn" : undefined,
    overrides: s.overrideTypes ? ({ types: s.overrideTypes.map(cap) } as CalcOpts["overrides"]) : undefined,
  });
}

const fail = (error: string): DamageOutcome => ({ ok: false, error });
const round1 = (n: number) => Math.round(n * 10) / 10;

export function runDamageCalc(attackerIn: MonSetup, defenderIn: MonSetup, moveName: string, field: FieldSetup): DamageOutcome {
  const warnings: string[] = [];

  // If the calculator doesn't know a new Mega form, fall back to the base form + Mega ability/typing instead of failing.
  const prepare = (s: MonSetup, who: string): MonSetup => {
    if (GEN.species.get(idOf(s.species) as never)) return s;
    warnings.push(
      `${who}: the calculator doesn't know ${s.species} yet, so it uses ${s.baseSpecies}'s base stats` +
      `${s.megaTypes ? " with the Mega typing" : ""}. Mega stat boosts aren't included, so treat the numbers as approximate.`
    );
    return { ...s, species: s.baseSpecies, overrideTypes: s.megaTypes ?? undefined };
  };
  const attacker = prepare(attackerIn, "Attacker");
  const defender = prepare(defenderIn, "Defender");

  if (!GEN.species.get(idOf(attacker.species) as never)) return fail(`The calculator doesn't know "${attacker.species}".`);
  if (!GEN.species.get(idOf(defender.species) as never)) return fail(`The calculator doesn't know "${defender.species}".`);
  const moveData = GEN.moves.get(idOf(moveName) as never);
  if (!moveData) return fail(`Unknown move "${moveName}". Pick one from the list.`);
  if (moveData.category === "Status") return fail("That's a status move, so it deals no damage.");

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

    if (maxDmg === 0) {
      const chart = GEN.types.get(idOf(moveData.type) as never) as unknown as { effectiveness: Record<string, number> } | undefined;
      const blocker = def.types.find((t) => chart?.effectiveness[t] === 0);
      return {
        ok: true, kind: "noEffect", warnings,
        message: blocker
          ? `No effect. ${cap(defender.baseSpecies)} is immune to ${moveData.type}-type moves (${blocker}).`
          : "No effect. The move did no damage, usually because of an ability immunity (like Levitate or Volt Absorb) or a condition that isn't met.",
      };
    }

    const hp = def.maxHP();
    return {
      ok: true, kind: "damage", description: result.desc(), minDmg, maxDmg, defenderHp: hp,
      minPct: round1((minDmg / hp) * 100), maxPct: round1((maxDmg / hp) * 100),
      koText: result.kochance().text, warnings,
    };
  } catch (e) {
    return fail(`The calculator couldn't evaluate this combination (${e instanceof Error ? e.message : "unknown error"}).`);
  }
}