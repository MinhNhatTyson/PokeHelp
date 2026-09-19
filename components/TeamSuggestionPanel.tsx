"use client";

import { useEffect, useState } from "react";
import { useTeamStore } from "@/lib/store/teamStore";
import { fetchPokemonDetail } from "@/lib/data/fetchAndCache";

interface TeamSuggestion {
  species: string;
  abilityName: string | null;
  itemName: string | null;
  reasoning: string;
}

export default function TeamSuggestionPanel() {
  const slots = useTeamStore((s) => s.slots);
  const setSlotPokemon = useTeamStore((s) => s.setSlotPokemon);
  const setSlotItem = useTeamStore((s) => s.setSlotItem);
  const setSlotAbility = useTeamStore((s) => s.setSlotAbility);
  const teamStrategy = useTeamStore((s) => s.teamStrategy);

  const [suggestion, setSuggestion] = useState<TeamSuggestion | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [adopting, setAdopting] = useState(false);

  const filledIndices = slots.map((s, i) => (s.pokemon ? i : -1)).filter((i) => i !== -1);
  const emptyIndex = slots.findIndex((s) => !s.pokemon);
  const shouldSuggest = filledIndices.length === 5 && emptyIndex !== -1;
  const teamKey = filledIndices.map((i) => slots[i].pokemon!.name).sort().join("|");

  useEffect(() => {
    if (!shouldSuggest) {
      setSuggestion(null);
      setStatus("idle");
      return;
    }

    let cancelled = false;
    setStatus("loading");
    setSuggestion(null);

    const members = filledIndices.map((i) => ({
      name: slots[i].pokemon!.name,
      abilityName: slots[i].abilityName,
      itemName: slots[i].itemName,
      roleNotes: slots[i].roleNotes,
    }));

    fetch("/api/team-suggestion", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ members, teamStrategy }),
    })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error("failed"))))
      .then((data) => { if (!cancelled) { setSuggestion(data); setStatus("idle"); } })
      .catch(() => { if (!cancelled) setStatus("error"); });

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldSuggest, teamKey]);

  async function handleAdopt() {
    if (!suggestion || emptyIndex === -1) return;
    setAdopting(true);
    const detail = await fetchPokemonDetail(suggestion.species);
    if (detail) {
      setSlotPokemon(emptyIndex, detail);
      setSlotItem(emptyIndex, suggestion.itemName);
      setSlotAbility(emptyIndex, suggestion.abilityName);
    }
    setAdopting(false);
  }

  if (!shouldSuggest) return null;

  return (
    <div className="mt-4 rounded-lg border border-[color:var(--accent-gold)]/40 bg-black/5 p-4">
      <p className="text-xs font-medium uppercase text-[color:var(--ink)]/40">PokeHelp suggests a 6th teammate</p>
      {status === "loading" && <p className="mt-1 text-sm text-[color:var(--ink)]/60">Thinking…</p>}
      {status === "error" && <p className="mt-1 text-sm text-red-500">Couldn&apos;t get a suggestion right now.</p>}
      {status === "idle" && suggestion && (
        <div className="mt-2">
          <button
            type="button"
            onClick={handleAdopt}
            disabled={adopting}
            className="flex flex-wrap items-center gap-2 rounded-lg border border-[color:var(--accent-gold)] bg-white px-3 py-2 text-left hover:bg-black/5 disabled:opacity-50"
          >
            <span className="font-display text-base capitalize text-[color:var(--ink)]">
              {adopting ? "Adding…" : suggestion.species}
            </span>
            {suggestion.itemName && (
              <span className="text-xs capitalize text-[color:var(--ink)]/60">· {suggestion.itemName.replace(/-/g, " ")}</span>
            )}
            {suggestion.abilityName && (
              <span className="text-xs capitalize text-[color:var(--ink)]/60">· {suggestion.abilityName.replace(/-/g, " ")}</span>
            )}
          </button>
          <p className="mt-2 text-sm text-[color:var(--ink)]/70">{suggestion.reasoning}</p>
        </div>
      )}
    </div>
  );
}