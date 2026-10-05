"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { POKEMON_TYPES, PokemonTypeName, PokemonNameEntry, PokemonDetail } from "@/lib/types";
import { TYPE_COLOR, TYPE_LABEL } from "@/lib/typeMeta";
import { getTypeMatchup } from "@/lib/logic/effectiveness";
import { fetchPokemonNameList, fetchPokemonDetail } from "@/lib/data/fetchAndCache";
import TypeBadge from "@/components/TypeBadge";
import PokemonResultCard from "@/components/PokemonResultCard";
import TypeChip from "./TypeChip";
import { useBackdropStore } from "@/lib/store/backdropStore";
import { useListNav } from "@/lib/hooks/useListNav";
import { useRouter, useSearchParams } from "next/navigation";

const MAX_TYPE_SUGGESTIONS = 5;
const MAX_NAME_SUGGESTIONS = 8;
const TONE_CLASS = {
  super: "effect-banner--super",
  weak: "effect-banner--weak",
  "not-very": "effect-banner--not-very",
  resist: "effect-banner--resist",
  none: "effect-banner--none",
} as const;

function EffectGroup({
  tone, title, mult, types, onPick,
}: {
  tone: keyof typeof TONE_CLASS; title: string; mult: string;
  types: PokemonTypeName[]; onPick: (t: PokemonTypeName) => void;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-black/10">
      <div className={`effect-banner ${TONE_CLASS[tone]}`}>
        <span>{title}</span><span className="font-dex opacity-90">{mult}</span>
      </div>
      <div className="flex flex-wrap gap-2 bg-black/5 p-3">
        {types.length > 0
          ? types.map((t) => <TypeChip key={t} type={t} onClick={onPick} />)
          : <span className="text-sm italic text-[color:var(--ink)]/40">None</span>}
      </div>
    </div>
  );
}

