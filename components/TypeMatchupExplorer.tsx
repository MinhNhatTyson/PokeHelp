"use client";

import { useMemo, useState } from "react";
import { POKEMON_TYPES, PokemonTypeName } from "@/lib/types";
import { TYPE_LABEL } from "@/lib/typeMeta";
import { getTypeMatchup } from "@/lib/logic/effectiveness";
import TypeBadge from "@/components/TypeBadge";

function BadgeRow({
  types,
  onSelect,
}: {
  types: PokemonTypeName[];
  onSelect: (type: PokemonTypeName) => void;
}) {
  if (types.length === 0) {
    return <p className="text-sm text-[color:var(--ink)]/50">None</p>;
  }
  return (
    <div className="flex flex-wrap gap-2">
      {types.map((t) => (
        <button
          key={t}
          type="button"
          onClick={() => onSelect(t)}
          aria-label={`View ${TYPE_LABEL[t]} type matchups`}
          className="cursor-pointer rounded-full outline-none transition-transform hover:scale-105 motion-reduce:transition-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent-gold)]"
        >
          <TypeBadge type={t} size="sm" />
        </button>
      ))}
    </div>
  );
}

export default function TypeMatchupExplorer() {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<PokemonTypeName>("fire");

  const filteredTypes = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return POKEMON_TYPES;
    return POKEMON_TYPES.filter((t) => TYPE_LABEL[t].toLowerCase().includes(q));
  }, [query]);

  const matchup = useMemo(() => getTypeMatchup(selected), [selected]);

  return (
    <div className="w-full max-w-3xl rounded-2xl border-4 border-[color:var(--shell)] bg-[color:var(--shell)] shadow-none">
      <div className="h-2 rounded-t-lg bg-[color:var(--shell-accent)]" />

      <div className="rounded-b-lg bg-[color:var(--screen)] p-6 sm:p-8">
        <h1 className="font-display text-2xl sm:text-3xl text-[color:var(--ink)]">
          Type matchups
        </h1>
        <p className="mt-1 text-sm text-[color:var(--ink)]/70">
          Pick a type to see what it hits hard and what hits it hard.
        </p>

        <label htmlFor="type-search" className="sr-only">
          Search for a type
        </label>
        <input
          id="type-search"
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search types…"
          className="mt-5 w-full rounded-lg border border-black/10 bg-white px-4 py-2.5 text-[color:var(--ink)] outline-none placeholder:text-black/40 focus-visible:ring-2 focus-visible:ring-[color:var(--accent-gold)]"
        />

        <div className="mt-4 flex flex-wrap gap-2">
          {filteredTypes.map((t) => {
            const isSelected = t === selected;
            return (
              <button
                key={t}
                type="button"
                onClick={() => setSelected(t)}
                aria-pressed={isSelected}
                className={`rounded-full outline-none transition-transform motion-reduce:transition-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent-gold)] ${
                  isSelected ? "scale-105 ring-2 ring-[color:var(--ink)]" : ""
                }`}
              >
                <TypeBadge type={t} />
              </button>
            );
          })}
          {filteredTypes.length === 0 && (
            <p className="text-sm text-[color:var(--ink)]/50">No types match &quot;{query}&quot;.</p>
          )}
        </div>

        <div className="mt-8 flex items-center gap-3 border-t border-black/10 pt-6">
          <span className="text-sm text-[color:var(--ink)]/60">Selected:</span>
          <TypeBadge type={selected} size="lg" />
        </div>

        <div className="mt-6 grid gap-8 sm:grid-cols-2">
          <section>
            <h2 className="font-display text-lg text-[color:var(--ink)]">Attacking</h2>
            <div className="mt-3 space-y-4">
              <div>
                <p className="text-sm font-medium text-[color:var(--ink)]/70">Super effective against</p>
                <div className="mt-1.5">
                  <BadgeRow types={matchup.attack.superEffectiveAgainst} onSelect={setSelected} />
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-[color:var(--ink)]/70">Not very effective against</p>
                <div className="mt-1.5">
                  <BadgeRow types={matchup.attack.notVeryEffectiveAgainst} onSelect={setSelected} />
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-[color:var(--ink)]/70">No effect on</p>
                <div className="mt-1.5"><BadgeRow types={matchup.attack.noEffectAgainst} onSelect={setSelected} /></div>
              </div>
            </div>
          </section>

          <section>
            <h2 className="font-display text-lg text-[color:var(--ink)]">Defending</h2>
            <div className="mt-3 space-y-4">
              <div>
                <p className="text-sm font-medium text-[color:var(--ink)]/70">Weak to</p>
                <div className="mt-1.5"><BadgeRow types={matchup.defense.weakTo} onSelect={setSelected} /></div>
              </div>
              <div>
                <p className="text-sm font-medium text-[color:var(--ink)]/70">Resists</p>
                <div className="mt-1.5"><BadgeRow types={matchup.defense.resists} onSelect={setSelected} /></div>
              </div>
              <div>
                <p className="text-sm font-medium text-[color:var(--ink)]/70">Immune to</p>
                <div className="mt-1.5"><BadgeRow types={matchup.defense.immuneTo} onSelect={setSelected} /></div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}