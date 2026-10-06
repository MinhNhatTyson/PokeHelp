"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useOpponentTeamStore } from "@/lib/store/opponentTeamStore";
import { fetchPokemonNameList, fetchPokemonDetail, fetchCompetitiveItemNameList } from "@/lib/data/fetchAndCache";
import { ItemNameEntry, PokemonNameEntry } from "@/lib/types";
import TypeBadge from "@/components/TypeBadge";
import { getCommonSet, synthesizeMegaDetail } from "@/lib/data/commonSets";
import { useListNav } from "@/lib/hooks/useListNav";


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
  const setSlotMegaFormDetail = useOpponentTeamStore((s) => s.setSlotMegaFormDetail);

  const [itemQuery, setItemQuery] = useState("");
  const [itemNames, setItemNames] = useState<ItemNameEntry[]>([]);
  const [showItemDropdown, setShowItemDropdown] = useState(false);
  const setSlotItem = useOpponentTeamStore((s) => s.setSlotItem);

  const itemMatches = useMemo(() => {
  const q = itemQuery.trim().toLowerCase().replace(/ /g, "-");
  if (!q) return [];
  return itemNames.filter((i) => i.name.startsWith(q)).slice(0, MAX_SUGGESTIONS);
}, [itemQuery, itemNames]);

  useEffect(() => {
  fetchPokemonNameList().then(setPokeNames);
  fetchCompetitiveItemNameList().then(setItemNames);
}, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowPokeDropdown(false);
        setShowItemDropdown(false);
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

  const pokeNav = useListNav({
    items: pokeMatches,
    isOpen: showPokeDropdown,
    onSelect: (p) => handleSelectPokemon(p.name),
    onClose: () => setShowPokeDropdown(false),
    onOpen: () => setShowPokeDropdown(true),
  });
  const itemNav = useListNav({
    items: itemMatches,
    isOpen: showItemDropdown,
    onSelect: (i) => handleSelectItem(i.name),
    onClose: () => setShowItemDropdown(false),
    onOpen: () => setShowItemDropdown(true),
  });

  async function handleSelectPokemon(name: string) {
  setPokeQuery("");
  setShowPokeDropdown(false);
  setPokeLoading(true);
  const detail = await fetchPokemonDetail(name);
  setSlotPokemon(index, detail);

  if (detail) {
    const commonSet = getCommonSet(detail.name);
    if (commonSet) {
      const guessedItemSlug = commonSet.topItem.toLowerCase().replace(/\s+/g, "-");
      setSlotItem(index, guessedItemSlug);

      if (commonSet.megaForm) {
        // Guessed item IS the Mega Stone — assume turn-1 Mega Evolution by default.
        const megaDetail = (await fetchPokemonDetail(commonSet.megaForm.formSpecies))
        ?? synthesizeMegaDetail(detail, commonSet.megaForm);
        setSlotMegaFormDetail(index, megaDetail);
        setSlotAbility(index, commonSet.megaForm.formAbility); // a Mega has exactly one ability
      } else if (detail.abilities.some((a) => a.name === commonSet.likelyAbility)) {
        setSlotAbility(index, commonSet.likelyAbility);
      }
    }
  }
  setPokeLoading(false);
}

async function handleSelectItem(name: string) {
  setItemQuery("");
  setShowItemDropdown(false);
  setSlotItem(index, name);

  const mon = slot.pokemon;
  if (!mon) return;

  // Re-check the Mega assumption against the CONFIRMED item, not the guess.
  const commonSet = getCommonSet(mon.name);
  if (commonSet?.megaForm) {
    const isMegaStone = name === commonSet.topItem.toLowerCase().replace(/\s+/g, "-");
    if (isMegaStone) {
      const megaDetail = (await fetchPokemonDetail(commonSet.megaForm.formSpecies))
        ?? synthesizeMegaDetail(mon, commonSet.megaForm);
      setSlotMegaFormDetail(index, megaDetail);
      setSlotAbility(index, commonSet.megaForm.formAbility);
    } else {
      setSlotMegaFormDetail(index, null); // holding something else, so no Mega assumed
      // back to the normal (pre-Mega) ability
      setSlotAbility(index, mon.abilities.some((a) => a.name === commonSet.likelyAbility) ? commonSet.likelyAbility : null);
    }
  }
}

  const activeSet = slot.pokemon ? getCommonSet(slot.pokemon.name) : null;
  const megaActive = !!slot.megaFormDetail && !!activeSet?.megaForm;

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
            {...pokeNav.inputProps}
            value={pokeQuery}
            onChange={(e) => { setPokeQuery(e.target.value); setShowPokeDropdown(true); pokeNav.resetActive(); }}
            onFocus={() => setShowPokeDropdown(true)}
            placeholder="Search Pokémon…"
            autoComplete="off"
            className="w-full rounded-md border border-black/10 px-3 py-2 text-sm text-[color:var(--ink)] outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent-gold)]"
          />
          {pokeLoading && <p className="mt-1 text-xs opacity-60">Loading…</p>}
          {showPokeDropdown && pokeMatches.length > 0 && (
            <div className="absolute z-10 mt-1 max-h-56 w-full overflow-y-auto rounded-md border border-black/10 bg-white p-1 shadow-lg">
              {pokeMatches.map((p, i) => (
                <button
                  key={p.name}
                  type="button"
                  onClick={() => handleSelectPokemon(p.name)}
                  {...pokeNav.optionProps(i)}
                  className={`block w-full rounded-md px-2 py-1.5 text-left text-sm capitalize text-[color:var(--ink)] ${pokeNav.activeIndex === i ? "bg-black/10" : "hover:bg-black/5"}`}
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
            <label className="text-xs font-medium uppercase text-[color:var(--ink)]/40">
              {megaActive ? "Ability (Mega)" : "Guessed ability (optional)"}
            </label>
            {megaActive && activeSet?.megaForm ? (
              <>
                <div className="mt-1 flex min-h-[40px] items-center justify-between rounded-md border border-black/10 bg-black/5 px-3 py-2 text-sm capitalize text-[color:var(--ink)]">
                  <span>{activeSet.megaForm.formAbility.replace(/-/g, " ")}</span>
                  <span className="rounded-full bg-[color:var(--accent-gold)] px-2 py-0.5 text-[10px] font-semibold uppercase text-black">Mega</span>
                </div>
                <p className="mt-1.5 text-xs text-[color:var(--ink)]/50">
                  Mega Evolves via {activeSet.topItem}. A Mega has exactly one ability, so it&apos;s locked. Change the item to undo.
                </p>
              </>
            ) : (
              <>
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
                {activeSet?.megaForm && (
                  <p className="mt-1.5 text-xs text-[color:var(--ink)]/50">
                    Can Mega Evolve via {activeSet.topItem} → <span className="capitalize">{activeSet.megaForm.formAbility.replace(/-/g, " ")}</span>
                  </p>
                )}
              </>
            )}
          </div>

          <div className="relative mt-3">
            <label className="text-xs font-medium uppercase text-[color:var(--ink)]/40">Guessed item (optional)</label>
            <input
              value={slot.itemName ? slot.itemName.replace(/-/g, " ") : itemQuery}
              onChange={(e) => { setItemQuery(e.target.value); setSlotItem(index, null); setShowItemDropdown(true); }}
              onFocus={() => setShowItemDropdown(true)}
              placeholder="Search item…"
              autoComplete="off"
              className="mt-1 w-full rounded-md border border-black/10 px-3 py-2 text-sm capitalize text-[color:var(--ink)] outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent-gold)]"
            />
            {showItemDropdown && itemMatches.length > 0 && (
              <div className="absolute z-10 mt-1 max-h-56 w-full overflow-y-auto rounded-md border border-black/10 bg-white p-1 shadow-lg">
                {itemMatches.map((i) => (
                  <button
                    key={i.name}
                    type="button"
                    onClick={() => handleSelectItem(i.name)}
                    className="block w-full rounded-md px-2 py-1.5 text-left text-sm capitalize text-[color:var(--ink)] hover:bg-black/5"
                  >
                    {i.name.replace(/-/g, " ")}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}