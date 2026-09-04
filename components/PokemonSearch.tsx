"use client";

import { useEffect, useState } from "react";
import { fetchPokemon } from "@/lib/data/fetchAndCache";
import { getDualDefenseProfile } from "@/lib/logic/effectiveness";
import { Pokemon } from "@/lib/types";
import TypeBadge from "@/components/TypeBadge";

const GROUPS = [
  { key: "quad", label: "4x Weak" },
  { key: "double", label: "2x Weak" },
  { key: "half", label: "0.5x Resist" },
  { key: "quarter", label: "0.25x Resist" },
  { key: "immune", label: "Immune" },
] as const;

export default function PokemonSearch() {
  const [query, setQuery] = useState("");
  const [pokemon, setPokemon] = useState<Pokemon | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setPokemon(null);
      setStatus("idle");
      return;
    }

    const handle = setTimeout(async () => {
      setStatus("loading");
      const result = await fetchPokemon(trimmed);
      if (result) {
        setPokemon(result);
        setStatus("idle");
      } else {
        setPokemon(null);
        setStatus("error");
      }
    }, 350);

    return () => clearTimeout(handle);
  }, [query]);

  const defense = pokemon
    ? getDualDefenseProfile(pokemon.types[0], pokemon.types[1])
    : null;

  return (
    <div className="w-full max-w-md">
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search a Pokémon by name..."
        className="w-full rounded-md border border-[color:var(--shell-accent)] bg-[color:var(--screen)] px-3 py-2 text-[color:var(--ink)]"
      />

      {status === "loading" && <p className="mt-2 text-sm opacity-70">Searching…</p>}
      {status === "error" && (
        <p className="mt-2 text-sm text-red-400">No Pokémon found for &quot;{query}&quot;.</p>
      )}

      {pokemon && defense && (
        <div className="mt-4 rounded-lg bg-[color:var(--shell)] p-4">
          <div className="flex items-center gap-3">
            {pokemon.spriteUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={pokemon.spriteUrl} alt={pokemon.name} className="h-16 w-16" />
            )}
            <div>
              <p className="font-display capitalize">{pokemon.name}</p>
              <div className="mt-1 flex gap-1">
                {pokemon.types.map((t) => (
                  <TypeBadge key={t} type={t} size="sm" />
                ))}
              </div>
            </div>
          </div>

          <div className="mt-4 space-y-2">
            {GROUPS.map(({ key, label }) => {
              const types = defense[key];
              if (types.length === 0) return null;
              return (
                <div key={key}>
                  <p className="text-xs uppercase opacity-60">{label}</p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {types.map((t) => (
                      <TypeBadge key={t} type={t} size="sm" />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}