export default function TypeMatchupExplorer() {
  const [query, setQuery] = useState("");
  const [selectedType, setSelectedType] = useState<PokemonTypeName>("fire");
  const router = useRouter();
  const searchParams = useSearchParams();
  const pokemonSlug = searchParams.get("pokemon");
  const [pokemonResult, setPokemonResult] = useState<{ slug: string; detail: PokemonDetail | null } | null>(null);
  // Derived from the URL, so there is no synchronous setState in an effect
  const selectedPokemon = pokemonResult && pokemonResult.slug === pokemonSlug ? pokemonResult.detail : null;
  const pokemonStatus: "idle" | "loading" | "error" = !pokemonSlug
    ? "idle"
    : pokemonResult?.slug !== pokemonSlug
    ? "loading"
    : pokemonResult?.detail
    ? "idle"
    : "error";

  useEffect(() => {
    if (!pokemonSlug) return;
    let cancelled = false;
    fetchPokemonDetail(pokemonSlug)
      .catch(() => null)
      .then((detail) => { if (!cancelled) setPokemonResult({ slug: pokemonSlug, detail }); });
    return () => { cancelled = true; };
  }, [pokemonSlug]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [nameList, setNameList] = useState<PokemonNameEntry[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const setBackdrop = useBackdropStore((s) => s.setOverride);
  const pingDex = useBackdropStore((s) => s.pingDex);

  type Suggestion = { kind: "type"; type: PokemonTypeName } | { kind: "pokemon"; name: string };

  useEffect(() => {
    const type = selectedPokemon ? selectedPokemon.types[0] : selectedType;
    setBackdrop(type);
    pingDex(type);
    return () => setBackdrop(null);
  }, [selectedType, selectedPokemon, setBackdrop, pingDex]);
  useEffect(() => () => pingDex(null), [pingDex]); // clear only when leaving the page

  useEffect(() => {
    fetchPokemonNameList().then(setNameList);
  }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const typeMatches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return POKEMON_TYPES.filter((t) => TYPE_LABEL[t].toLowerCase().includes(q)).slice(0, MAX_TYPE_SUGGESTIONS);
  }, [query]);

  const nameMatches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return nameList.filter((p) => p.name.startsWith(q)).slice(0, MAX_NAME_SUGGESTIONS);
  }, [query, nameList]);

  const suggestions = useMemo<Suggestion[]>(
    () => [
      ...typeMatches.map((type) => ({ kind: "type" as const, type })),
      ...nameMatches.map((p) => ({ kind: "pokemon" as const, name: p.name })),
    ],
    [typeMatches, nameMatches]
  );

  const nav = useListNav({
    items: suggestions,
    isOpen: showDropdown && !!query.trim(),
    onSelect: (s) => (s.kind === "type" ? handleSelectType(s.type) : handleSelectPokemon(s.name)),
    onClose: () => setShowDropdown(false),
    onOpen: () => setShowDropdown(true),
  });

  const matchup = useMemo(() => getTypeMatchup(selectedType), [selectedType]);

  function handleSelectPokemon(name: string) {
    setQuery("");
    setShowDropdown(false);
    router.push(`/?pokemon=${name}`);
  }

  function handleSelectType(type: PokemonTypeName) {
    setQuery("");
    setShowDropdown(false);
    setSelectedType(type);
    if (pokemonSlug) router.push("/"); // leave the Pokémon view
  }

  const hasSuggestions = suggestions.length > 0;

  return (
    <div
      ref={containerRef}
      className="w-full max-w-3xl rounded-2xl border-4 border-[color:var(--shell)] bg-[color:var(--shell)] shadow-none"
    >
      <div className="h-2 rounded-t-lg bg-[color:var(--shell-accent)]" />

      <div className="rounded-b-lg bg-[color:var(--screen)] p-6 sm:p-8">
        <h1 className="font-logo text-2xl sm:text-3xl text-[color:var(--ink)]">
          Type &amp; Pokémon lookup
        </h1>
        <p className="mt-1 text-sm text-[color:var(--ink)]/70">
          Search a type or a Pokémon by name.
        </p>

        <div className="relative mt-5">
          <label htmlFor="unified-search" className="sr-only">
            Search for a type or Pokémon
          </label>
          <input
            {...nav.inputProps}
            id="unified-search"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setShowDropdown(true); nav.resetActive(); }}
            onFocus={() => setShowDropdown(true)}
            placeholder="Search types or Pokémon…"
            autoComplete="off"
            className="w-full rounded-lg border border-black/10 bg-white px-4 py-2.5 text-[color:var(--ink)] outline-none placeholder:text-black/40 focus-visible:ring-2 focus-visible:ring-[color:var(--accent-gold)]"
          />

          {showDropdown && query.trim() && (
            <div className="absolute z-10 mt-1 w-full overflow-hidden rounded-lg border border-black/10 bg-white shadow-lg">
              {!hasSuggestions && (
                <p className="px-4 py-3 text-sm text-[color:var(--ink)]/50">
                  No types or Pokémon match &quot;{query}&quot;.
                </p>
              )}

              {typeMatches.length > 0 && (
                <div className="border-b border-black/5 p-2">
                  <p className="px-2 pb-1 text-xs font-medium uppercase text-[color:var(--ink)]/40">Types</p>
                  <div className="flex flex-wrap gap-1.5 px-2">
                    {typeMatches.map((t, i) => (
                      <button key={t} type="button" onClick={() => handleSelectType(t)} {...nav.optionProps(i)}
                        className={`cursor-pointer rounded-full ${nav.activeIndex === i ? "ring-2 ring-[color:var(--ink)]" : ""}`}>
                        <TypeBadge type={t} size="sm" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {nameMatches.length > 0 && (
                <div className="max-h-64 overflow-y-auto p-2">
                  <p className="px-2 pb-1 text-xs font-medium uppercase text-[color:var(--ink)]/40">Pokémon</p>
                  {nameMatches.map((p, i) => {
                    const idx = typeMatches.length + i; 
                    return (
                      <button key={p.name} type="button" onClick={() => handleSelectPokemon(p.name)} {...nav.optionProps(idx)}
                        className={`block w-full cursor-pointer rounded-md px-2 py-1.5 text-left text-sm capitalize text-[color:var(--ink)] ${nav.activeIndex === idx ? "bg-black/10" : "hover:bg-black/5"}`}>
                        {p.name}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {pokemonStatus === "loading" && (
          <p className="mt-4 text-sm text-[color:var(--ink)]/60">Loading Pokémon…</p>
        )}
        {pokemonStatus === "error" && (
          <p className="mt-4 text-sm text-red-500">Couldn&apos;t load that Pokémon. Try another search.</p>
        )}

        {selectedPokemon ? (
          <div className="mt-6">
            <button
              type="button"
              onClick={() => router.push("/")}
              className="mb-4 text-sm text-[color:var(--ink)]/60 underline-offset-2 hover:underline"
            >
              ← Back to type matchups
            </button>
            <PokemonResultCard pokemon={selectedPokemon} onSelectForm={handleSelectPokemon} />
          </div>
        ) : (
          <>
            <div className="mt-4 flex flex-wrap gap-2">
              {POKEMON_TYPES.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => handleSelectType(t)}
                  aria-pressed={t === selectedType}
                  className={`rounded-full outline-none transition-transform motion-reduce:transition-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent-gold)] ${
                    t === selectedType ? "scale-105 ring-2 ring-[color:var(--ink)]" : ""
                  }`}
                >
                  <TypeBadge type={t} />
                </button>
              ))}
            </div>

            <div className="mt-8 flex items-center gap-3 border-t border-black/10 pt-6">
              <span className="text-sm text-[color:var(--ink)]/60">Selected:</span>
              <TypeBadge type={selectedType} size="lg" />
            </div>

            <div className="pokecard mt-6 overflow-hidden" style={{ borderColor: TYPE_COLOR[selectedType] }}>
              <div className="grid divide-y divide-black/10 sm:grid-cols-2 sm:divide-x sm:divide-y-0">
                <section>
                  <h2 className="px-4 pt-3 font-heading text-base text-[color:var(--ink)]">Attacking</h2>
                  <div className="space-y-3 p-4">
                    <EffectGroup tone="super" title="Super effective" mult="×2" types={matchup.attack.superEffectiveAgainst} onPick={handleSelectType} />
                    <EffectGroup tone="not-very" title="Not very effective" mult="×½" types={matchup.attack.notVeryEffectiveAgainst} onPick={handleSelectType} />
                    <EffectGroup tone="none" title="No effect" mult="×0" types={matchup.attack.noEffectAgainst} onPick={handleSelectType} />
                  </div>
                </section>
                <section>
                  <h2 className="px-4 pt-3 font-heading text-base text-[color:var(--ink)]">Defending</h2>
                  <div className="space-y-3 p-4">
                    <EffectGroup tone="weak" title="Weak to" mult="×2" types={matchup.defense.weakTo} onPick={handleSelectType} />
                    <EffectGroup tone="resist" title="Resists" mult="×½" types={matchup.defense.resists} onPick={handleSelectType} />
                    <EffectGroup tone="none" title="Immune" mult="×0" types={matchup.defense.immuneTo} onPick={handleSelectType} />
                  </div>
                </section>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}