import { calculate, Generations, Pokemon, Move, Field } from "@smogon/calc";
import type { CoverageMon } from "@/lib/logic/battleOptimizer";
import { getCommonSet, CommonSetEntry, getActiveMega } from "@/lib/data/commonSets";

const GEN = Generations.get(9);
const VGC_LEVEL = 50; // VGC always battles at Level 50, regardless of in-game level

export interface LeadDamageCheck {
  attacker: string;
  defender: string;
  move: string;
  description: string; // full readable line from @smogon/calc, e.g. "252 Atk Life Orb Garchomp Earthquake vs. ... 79.8 - 94.1% -- guaranteed 2HKO"
}

const spToEv = (sp: number) => Math.min(252, sp * 8);

type CalcOpts = NonNullable<ConstructorParameters<typeof Pokemon>[2]>;
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const hasRealSpread = (mon: CoverageMon) => !!mon.spread && Object.values(mon.spread).some((v) => v > 0);

function assumedSpread(
  mon: CoverageMon, role: "attacker" | "defender"
): { nature?: CalcOpts["nature"]; evs: NonNullable<CalcOpts["evs"]> } {
  if (hasRealSpread(mon)) {
    const s = mon.spread!;
    return {
      nature: mon.nature ? (cap(mon.nature) as CalcOpts["nature"]) : undefined,
      evs: { hp: spToEv(s.hp), atk: spToEv(s.atk), def: spToEv(s.def), spa: spToEv(s.spa), spd: spToEv(s.spd), spe: spToEv(mon.speedSp ?? 0) },
    };
  }
  // Defenders without a real spread get balanced bulk (previously they got an offense spread with 2 HP)
  if (role === "defender") return { evs: { hp: spToEv(32), def: spToEv(17), spd: spToEv(17) } };

  const isSpecial = (mon.stats?.spAttack ?? 0) >= (mon.stats?.attack ?? 0);
  return isSpecial
    ? { nature: "Modest", evs: { hp: spToEv(2), spa: spToEv(32), spe: spToEv(32) } }
    : { nature: "Adamant", evs: { hp: spToEv(2), atk: spToEv(32), spe: spToEv(32) } };
}

function buildPokemon(mon: CoverageMon, commonSet: CommonSetEntry | null, role: "attacker" | "defender") {
  const mega = mon.megaActive ? commonSet?.megaForm : undefined;
  const showdownName = mega?.formShowdownName ?? commonSet?.showdownName ?? mon.name;
  const ability = mega ? mega.formAbility : (mon.abilityName ?? commonSet?.likelyAbility);
  const item = mon.itemName ? formatItemForCalc(mon.itemName) : commonSet?.topItem;
  const { nature, evs } = assumedSpread(mon, role);
  return new Pokemon(GEN, showdownName, { level: VGC_LEVEL, ability, item, nature, evs });
}

/**
 * Checks `attacker`'s top known common move against `defender`.
 * Returns null if we don't have curated move data for the attacker (we'd
 * just be guessing at what move to check) or if @smogon/calc's dex doesn't
 * recognize the species/move — fails soft rather than showing a wrong number.
 */
export function checkLeadDamage(attacker: CoverageMon, defender: CoverageMon): LeadDamageCheck | null {
  const attackerSet = getCommonSet(attacker.name);
  const userMove = pickCheckableMove(attacker.moves);
  const moveName = userMove ? formatMoveForCalc(userMove) : attackerSet?.commonMoves[0];
  if (!moveName) return null; // no real move chosen and no curated fallback — nothing to check

  try {
    const attackerPoke = buildPokemon(attacker, attackerSet, "attacker");
    const defenderPoke = buildPokemon(defender, getCommonSet(defender.name), "defender");
    const move = new Move(GEN, moveName);
    const result = calculate(GEN, attackerPoke, defenderPoke, move, new Field({ gameType: "Doubles" }));

    return { attacker: attacker.name, defender: defender.name, move: moveName, description: result.desc() };
  } catch {
    return null;
  }
}

// Common non-damaging VGC moves — skipped when picking which of the user's
// actual moves to run through the damage calc, so we don't end up "checking"
// Protect/Tailwind/etc. We don't have real move-category data, so this is a
// hand-maintained exclude-list, not a guarantee — fails soft either way.
const SUPPORT_MOVE_SLUGS = new Set([
  "protect", "detect", "wide-guard", "quick-guard", "follow-me", "rage-powder",
  "tailwind", "trick-room", "helping-hand", "light-screen", "reflect", "aurora-veil",
]);

function formatMoveForCalc(slug: string): string {
  return slug.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

function formatItemForCalc(slug: string): string {
  return slug.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

function pickCheckableMove(moves: string[] | undefined): string | null {
  if (!moves) return null;
  return moves.find((m) => !SUPPORT_MOVE_SLUGS.has(m)) ?? null;
}
