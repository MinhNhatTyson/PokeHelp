import { Pokemon, PokemonTypeName, PokemonNameEntry, PokemonDetail, EvolutionStage } from "@/lib/types";

const POKEAPI_BASE = "https://pokeapi.co/api/v2";

const pokemonCache = new Map<string, Pokemon>();
const detailCache = new Map<string, PokemonDetail>();
let nameListPromise: Promise<PokemonNameEntry[]> | null = null;

const abilityDescCache = new Map<string, string | null>();

interface PokeApiAbilityResponse {
  effect_entries: { effect: string; short_effect: string; language: { name: string } }[];
}

async function fetchAbilityDescription(name: string): Promise<string | null> {
  const cached = abilityDescCache.get(name);
  if (cached !== undefined) return cached;

  try {
    const res = await fetch(`${POKEAPI_BASE}/ability/${name}`);
    if (!res.ok) throw new Error("ability fetch failed");
    const data: PokeApiAbilityResponse = await res.json();
    const entry = data.effect_entries.find((e) => e.language.name === "en");
    const description = entry?.short_effect ?? entry?.effect ?? null;
    abilityDescCache.set(name, description);
    return description;
  } catch {
    abilityDescCache.set(name, null);
    return null;
  }
}

interface PokeApiTypeSlot {
  slot: number;
  type: { name: string; url: string };
}

interface PokeApiPokemonResponse {
  id: number;
  name: string;
  height: number;
  weight: number;
  species: { name: string; url: string };
  sprites: {
    front_default: string | null;
    other?: { "official-artwork"?: { front_default: string | null } };
  };
  types: PokeApiTypeSlot[];
  abilities: { ability: { name: string }; is_hidden: boolean }[];
  stats: { base_stat: number; stat: { name: string } }[];
}

interface PokeApiSpeciesResponse {
  genera: { genus: string; language: { name: string } }[];
  egg_groups: { name: string }[];
  varieties: { is_default: boolean; pokemon: { name: string; url: string } }[];
  evolution_chain: { url: string };
}

interface PokeApiEvolutionChainLink {
  species: { name: string };
  evolves_to: PokeApiEvolutionChainLink[];
}

interface PokeApiEvolutionChainResponse {
  chain: PokeApiEvolutionChainLink;
}

interface PokeApiListResponse {
  results: { name: string; url: string }[];
}

export async function fetchPokemonNameList(): Promise<PokemonNameEntry[]> {
  if (!nameListPromise) {
    nameListPromise = fetch(`${POKEAPI_BASE}/pokemon?limit=100000`)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error("name list fetch failed"))))
      .then((data: PokeApiListResponse) => data.results)
      .catch(() => {
        nameListPromise = null; // allow retry next call
        return [];
      });
  }
  return nameListPromise;
}

export async function fetchPokemon(nameOrId: string): Promise<Pokemon | null> {
  const key = nameOrId.trim().toLowerCase();
  if (!key) return null;

  const cached = pokemonCache.get(key);
  if (cached) return cached;

  const res = await fetch(`${POKEAPI_BASE}/pokemon/${key}`);
  if (!res.ok) return null;

  const data: PokeApiPokemonResponse = await res.json();
  const pokemon: Pokemon = {
    id: data.id,
    name: data.name,
    spriteUrl: data.sprites.front_default,
    types: data.types.sort((a, b) => a.slot - b.slot).map((t) => t.type.name as PokemonTypeName),
  };
  

  pokemonCache.set(key, pokemon);
  pokemonCache.set(String(pokemon.id), pokemon);
  return pokemon;
}

function flattenEvolutionChain(link: PokeApiEvolutionChainLink): EvolutionStage[] {
  const stages: EvolutionStage[] = [];
  let level: PokeApiEvolutionChainLink[] = [link];

  while (level.length > 0) {
    stages.push({ names: level.map((l) => l.species.name) });
    level = level.flatMap((l) => l.evolves_to);
  }

  return stages;
}

export async function fetchPokemonDetail(nameOrId: string): Promise<PokemonDetail | null> {
  const key = nameOrId.trim().toLowerCase();
  if (!key) return null;

  const cached = detailCache.get(key);
  if (cached) return cached;

  const pokeRes = await fetch(`${POKEAPI_BASE}/pokemon/${key}`);
  if (!pokeRes.ok) return null;
  const pokeData: PokeApiPokemonResponse = await pokeRes.json();

  const speciesRes = await fetch(pokeData.species.url);
  if (!speciesRes.ok) return null;
  const speciesData: PokeApiSpeciesResponse = await speciesRes.json();

  let evolutionChain: EvolutionStage[] = [];
  try {
    const evoRes = await fetch(speciesData.evolution_chain.url);
    if (evoRes.ok) {
      const evoData: PokeApiEvolutionChainResponse = await evoRes.json();
      evolutionChain = flattenEvolutionChain(evoData.chain);
    }
  } catch {
    evolutionChain = [];
  }

  const genus = speciesData.genera.find((g) => g.language.name === "en")?.genus ?? null;
  
  const abilities = await Promise.all(
    pokeData.abilities.map(async (a) => ({
      name: a.ability.name,
      isHidden: a.is_hidden,
      description: await fetchAbilityDescription(a.ability.name),
    }))
  );
  const detail: PokemonDetail = {
    id: pokeData.id,
    dexNumber: pokeData.id,
    name: pokeData.name,
    spriteUrl: pokeData.sprites.front_default,
    artworkUrl: pokeData.sprites.other?.["official-artwork"]?.front_default ?? null,
    types: pokeData.types.sort((a, b) => a.slot - b.slot).map((t) => t.type.name as PokemonTypeName),
    genus,
    heightM: pokeData.height / 10,
    weightKg: pokeData.weight / 10,
    abilities,
    stats: pokeData.stats.map((s) => ({ name: s.stat.name, baseStat: s.base_stat })),
    eggGroups: speciesData.egg_groups.map((g) => g.name),
    forms: speciesData.varieties.map((v) => ({ name: v.pokemon.name, isDefault: v.is_default })),
    evolutionChain,
  };

  detailCache.set(key, detail);
  detailCache.set(String(detail.id), detail);
  return detail;
}