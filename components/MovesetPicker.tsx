"use client";

import { useMemo, useState } from "react";
import { useTeamStore } from "@/lib/store/teamStore";
import { PokemonMoveEntry } from "@/lib/types";

const MAX_MOVE_SUGGESTIONS = 8;

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
  const slot = useTeamStore((s) => s.slots[slotIndex]);
  const setSlotMove = useTeamStore((s) => s.setSlotMove);

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
      {/* Suggestion trigger slots into here in Milestone 3 */}
    </div>
  );
}