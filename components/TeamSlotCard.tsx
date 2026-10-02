"use client";

import { useTeamStore } from "@/lib/store/teamStore";
import { TYPE_COLOR } from "@/lib/typeMeta";
import { calculateEffectiveSpeed } from "@/lib/logic/statCalc";
import TypeBadge from "@/components/TypeBadge";

export default function TeamSlotCard({ index, onOpen }: { index: number; onOpen: () => void }) {
  const slot = useTeamStore((s) => s.slots[index]);
  const mon = slot.pokemon;

  if (!mon) {
    return (
      <button
        type="button"
        onClick={onOpen}
        className="flex min-h-[220px] w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-[1.25rem] border-[3px] border-dashed border-black/20 bg-black/5 text-[color:var(--ink)]/50 transition-colors hover:bg-black/10 focus-visible:ring-2 focus-visible:ring-[color:var(--accent-gold)] outline-none"
      >
        <svg width="40" height="40" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.3" />
          <path d="M2 10h16" stroke="currentColor" strokeWidth="1.3" />
          <circle cx="10" cy="10" r="2.4" stroke="currentColor" strokeWidth="1.3" />
        </svg>
        <span className="font-dex text-xs uppercase">Slot {index + 1}</span>
        <span className="text-sm font-medium">Add Pokémon</span>
      </button>
    );
  }

  const frame = TYPE_COLOR[mon.types[0]];
  const image = mon.artworkUrl ?? mon.spriteUrl;
  const chosenMoves = slot.moves.filter(Boolean).length;
  const missing = [!slot.itemName && "item", !slot.abilityName && "ability"].filter(Boolean) as string[];
  const speed = calculateEffectiveSpeed(
    mon.stats.find((s) => s.name === "speed")?.baseStat ?? 0,
    slot.speedSp, slot.nature, slot.itemName
  );

  return (
    <button
      type="button"
      onClick={onOpen}
      className="pokecard flex w-full cursor-pointer flex-col text-left transition-transform hover:-translate-y-0.5 motion-reduce:transition-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent-gold)] outline-none"
      style={{ borderColor: frame }}
    >
      <div className="flex items-center justify-between px-3 pt-2">
        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-[color:var(--ink)]/40">
          <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: frame }} />
          Slot {index + 1}
        </span>
        <span
          className="font-dex inline-flex h-5 items-center rounded-full px-2.5 text-[10px] leading-none tracking-wider text-white"
          style={{ backgroundColor: frame }}
        >
          #{String(mon.dexNumber).padStart(4, "0")}
        </span>
      </div>

      <div
        className="relative mx-3 mt-1 flex h-24 items-center justify-center rounded-lg sm:h-28 shrink-0 whitespace-nowrap inline-flex items-center justify-center tracking-wide"
        style={{ background: `linear-gradient(180deg, ${frame}30, ${frame}08)` }}
      >
        {image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt={mon.name} className="h-20 w-20 object-contain drop-shadow-[0_8px_6px_rgba(0,0,0,0.35)] sm:h-24 sm:w-24" />
        )}
      </div>

      <div className="px-3 pb-3 pt-2">
        <p className="font-heading truncate text-base capitalize text-[color:var(--ink)]">{mon.name}</p>
        <div className="mt-1 flex gap-1">{mon.types.map((t) => <TypeBadge key={t} type={t} size="sm" />)}</div>

        <dl className="mt-2 space-y-0.5 text-xs text-[color:var(--ink)]/70">
          <div className="flex justify-between gap-2">
            <dt className="opacity-60">Item</dt>
            <dd className="truncate capitalize">{slot.itemName?.replace(/-/g, " ") ?? "—"}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="opacity-60">Ability</dt>
            <dd className="truncate capitalize">{slot.abilityName?.replace(/-/g, " ") ?? "—"}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="opacity-60">Moves</dt>
            <dd className="font-semibold tabular-nums text-[color:var(--ink)]">{chosenMoves}/4</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="opacity-60">Speed</dt>
            <dd className="font-semibold tabular-nums text-[color:var(--ink)]">{speed}</dd>
          </div>
        </dl>

        {missing.length > 0 && (
          <p className="mt-2 rounded-full bg-red-100 px-2 py-0.5 text-center text-[11px] font-medium text-red-900">
            Needs {missing.join(" + ")}
          </p>
        )}
      </div>
    </button>
  );
}