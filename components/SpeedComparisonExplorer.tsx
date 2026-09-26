"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTeamStore } from "@/lib/store/teamStore";
import { fetchPokemonNameList, fetchPokemonDetail } from "@/lib/data/fetchAndCache";
import { PokemonDetail, PokemonNameEntry } from "@/lib/types";
import { calculateEffectiveSpeed } from "@/lib/logic/statCalc";
import { getSpeedVariants } from "@/lib/logic/speedVariants";
import TypeBadge from "@/components/TypeBadge";

const MAX_SUGGESTIONS = 8;

export default function SpeedComparisonExplorer() {
  const slots = useTeamStore((s) => s.slots);
  const builtSlots = slots.filter((s) => s.pokemon);

  const [ownIndex, setOwnIndex] = useState<number | null>(null);

  const [query, setQuery] = useState("");
  const [nameList, setNameList] = useState<PokemonNameEntry[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [opponent, setOpponent] = useState<PokemonDetail | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => { fetchPokemonNameList().then(setNameList); }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setShowDropdown(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const nameMatches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return nameList.filter((p) => p.name.startsWith(q)).slice(0, MAX_SUGGESTIONS);
  }, [query, nameList]);

  async function handleSelectOpponent(name: string) {
    setQuery("");
    setShowDropdown(false);
    setStatus("loading");
    const detail = await fetchPokemonDetail(name);
    if (detail) { setOpponent(detail); setStatus("idle"); } else { setOpponent(null); setStatus("error"); }
  }

  const ownSlot = ownIndex !== null ? builtSlots[ownIndex] : null;
  const ownSpeed = ownSlot?.pokemon
    ? calculateEffectiveSpeed(
        ownSlot.pokemon.stats.find((s) => s.name === "speed")?.baseStat ?? 0,
        ownSlot.speedEv, ownSlot.nature, ownSlot.itemName
      )
    : null;

  const variants = opponent ? getSpeedVariants(opponent) : [];
  // Weighted sum: full credit for variants you outspeed, half credit for
  // ties (speed ties resolve 50/50), zero for variants that outspeed you.
  const chanceFaster =
    ownSpeed !== null && variants.length > 0
      ? Math.round(
          variants.reduce((sum, v) => {
            if (ownSpeed > v.speed) return sum + v.likelihood;
            if (ownSpeed === v.speed) return sum + v.likelihood / 2;
            return sum;
          }, 0)
        )
      : null;

  return (
    <div className="w-full max-w-3xl rounded-2xl border-4 border-[color:var(--shell)] bg-[color:var(--shell)] shadow-none">
      <div className="h-2 rounded-t-lg bg-[color:var(--shell-accent)]" />
      <div className="rounded-b-lg bg-[color:var(--screen)] p-6 sm:p-8">
        <h1 className="font-display text-2xl sm:text-3xl text-[color:var(--ink)]">Speed check</h1>
        <p className="mt-1 text-sm text-[color:var(--ink)]/70">
          Compare one of your built mons against likely Speed spreads for any Pokémon.
        </p>

        {builtSlots.length === 0 ? (
          <p className="mt-4 rounded-md bg-black/5 px-4 py-3 text-sm text-[color:var(--ink)]/70">
            Build at least one Pokémon (with Nature + Speed EVs set) in Team Builder first.
          </p>
        ) : (
          <div className="mt-4">
            <p className="text-xs font-medium uppercase text-[color:var(--ink)]/40">Your mon</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {builtSlots.map((s, i) => (
                <button
                  key={s.pokemon!.name}
                  type="button"
                  onClick={() => setOwnIndex(i)}
                  className={`rounded-full px-3 py-1 text-sm capitalize ${
                    ownIndex === i ? "bg-[color:var(--shell-accent)] text-white" : "bg-black/10 text-[color:var(--ink)]"
                  }`}
                >
                  {s.pokemon!.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <div ref={containerRef} className="relative mt-5">
          <label htmlFor="speed-search" className="sr-only">Search opponent Pokémon</label>
          <input
            id="speed-search"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setShowDropdown(true); }}
            onFocus={() => setShowDropdown(true)}
            placeholder="Search opponent's Pokémon…"
            autoComplete="off"
            className="w-full rounded-lg border border-black/10 bg-white px-4 py-2.5 text-[color:var(--ink)] outline-none placeholder:text-black/40 focus-visible:ring-2 focus-visible:ring-[color:var(--accent-gold)]"
          />
          {showDropdown && nameMatches.length > 0 && (
            <div className="absolute z-10 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-black/10 bg-white p-2 shadow-lg">
              {nameMatches.map((p) => (
                <button
                  key={p.name}
                  type="button"
                  onClick={() => handleSelectOpponent(p.name)}
                  className="block w-full rounded-md px-2 py-1.5 text-left text-sm capitalize text-[color:var(--ink)] hover:bg-black/5"
                >
                  {p.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {status === "loading" && <p className="mt-3 text-sm text-[color:var(--ink)]/60">Loading…</p>}
        {status === "error" && <p className="mt-3 text-sm text-red-500">Couldn&apos;t load that Pokémon.</p>}

        {opponent && ownSlot?.pokemon && ownSpeed !== null && (
          <div className="mt-6 border-t border-black/10 pt-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-sm capitalize text-[color:var(--ink)]">{ownSlot.pokemon.name}</span>
                <div className="flex gap-1">{ownSlot.pokemon.types.map((t) => <TypeBadge key={t} type={t} size="sm" />)}</div>
                <span className="text-sm font-medium text-[color:var(--ink)]">{ownSpeed} Spe</span>
              </div>
              <span className="text-xs text-[color:var(--ink)]/40">vs</span>
              <div className="flex items-center gap-2">
                <span className="text-sm capitalize text-[color:var(--ink)]">{opponent.name}</span>
                <div className="flex gap-1">{opponent.types.map((t) => <TypeBadge key={t} type={t} size="sm" />)}</div>
              </div>
            </div>

            {chanceFaster !== null && (
              <div
                className={`mt-4 rounded-lg px-4 py-3 text-sm font-medium ${
                  chanceFaster >= 60
                    ? "bg-emerald-100 text-emerald-900"
                    : chanceFaster <= 40
                    ? "bg-red-100 text-red-900"
                    : "bg-[color:var(--accent-gold)]/30 text-[color:var(--ink)]"
                }`}
              >
                ~{chanceFaster}% chance you move first this matchup
              </div>
            )}
            <p className="mt-3 text-xs text-[color:var(--ink)]/50">
              Real spread unknown — weighted toward more commonly-run archetypes, not real usage stats:
            </p>
            <div className="mt-2 space-y-1.5">
              {variants.map((v) => {
                const verdict = ownSpeed! > v.speed ? "faster" : ownSpeed! < v.speed ? "slower" : "tie";
                const style =
                  verdict === "faster" ? "bg-emerald-100 text-emerald-900"
                  : verdict === "slower" ? "bg-red-100 text-red-900"
                  : "bg-[color:var(--accent-gold)]/30 text-[color:var(--ink)]";
                const verdictLabel =
                  verdict === "faster" ? `You're faster (${ownSpeed} vs ${v.speed})`
                  : verdict === "slower" ? `Opponent's faster (${v.speed} vs ${ownSpeed})`
                  : `Speed tie (${ownSpeed} vs ${v.speed}) — 50/50`;
                return (
                  <div key={v.label} className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-black/5 px-3 py-2 text-sm">
                    <span className="text-[color:var(--ink)]/80">
                      {v.label} <span className="text-[color:var(--ink)]/40">· ~{v.likelihood}% likely</span>
                    </span>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${style}`}>{verdictLabel}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}