"use client";

import { useEffect, useMemo, useState } from "react";
import { useTeamStore } from "@/lib/store/teamStore";
import { PokemonMoveEntry } from "@/lib/types";

const MAX_MOVE_SUGGESTIONS = 8;
interface MoveSuggestion {
  move: string;
  reasoning: string;
}

function formatMoveName(slug: string) {
  return slug.replace(/-/g, " ");
}

function MoveSlot({
  index,
  moveName,
  movepool,
  takenMoves,
  onSelect,
  onClear,
}: {
  index: number;
  moveName: string | null;
  movepool: PokemonMoveEntry[];
  takenMoves: (string | null)[];
  onSelect: (name: string) => void;
  onClear: () => void;
}) {
  const [query, setQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase().replace(/ /g, "-");
    if (!q) return [];
    return movepool
      .filter((m) => m.name.includes(q) && !takenMoves.includes(m.name))
      .slice(0, MAX_MOVE_SUGGESTIONS);
  }, [query, movepool, takenMoves]);

  if (moveName) {
    return (
      <div className="flex items-center justify-between rounded-md bg-black/5 px-2.5 py-1.5 text-sm">
        <span className="capitalize text-[color:var(--ink)]">{formatMoveName(moveName)}</span>
        <button type="button" onClick={onClear} className="text-[color:var(--ink)]/40 hover:text-red-600">
          ×
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <input
        value={query}
        onChange={(e) => { setQuery(e.target.value); setShowDropdown(true); }}
        onFocus={() => setShowDropdown(true)}
        onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
        placeholder={`Move ${index + 1}…`}
        autoComplete="off"
        className="w-full rounded-md border border-black/10 px-2.5 py-1.5 text-sm text-[color:var(--ink)] outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent-gold)]"
      />
      {showDropdown && matches.length > 0 && (
        <div className="absolute z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-md border border-black/10 bg-white p-1 shadow-lg">
          {matches.map((m) => (
            <button
              key={m.name}
              type="button"
              onMouseDown={() => onSelect(m.name)}
              className="block w-full rounded-md px-2 py-1 text-left text-sm capitalize text-[color:var(--ink)] hover:bg-black/5"
            >
              {formatMoveName(m.name)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function MovesetPicker({ slotIndex }: { slotIndex: number }) {
  const slots = useTeamStore((s) => s.slots);
  const slot = slots[slotIndex];
  const setSlotMove = useTeamStore((s) => s.setSlotMove);
  const teamStrategy = useTeamStore((s) => s.teamStrategy);

  const [suggestion, setSuggestion] = useState<MoveSuggestion | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");

  const chosenMoves = slot.moves.filter((m): m is string => m !== null);
  const emptyIndex = slot.moves.findIndex((m) => m === null);
  const shouldSuggest = !!slot.pokemon && chosenMoves.length === 3 && emptyIndex !== -1;
  const chosenKey = [...chosenMoves].sort().join("|"); // re-fires only when the actual 3 moves change

  useEffect(() => {
    if (!shouldSuggest || !slot.pokemon) {
      setSuggestion(null);
      setStatus("idle");
      return;
    }

    let cancelled = false;
    setStatus("loading");
    setSuggestion(null);

    const teammates = slots
      .filter((s, i) => i !== slotIndex && s.pokemon)
      .map((s) => ({ name: s.pokemon!.name, roleNotes: s.roleNotes }));

    fetch("/api/moveset-suggestion", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        species: slot.pokemon.name,
        chosenMoves,
        legalMovepool: slot.pokemon.moves.map((m) => m.name),
        abilityName: slot.abilityName,
        itemName: slot.itemName,
        teammates,
        teamStrategy,
      }),
    })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error("failed"))))
      .then((data) => { if (!cancelled) { setSuggestion(data); setStatus("idle"); } })
      .catch(() => { if (!cancelled) setStatus("error"); });

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldSuggest, chosenKey, slotIndex]);

  if (!slot.pokemon) return null;

  return (
    <div className="mt-3">
      <label className="text-xs font-medium uppercase text-[color:var(--ink)]/40">Moves</label>
      <div className="mt-1 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
        {slot.moves.map((moveName, i) => (
          <MoveSlot
            key={i}
            index={i}
            moveName={moveName}
            movepool={slot.pokemon!.moves}
            takenMoves={slot.moves}
            onSelect={(name) => setSlotMove(slotIndex, i, name)}
            onClear={() => setSlotMove(slotIndex, i, null)}
          />
        ))}
      </div>

      {shouldSuggest && (
        <div className="mt-2 rounded-md border border-[color:var(--accent-gold)]/40 bg-black/5 p-2.5 text-xs">
          <p className="font-medium uppercase text-[color:var(--ink)]/40">PokeHelp suggests</p>
          {status === "loading" && <p className="mt-1 text-[color:var(--ink)]/60">Thinking…</p>}
          {status === "error" && <p className="mt-1 text-red-500">Couldn&apos;t get a suggestion — pick manually.</p>}
          {status === "idle" && suggestion && (
            <div className="mt-1">
              <button
                type="button"
                onClick={() => emptyIndex !== -1 && setSlotMove(slotIndex, emptyIndex, suggestion.move)}
                className="rounded-full bg-[color:var(--accent-gold)] px-2.5 py-1 font-medium capitalize text-black"
              >
                {suggestion.move.replace(/-/g, " ")}
              </button>
              <p className="mt-1.5 text-[color:var(--ink)]/70">{suggestion.reasoning}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
