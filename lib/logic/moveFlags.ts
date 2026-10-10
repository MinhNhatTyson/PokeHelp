import { Generations } from "@smogon/calc";
import { POKEMON_TYPES, PokemonTypeName } from "@/lib/types";

const GEN = Generations.get(9);
const idOf = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

export type MoveFlagKey =
  | "contact" | "bullet" | "sound" | "punch" | "bite" | "pulse" | "slicing" | "wind" | "powder" | "dance";

export const MOVE_FLAG_META: Record<MoveFlagKey, { label: string; note: string }> = {
  contact: {
    label: "Contact",
    note: "Triggers contact punishers (Rough Skin, Iron Barbs, Rocky Helmet, Static, Flame Body) and is boosted by Tough Claws. Protective Pads and Long Reach avoid the punishment.",
  },
  bullet: {
    label: "Ball / bomb",
    note: "Sphere-type move (Shadow Ball, Sludge Bomb, Focus Blast…). Bulletproof makes the target immune.",
  },
  sound: { label: "Sound", note: "Soundproof makes the target immune, Punk Rock boosts it, and it usually bypasses Substitute." },
  punch: { label: "Punch", note: "Boosted by Iron Fist and Punching Glove." },
  bite: { label: "Bite", note: "Boosted by Strong Jaw." },
  pulse: { label: "Pulse", note: "Boosted by Mega Launcher." },
  slicing: { label: "Slicing", note: "Boosted by Sharpness." },
  wind: { label: "Wind", note: "Wind Rider absorbs it (+1 Attack) and Wind Power charges up when hit by it." },
  powder: { label: "Powder", note: "Grass types, Overcoat and Safety Goggles are immune." },
  dance: { label: "Dance", note: "Can be copied by Dancer." },
};

// Older calc versions stored these as flat booleans (makesContact, isPunch…), newer ones under `flags`.
// Both shapes are checked so a version bump doesn't silently blank the page.
const LEGACY_KEY: Record<MoveFlagKey, string> = {
  contact: "makesContact", bullet: "isBullet", sound: "isSound", punch: "isPunch", bite: "isBite",
  pulse: "isPulse", slicing: "isSlicing", wind: "isWind", powder: "isPowder", dance: "isDance",
};

type Raw = Record<string, unknown>;

function rawMove(slug: string): Raw | null {
  const data = GEN.moves.get(idOf(slug) as never) as unknown as Raw | undefined;
  return data ?? null;
}

function flagsOf(raw: Raw): MoveFlagKey[] {
  const flags = (raw.flags ?? {}) as Raw;
  return (Object.keys(MOVE_FLAG_META) as MoveFlagKey[]).filter((k) => !!flags[k] || !!raw[LEGACY_KEY[k]]);
}

let trusted: boolean | null = null;
/**
 * Sanity probe: Close Combat must read as a contact move. If it doesn't, the calc's data shape isn't
 * what we expect, so the UI hides every flag claim (including "No contact") instead of showing wrong ones.
 */
export function moveFlagsTrusted(): boolean {
  if (trusted === null) {
    const raw = rawMove("close-combat");
    trusted = !!raw && flagsOf(raw).includes("contact");
  }
  return trusted;
}

export interface MoveQuickInfo {
  type: PokemonTypeName | null;
  category: "physical" | "special" | "status" | null;
  basePower: number;
  flags: MoveFlagKey[];
}

/** null = the calc doesn't know this move (e.g. a brand-new Champions move). */
export function getMoveQuickInfo(slug: string): MoveQuickInfo | null {
  const raw = rawMove(slug);
  if (!raw) return null;
  const t = String(raw.type ?? "").toLowerCase();
  const c = String(raw.category ?? "").toLowerCase();
  return {
    type: (POKEMON_TYPES as readonly string[]).includes(t) ? (t as PokemonTypeName) : null,
    category: c === "physical" || c === "special" || c === "status" ? c : null,
    basePower: Number(raw.basePower ?? raw.bp) || 0,
    flags: flagsOf(raw),
  };
}