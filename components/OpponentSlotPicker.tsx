"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useOpponentTeamStore } from "@/lib/store/opponentTeamStore";
import { fetchPokemonNameList, fetchPokemonDetail } from "@/lib/data/fetchAndCache";
import { PokemonNameEntry } from "@/lib/types";
import TypeBadge from "@/components/TypeBadge";
import { getCommonSet } from "@/lib/data/commonSets";

const MAX_SUGGESTIONS = 8;

export default function OpponentSlotPicker({ index }: { index: number }) {
  const slot = useOpponentTeamStore((s) => s.slots[index]);
  const setSlotPokemon = useOpponentTeamStore((s) => s.setSlotPokemon);
  const setSlotAbility = useOpponentTeamStore((s) => s.setSlotAbility);
  const clearSlot = useOpponentTeamStore((s) => s.clearSlot);

  const [pokeQuery, setPokeQuery] = useState("");
  const [pokeNames, setPokeNames] = useState<PokemonNameEntry[]>([]);
  const [pokeLoading, setPokeLoading] = useState(false);
  const [showPokeDropdown, setShowPokeDropdown] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchPokemonNameList().then(setPokeNames);
  }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowPokeDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const pokeMatches = useMemo(() => {
    const q = pokeQuery.trim().toLowerCase();
    if (!q) return [];
    return pokeNames.filter((p) => p.name.startsWith(q)).slice(0, MAX_SUGGESTIONS);
  }, [pokeQuery, pokeNames]);

  async function handleSelectPokemon(name: string) {
    setPokeQuery("");
    setShowPokeDropdown(false);
    setPokeLoading(true);
    const detail = await fetchPokemonDetail(name);
    setSlotPokemon(index, detail);
    if (detail) {
      const commonSet = getCommonSet(detail.name);
      const matchesLegalAbility = commonSet && detail.abilities.some((a) => a.name === commonSet.likelyAbility);
      if (matchesLegalAbility) setSlotAbility(index, commonSet.likelyAbility);
    }
    setPokeLoading(false);
  }

  return (
    <div ref={containerRef} className="rounded-lg border border-black/10 bg-white p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase text-[color:var(--ink)]/40">Opponent {index + 1}</span>
        {slot.pokemon && (
          <button type="button" onClick={() => clearSlot(index)} className="text-xs text-[color:var(--ink)]/50 hover:underline">
            Clear
          </button>
        )}
      </div>

      {!slot.pokemon ? (
        <div className="relative mt-2">
          <input
            value={pokeQuery}
            onChange={(e) => { setPokeQuery(e.target.value); setShowPokeDropdown(true); }}
            onFocus={() => setShowPokeDropdown(true)}
            placeholder="Search Pokémon…"
            autoComplete="off"
            className="w-full rounded-md border border-black/10 px-3 py-2 text-sm text-[color:var(--ink)] outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent-gold)]"
          />
          {pokeLoading && <p className="mt-1 text-xs opacity-60">Loading…</p>}
          {showPokeDropdown && pokeMatches.length > 0 && (
            <div className="absolute z-10 mt-1 max-h-56 w-full overflow-y-auto rounded-md border border-black/10 bg-white p-1 shadow-lg">
              {pokeMatches.map((p) => (
                <button
                  key={p.name}
                  type="button"
                  onClick={() => handleSelectPokemon(p.name)}
                  className="block w-full rounded-md px-2 py-1.5 text-left text-sm capitalize text-[color:var(--ink)] hover:bg-black/5"
                >
                  {p.name}
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="mt-2">
          <div className="flex items-center gap-2">
            {(slot.pokemon.artworkUrl ?? slot.pokemon.spriteUrl) && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={slot.pokemon.artworkUrl ?? slot.pokemon.spriteUrl ?? ""} alt={slot.pokemon.name} className="h-12 w-12 object-contain" />
            )}
            <div>
              <p className="text-sm font-medium capitalize text-[color:var(--ink)]">{slot.pokemon.name}</p>
              <div className="mt-0.5 flex gap-1">
                {slot.pokemon.types.map((t) => <TypeBadge key={t} type={t} size="sm" />)}
              </div>
            </div>
          </div>

          <div className="mt-3">
            <label className="text-xs font-medium uppercase text-[color:var(--ink)]/40">Guessed ability (optional)</label>
            <select
              value={slot.abilityName ?? ""}
              onChange={(e) => setSlotAbility(index, e.target.value || null)}
              className="mt-1 w-full rounded-md border border-black/10 bg-white px-3 py-2 text-sm capitalize text-[color:var(--ink)] outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent-gold)]"
            >
              <option value="">Not sure / unknown</option>
              {slot.pokemon.abilities.map((a) => (
                <option key={a.name} value={a.name}>
                  {a.name.replace(/-/g, " ")}{a.isHidden ? " (hidden)" : ""}
                </option>
              ))}
            </select>
            {(() => {
              const commonSet = getCommonSet(slot.pokemon!.name);
              return commonSet ? (
                <p className="mt-1.5 text-xs text-[color:var(--ink)]/50">
                  Commonly runs: <span className="capitalize">{commonSet.commonMoves.join(", ").toLowerCase()}</span> · {commonSet.topItem}
                </p>
              ) : null;
            })()}
          </div>
        </div>
      )}
    </div>
  );
}