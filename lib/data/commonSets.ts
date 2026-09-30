import { PokemonDetail, PokemonTypeName } from "@/lib/types";


export interface CommonSetEntry {
  species: string;
  showdownName: string;
  likelyAbility: string; // pre-Mega ability, if this species commonly Mega Evolves
  commonMoves: string[];
  topItem: string;
  regulation: string;
  megaForm?: {
    formSpecies: string;
    formShowdownName: string;
    formAbility: string;
    formTypes?: PokemonTypeName[]; // fallback when PokeAPI has no entry for a brand-new Mega
  };
}

const stoneSlug = (e: CommonSetEntry) => e.topItem.toLowerCase().replace(/\s+/g, "-");
export function getActiveMega(name: string, itemName: string | null | undefined) {
  const e = getCommonSet(name);
  return e?.megaForm && itemName === stoneSlug(e) ? e.megaForm : null;
}
export function describeMegaForm(name: string): string | null {
  const m = getCommonSet(name)?.megaForm;
  if (!m) return null;
  return `${m.formShowdownName} (${m.formTypes?.join("/") ?? "typing per PokeAPI"}, ${m.formAbility.replace(/-/g, " ")})`;
}
export function synthesizeMegaDetail(base: PokemonDetail, m: NonNullable<CommonSetEntry["megaForm"]>): PokemonDetail | null {
  return m.formTypes ? { ...base, name: m.formSpecies, types: m.formTypes } : null;
}

export const COMMON_SETS: Record<string, CommonSetEntry> = {
  garchomp: { species: "garchomp", showdownName: "Garchomp", likelyAbility: "rough-skin", commonMoves: ["Dragon Claw", "Rock Slide", "Earthquake", "Protect"], topItem: "Life Orb", regulation: "VGC 2026 Reg M-B" },
  sinistcha: { species: "sinistcha", showdownName: "Sinistcha", likelyAbility: "hospitality", commonMoves: ["Rage Powder", "Shadow Ball", "Trick Room", "Matcha Gotcha"], topItem: "Focus Sash", regulation: "VGC 2026 Reg M-B" },
  basculegion: { species: "basculegion", showdownName: "Basculegion", likelyAbility: "adaptability", commonMoves: ["Last Respects", "Aqua Jet", "Wave Crash", "Protect"], topItem: "Choice Scarf", regulation: "VGC 2026 Reg M-B" },
  whimsicott: { species: "whimsicott", showdownName: "Whimsicott", likelyAbility: "prankster", commonMoves: ["Tailwind", "Moonblast", "Encore", "Protect"], topItem: "Focus Sash", regulation: "VGC 2026 Reg M-B" },
  kingambit: { species: "kingambit", showdownName: "Kingambit", likelyAbility: "defiant", commonMoves: ["Sucker Punch", "Kowtow Cleave", "Iron Head", "Protect"], topItem: "Chople Berry", regulation: "VGC 2026 Reg M-B" },
  incineroar: { species: "incineroar", showdownName: "Incineroar", likelyAbility: "intimidate", commonMoves: ["Fake Out", "Knock Off", "Flare Blitz", "Parting Shot"], topItem: "Sitrus Berry", regulation: "VGC 2026 Reg M-B" },
  sneasler: {
    species: "sneasler", showdownName: "Sneasler", likelyAbility: "unburden",
    commonMoves: ["Close Combat", "Fake Out", "Dire Claw", "Protect"],
    topItem: "White Herb", regulation: "VGC 2026 Reg M-B (Champions)",
  },
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
  tyranitar: {
    species: "tyranitar", showdownName: "Tyranitar", likelyAbility: "sand-stream",
    commonMoves: ["Rock Slide", "Knock Off", "Protect", "Low Kick"],
    topItem: "Tyranitarite", regulation: "VGC 2026 Reg M-B",
    megaForm: { formSpecies: "tyranitar-mega", formShowdownName: "Tyranitar-Mega", formAbility: "sand-stream" },
  },
    milotic: {
    species: "milotic", showdownName: "Milotic", likelyAbility: "competitive",
    commonMoves: ["Protect", "Scald", "Ice Beam", "Icy Wind"],
    topItem: "Leftovers", regulation: "VGC 2026 Reg M-C",
  },
  corviknight: {
    species: "corviknight", showdownName: "Corviknight", likelyAbility: "mirror-armor",
    commonMoves: ["Brave Bird", "Roost", "Tailwind", "Bulk Up"],
    topItem: "Leftovers", regulation: "VGC 2026 Reg M-C",
  },
  rillaboom: {
    species: "rillaboom", showdownName: "Rillaboom", likelyAbility: "grassy-surge",
    commonMoves: ["Fake Out", "Grassy Glide", "Wood Hammer", "U-turn"],
    topItem: "Life Orb", regulation: "VGC 2026 Reg M-C",
  },
  "indeedee-female": {
    species: "indeedee-female", showdownName: "Indeedee-F", likelyAbility: "psychic-surge",
    commonMoves: ["Follow Me", "Helping Hand", "Trick Room", "Psychic"],
    topItem: "Psychic Seed", regulation: "VGC 2026 Reg M-C",
  },
  golisopod: {
    species: "golisopod", showdownName: "Golisopod", likelyAbility: "water-bubble",
    commonMoves: ["Iron Head", "Leech Life", "Protect", "First Impression"],
    topItem: "Golisopite", regulation: "VGC 2026 Reg M-C",
    megaForm: { formSpecies: "golisopod-mega", formShowdownName: "Golisopod-Mega", formAbility: "tough-claws", formTypes: ["bug", "steel"] },
  },
  salamence: {
    species: "salamence", showdownName: "Salamence", likelyAbility: "intimidate",
    commonMoves: ["Hyper Voice", "Protect", "Double-Edge", "Tailwind"],
    topItem: "Salamencite", regulation: "VGC 2026 Reg M-C",
    megaForm: { formSpecies: "salamence-mega", formShowdownName: "Salamence-Mega", formAbility: "aerilate", formTypes: ["dragon", "flying"] },
  },
  baxcalibur: {
    species: "baxcalibur", showdownName: "Baxcalibur", likelyAbility: "thermal-exchange",
    commonMoves: ["Glaive Rush", "Ice Shard", "Icicle Crash", "Protect"],
    topItem: "Baxcalibrite", regulation: "VGC 2026 Reg M-C",
    megaForm: { formSpecies: "baxcalibur-mega", formShowdownName: "Baxcalibur-Mega", formAbility: "thermal-exchange", formTypes: ["dragon", "ice"] },
  },
};

export function getCommonSet(speciesName: string): CommonSetEntry | null {
  return COMMON_SETS[speciesName.toLowerCase()] ?? null;
}