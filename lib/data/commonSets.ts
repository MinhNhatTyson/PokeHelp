// Curated, hand-sourced from Pikalytics VGC usage stats (Pokémon Champions
// VGC 2026 Regulation M-B, pulled September 2026). This is NOT derived from
// PokeAPI — PokeAPI only knows legal movepools, not what's actually run in
// the current meta. Usage shifts every regulation/season, so treat this as a
// living file that needs periodic re-checking against Pikalytics, not a
// permanent truth. Extend by adding more entries in the same shape.
export interface CommonSetEntry {
  /** PokeAPI species/form slug, e.g. "charizard-mega-y" */
  species: string;
  likelyAbility: string; // PokeAPI ability slug
  commonMoves: string[]; // display names, top 4 by usage
  topItem: string;
  regulation: string; // source regulation, for future upkeep
}

export const COMMON_SETS: Record<string, CommonSetEntry> = {
  garchomp: {
    species: "garchomp", likelyAbility: "rough-skin",
    commonMoves: ["Dragon Claw", "Rock Slide", "Earthquake", "Protect"],
    topItem: "Life Orb", regulation: "VGC 2026 Reg M-B",
  },
  sinistcha: {
    species: "sinistcha", likelyAbility: "hospitality",
    commonMoves: ["Rage Powder", "Shadow Ball", "Trick Room", "Matcha Gotcha"],
    topItem: "Focus Sash", regulation: "VGC 2026 Reg M-B",
  },
  basculegion: {
    species: "basculegion", likelyAbility: "adaptability",
    commonMoves: ["Last Respects", "Aqua Jet", "Wave Crash", "Protect"],
    topItem: "Choice Scarf", regulation: "VGC 2026 Reg M-B",
  },
  whimsicott: {
    species: "whimsicott", likelyAbility: "prankster",
    commonMoves: ["Tailwind", "Moonblast", "Encore", "Protect"],
    topItem: "Focus Sash", regulation: "VGC 2026 Reg M-B",
  },
  kingambit: {
    species: "kingambit", likelyAbility: "defiant",
    commonMoves: ["Sucker Punch", "Kowtow Cleave", "Iron Head", "Protect"],
    topItem: "Chople Berry", regulation: "VGC 2026 Reg M-B",
  },
  incineroar: {
    species: "incineroar", likelyAbility: "intimidate",
    commonMoves: ["Fake Out", "Knock Off", "Flare Blitz", "Parting Shot"],
    topItem: "Sitrus Berry", regulation: "VGC 2026 Reg M-B",
  },
  sneasler: {
    species: "sneasler", likelyAbility: "unburden",
    commonMoves: ["Dire Claw", "Close Combat", "Throat Chop", "Fake Out"],
    topItem: "Electric Seed", regulation: "VGC 2026 Reg I",
  },
  pikachu: {
    species: "pikachu", likelyAbility: "lightning-rod",
    commonMoves: ["Fake Out", "Thunderbolt", "Quick Attack", "Protect"],
    topItem: "Light Ball", regulation: "VGC 2026 Reg M-B",
  },
  "chi-yu": {
    species: "chi-yu", likelyAbility: "beads-of-ruin",
    commonMoves: ["Heat Wave", "Dark Pulse", "Overheat", "Snarl"],
    topItem: "Choice Scarf", regulation: "VGC 2026 Reg I",
  },
  "charizard-mega-y": {
    species: "charizard-mega-y", likelyAbility: "drought",
    commonMoves: ["Heat Wave", "Solar Beam", "Weather Ball", "Protect"],
    topItem: "Charizardite Y", regulation: "VGC 2026 Reg M-B",
  },
  pelipper: {
    species: "pelipper", likelyAbility: "drizzle",
    commonMoves: ["Hurricane", "Weather Ball", "Tailwind", "Wide Guard"],
    topItem: "Focus Sash", regulation: "VGC 2026 Tournaments",
  },
};

export function getCommonSet(speciesName: string): CommonSetEntry | null {
  return COMMON_SETS[speciesName.toLowerCase()] ?? null;
}