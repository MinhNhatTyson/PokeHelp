import { NatureName } from "./logic/statCalc";

export const POKEMON_TYPES = [
  "normal", "fire", "water", "electric", "grass", "ice", "fighting", "poison",
  "ground", "flying", "psychic", "bug", "rock", "ghost", "dragon", "dark",
  "steel", "fairy",
] as const;

export type PokemonTypeName = (typeof POKEMON_TYPES)[number];

export interface TypeDefenseProfile {
  weakTo: PokemonTypeName[];
  resists: PokemonTypeName[];
  immuneTo: PokemonTypeName[];
}

export interface TypeAttackProfile {
  superEffectiveAgainst: PokemonTypeName[];
  notVeryEffectiveAgainst: PokemonTypeName[];
  noEffectAgainst: PokemonTypeName[];
}

export interface TypeMatchup {
  type: PokemonTypeName;
  attack: TypeAttackProfile;
  defense: TypeDefenseProfile;
}

export interface Pokemon {
  id: number;
  name: string;
  spriteUrl: string | null;
  types: PokemonTypeName[]; // ordered, length 1 or 2
}

export type EffectivenessMultiplier = 0 | 0.25 | 0.5 | 1 | 2 | 4;

export interface DualTypeDefenseProfile {
  quad: PokemonTypeName[];    // 4x weak
  double: PokemonTypeName[];  // 2x weak
  neutral: PokemonTypeName[]; // 1x
  half: PokemonTypeName[];    // 0.5x resist
  quarter: PokemonTypeName[]; // 0.25x resist
  immune: PokemonTypeName[];  // 0x
}

export interface PokemonNameEntry {
  name: string;
  url: string;
}

export interface PokemonStatEntry {
  name: string;
  baseStat: number;
}

export interface PokemonAbility {
  name: string;
  isHidden: boolean;
}

export interface PokemonFormLink {
  name: string;
  isDefault: boolean;
}

export interface EvolutionStage {
  names: string[]; // usually 1; multiple when a species branches (e.g. Eevee)
}

export interface PokemonDetail extends Pokemon {
  dexNumber: number;
  genus: string | null;
  heightM: number;
  weightKg: number;
  abilities: PokemonAbility[];
  stats: PokemonStatEntry[];
  eggGroups: string[];
  forms: PokemonFormLink[];
  evolutionChain: EvolutionStage[];
  artworkUrl: string | null;
  moves: PokemonMoveEntry[]; // NEW — full legal movepool for this form
}

export interface PokemonAbility {
  name: string;
  isHidden: boolean;
  description: string | null;
}

export interface DualTypeAttackProfile {
  superEffectiveAgainst: PokemonTypeName[];
  notVeryEffectiveAgainst: PokemonTypeName[];
  noEffectAgainst: PokemonTypeName[];
}

export interface ItemNameEntry {
  name: string;
  url: string;
}

export interface ItemDetail {
  id: number;
  name: string;
  cost: number;
  category: string;
  spriteUrl: string | null;
  effect: string | null;
  shortEffect: string | null;
  flavorText: string | null;
  flingPower: number | null;
  flingEffect: string | null;
  attributes: string[];
}

export type SpSpread = Record<"hp" | "atk" | "def" | "spa" | "spd", number>; // everything except Speed, which stays in speedSp

export interface TeamSlot {
  pokemon: PokemonDetail | null;
  itemName: string | null;
  abilityName: string | null;
  roleNotes: string | null;
  moves: (string | null)[];
  nature: NatureName | null;  
  speedSp: number;      
  spread: SpSpread;     
}

export interface PokemonMoveEntry {
  name: string; // PokeAPI slug, e.g. "close-combat"
}

export interface StrategyResult {
  narrative: string;        
  comboIndices: [number, number, number, number];
  generatedAt: number;
}


export interface TeamOffenseReport {
  superEffectiveAgainst: PokemonTypeName[];
  neutralOnly: PokemonTypeName[];
  resistedByAll: PokemonTypeName[];
  noEffectFromAll: PokemonTypeName[];
}

export interface TeamDefenseMatrixRow {
  name: string;
  types: PokemonTypeName[];
  cells: Record<PokemonTypeName, EffectivenessMultiplier>;
}

export interface TeamDefenseMatrix {
  rows: TeamDefenseMatrixRow[];
  weakCounts: Record<PokemonTypeName, number>; // members at 2x or worse, per attacking type
}

export interface OpponentSlot {
  pokemon: PokemonDetail | null;
  abilityName: string | null;
  itemName: string | null;
  megaFormDetail?: PokemonDetail | null;
}

export interface SavedTeam {
  id: string;
  name: string;
  savedAt: number;
  slots: TeamSlot[];
  teamStrategy: string;
}

