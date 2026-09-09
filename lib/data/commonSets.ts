// Curated, hand-sourced from Pikalytics VGC usage stats (Pokémon Champions
// VGC 2026 Regulation M-B, pulled September 2026). This is NOT derived from
// PokeAPI — PokeAPI only knows legal movepools, not what's actually run in
// the current meta. Usage shifts every regulation/season, so treat this as a
// living file that needs periodic re-checking against Pikalytics, not a
// permanent truth. Extend by adding more entries in the same shape.
export interface CommonSetEntry {
  species: string;
  showdownName: string;
  likelyAbility: string; // pre-Mega ability, if this species commonly Mega Evolves
  commonMoves: string[];
  topItem: string;
  regulation: string;
  megaForm?: {
    formSpecies: string;       // PokeAPI slug, e.g. "charizard-mega-y"
    formShowdownName: string;  // e.g. "Charizard-Mega-Y"
    formAbility: string;       // the ability that actually matters for scoring
  };
}

export const COMMON_SETS: Record<string, CommonSetEntry> = {
  garchomp: { species: "garchomp", showdownName: "Garchomp", likelyAbility: "rough-skin", commonMoves: ["Dragon Claw", "Rock Slide", "Earthquake", "Protect"], topItem: "Life Orb", regulation: "VGC 2026 Reg M-B" },
  sinistcha: { species: "sinistcha", showdownName: "Sinistcha", likelyAbility: "hospitality", commonMoves: ["Rage Powder", "Shadow Ball", "Trick Room", "Matcha Gotcha"], topItem: "Focus Sash", regulation: "VGC 2026 Reg M-B" },
  basculegion: { species: "basculegion", showdownName: "Basculegion", likelyAbility: "adaptability", commonMoves: ["Last Respects", "Aqua Jet", "Wave Crash", "Protect"], topItem: "Choice Scarf", regulation: "VGC 2026 Reg M-B" },
  whimsicott: { species: "whimsicott", showdownName: "Whimsicott", likelyAbility: "prankster", commonMoves: ["Tailwind", "Moonblast", "Encore", "Protect"], topItem: "Focus Sash", regulation: "VGC 2026 Reg M-B" },
  kingambit: { species: "kingambit", showdownName: "Kingambit", likelyAbility: "defiant", commonMoves: ["Sucker Punch", "Kowtow Cleave", "Iron Head", "Protect"], topItem: "Chople Berry", regulation: "VGC 2026 Reg M-B" },
  incineroar: { species: "incineroar", showdownName: "Incineroar", likelyAbility: "intimidate", commonMoves: ["Fake Out", "Knock Off", "Flare Blitz", "Parting Shot"], topItem: "Sitrus Berry", regulation: "VGC 2026 Reg M-B" },
  sneasler: { species: "sneasler", showdownName: "Sneasler", likelyAbility: "unburden", commonMoves: ["Dire Claw", "Close Combat", "Throat Chop", "Fake Out"], topItem: "Electric Seed", regulation: "VGC 2026 Reg I" },
  pikachu: { species: "pikachu", showdownName: "Pikachu", likelyAbility: "lightning-rod", commonMoves: ["Fake Out", "Thunderbolt", "Quick Attack", "Protect"], topItem: "Light Ball", regulation: "VGC 2026 Reg M-B" },
  "chi-yu": { species: "chi-yu", showdownName: "Chi-Yu", likelyAbility: "beads-of-ruin", commonMoves: ["Heat Wave", "Dark Pulse", "Overheat", "Snarl"], topItem: "Choice Scarf", regulation: "VGC 2026 Reg I" },
  charizard: {
    species: "charizard", showdownName: "Charizard", likelyAbility: "blaze",
    commonMoves: ["Heat Wave", "Solar Beam", "Weather Ball", "Protect"],
    topItem: "Charizardite Y", regulation: "VGC 2026 Reg M-B",
    megaForm: { formSpecies: "charizard-mega-y", formShowdownName: "Charizard-Mega-Y", formAbility: "drought" },
  },
  pelipper: { species: "pelipper", showdownName: "Pelipper", likelyAbility: "drizzle", commonMoves: ["Hurricane", "Weather Ball", "Tailwind", "Wide Guard"], topItem: "Focus Sash", regulation: "VGC 2026 Tournaments" },
  staraptor: {
    species: "staraptor", showdownName: "Staraptor", likelyAbility: "intimidate",
    commonMoves: ["Close Combat", "Protect", "Brave Bird", "Roost"],
    topItem: "Staraptite", regulation: "VGC 2026 Reg M-B",
    megaForm: { formSpecies: "staraptor-mega", formShowdownName: "Staraptor-Mega", formAbility: "contrary" },
  },
  archaludon: {
    species: "archaludon", showdownName: "Archaludon", likelyAbility: "stamina",
    commonMoves: ["Electro Shot", "Flash Cannon", "Protect", "Dragon Pulse"],
    topItem: "Leftovers", regulation: "VGC 2026 Reg M-B",
  },
  grimmsnarl: {
    species: "grimmsnarl", showdownName: "Grimmsnarl", likelyAbility: "prankster",
    commonMoves: ["Light Screen", "Parting Shot", "Reflect", "Spirit Break"],
    topItem: "Light Clay", regulation: "VGC 2026 Reg M-B",
  },
  sylveon: {
    species: "sylveon", showdownName: "Sylveon", likelyAbility: "pixilate",
    commonMoves: ["Hyper Voice", "Protect", "Moonblast", "Calm Mind"],
    topItem: "Life Orb", regulation: "VGC 2026 Reg M-B",
  },
  swampert: {
    species: "swampert", showdownName: "Swampert", likelyAbility: "torrent",
    commonMoves: ["Wave Crash", "Earthquake", "Protect", "Ice Punch"],
    topItem: "Swampertite", regulation: "VGC 2026 Reg M-B",
    megaForm: { formSpecies: "swampert-mega", formShowdownName: "Swampert-Mega", formAbility: "swift-swim" },
  },
  raichu: {
    species: "raichu", showdownName: "Raichu", likelyAbility: "lightning-rod",
    commonMoves: ["Fake Out", "Protect", "Zap Cannon", "Focus Blast"],
    topItem: "Raichunite Y", regulation: "VGC 2026 Reg M-B",
    megaForm: { formSpecies: "raichu-mega-y", formShowdownName: "Raichu-Mega-Y", formAbility: "no-guard" },
  },
  farigiraf: {
    species: "farigiraf", showdownName: "Farigiraf", likelyAbility: "armor-tail",
    commonMoves: ["Trick Room", "Psychic", "Helping Hand", "Protect"],
    topItem: "Sitrus Berry", regulation: "VGC 2026 Reg M-B",
  },
  gholdengo: {
    species: "gholdengo", showdownName: "Gholdengo", likelyAbility: "good-as-gold",
    commonMoves: ["Make It Rain", "Shadow Ball", "Protect", "Nasty Plot"],
    topItem: "Life Orb", regulation: "VGC 2026 Reg M-B",
  },
};

export function getCommonSet(speciesName: string): CommonSetEntry | null {
  return COMMON_SETS[speciesName.toLowerCase()] ?? null;
}