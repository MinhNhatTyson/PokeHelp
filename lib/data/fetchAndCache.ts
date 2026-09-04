import { Pokemon, PokemonTypeName } from "@/lib/types";

const POKEAPI_BASE = "https://pokeapi.co/api/v2";

const cache = new Map<string, Pokemon>();

interface PokeApiTypeSlot {
  slot: number;
  type: { name: string; url: string };
}

interface PokeApiPokemonResponse {
  id: number;
  name: string;
  sprites: { front_default: string | null };
  types: PokeApiTypeSlot[];
}

export async function fetchPokemon(nameOrId: string): Promise<Pokemon | null> {
  const key = nameOrId.trim().toLowerCase();
  if (!key) return null;

  const cached = cache.get(key);
  if (cached) return cached;

  const res = await fetch(`${POKEAPI_BASE}/pokemon/${key}`);
  if (!res.ok) return null;

  const data: PokeApiPokemonResponse = await res.json();

  const pokemon: Pokemon = {
    id: data.id,
    name: data.name,
    spriteUrl: data.sprites.front_default,
    types: data.types
      .sort((a, b) => a.slot - b.slot)
      .map((t) => t.type.name as PokemonTypeName),
  };

  cache.set(key, pokemon);
  cache.set(String(pokemon.id), pokemon);
  return pokemon;
}