export interface FieldState {
  weather: "none" | "rain" | "sun" | "sand" | "snow";
  terrain: "none" | "electric" | "grassy" | "misty" | "psychic";
  trickRoomTurnsLeft: number;
  tailwindTurnsLeft: { yours: number; opponents: number };
}

export type BattleSide = "yours" | "opponent";
export interface HpChange { side: BattleSide; name: string; pct: number } // pct > 0 = HP removed, pct < 0 = HP restored
export type HpState = Record<BattleSide, Record<string, number>>;       // missing name = 100
export type PerMon<T> = Record<BattleSide, Record<string, T>>;
export type StatusKind = "burn" | "poison" | "toxic" | "paralysis" | "sleep" | "freeze";
export type StatusState = PerMon<StatusKind>; // missing name = healthy
export interface StatusChange { side: BattleSide; name: string; prev: StatusKind | null; next: StatusKind | null }
export interface MonRef { side: BattleSide; name: string }
export type StageStat = "atk" | "def" | "spa" | "spd" | "spe";
export type StageState = PerMon<Partial<Record<StageStat, number>>>; // missing = 0
export interface StageChange { side: BattleSide; name: string; stat: StageStat; delta: number } 
export type ScreenKind = "reflect" | "lightScreen" | "auroraVeil";
export type ScreensState = Record<BattleSide, Record<ScreenKind, number>>; // turns left, 0 = not up

export interface BattleEvent {
  id: string;
  sentenceFragment: string; // e.g. "Swampert's Earthquake KO'd Kingambit" — composed by the UI, not typed
  switch?: { side: "yours" | "opponent"; out: string; in: string }; // set for Switch events so removing one can undo it
  faint?: { side: "yours" | "opponent"; name: string }[]; 
  damage?: HpChange[];
  status?: StatusChange[];  // so deleting the event restores the previous status
  consumed?: MonRef[]; 
  mega?: { side: BattleSide; name: string; prevWeather?: { weather: FieldState["weather"]; turnsLeft: number } };
  stages?: StageChange[];                                                   // entry effects (Intimidate...), reversed on undo
  clearedStages?: { side: BattleSide; name: string; stages: Partial<Record<StageStat, number>> }[]; // outgoing mon's stages, restored on undo
  fieldPrev?: Pick<FieldState, "weather" | "weatherTurnsLeft" | "terrain" | "terrainTurnsLeft">;    // field before a switch-in surge ability
  screen?: { side: BattleSide; kind: ScreenKind; turns: number; prev?: number };  // screen set by this event; prev = turns before, for undo
  protect?: { side: BattleSide; name: string; prev?: number };  
}

export interface FaintedMons {
  yours: string[];
  opponent: string[];
}

export interface BattleConversationTurn {
  role: "user" | "model";
  text: string;
}

export interface FieldState {
  weather: "none" | "rain" | "sun" | "sand" | "snow";
  weatherTurnsLeft: number;
  terrain: "none" | "electric" | "grassy" | "misty" | "psychic";
  terrainTurnsLeft: number;
  trickRoomTurnsLeft: number;
  tailwindTurnsLeft: { yours: number; opponents: number };
}

export interface ActiveBattlers {
  yours: (string | null)[];    // length 2 — your current leads
  opponent: (string | null)[]; // length 2 — opponent's current leads
}

export interface MoveDetail {
  name: string;
  target: string; // PokeAPI target.name, e.g. "selected-pokemon", "all-opponents", "user"
  damageClass: "physical" | "special" | "status";
  ailment: string | null; // meta.ailment.name, "none" normalized to null
}

export interface MoveNameEntry {
  name: string;
  url: string;
}

export interface BattleHistoryEntry {
  id: string;
  loggedAt: number;
  yourTeamNames: string[];       // the bring-4 actually used
  opponentTeamNames: string[];   // opponent's revealed team preview
  recommendedLead: string[];     // what Battle Optimizer suggested as lead, for reference
  outcome: "win" | "loss";
  reason: string;                // free text — what went right/wrong
  opponentLeads?: string[];
}

export interface MoveInfo {
  name: string;
  type: PokemonTypeName | null; // null for oddities like "stellar"
  damageClass: "physical" | "special" | "status";
  power: number | null;
  accuracy: number | null;
  pp: number | null;
  priority: number;
  target: string;
  effect: string | null;
  learnedBy: string[];
  minHits: number | null;
  maxHits: number | null;
  drain: number;          // % of damage dealt: positive = heals the user, negative = recoil
  healing: number;        // % of max HP restored
  critRate: number;       // 0 = normal, 1+ = raised crit stage
  flinchChance: number;   // %
  ailment: string | null; // e.g. "paralysis"
  ailmentChance: number;  // % (0 = no roll, for status moves)
}

export interface AbilityInfo {
  name: string;
  shortEffect: string | null;
  effect: string | null;
  pokemon: { name: string; isHidden: boolean }[];
}

export interface AbilityNameEntry {
  name: string;
  url: string;
}