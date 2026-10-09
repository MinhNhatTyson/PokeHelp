"use client";

import { useBattleSessionStore } from "@/lib/store/battleSessionStore";
import { useTeamStore } from "@/lib/store/teamStore";
import { useOpponentTeamStore } from "@/lib/store/opponentTeamStore";
import { calculateEffectiveSpeed, NO_SPEED_CONDITIONS, SpeedConditions } from "@/lib/logic/statCalc";
import { getSpeedVariants } from "@/lib/logic/speedVariants";

interface Row {
  key: string;
  name: string;
  side: "yours" | "opponent";
  low: number;     // slowest plausible speed
  high: number;    // fastest plausible speed
  likely: number;  // used for ordering
  tailwind: boolean;
  paralyzed: boolean;
  stage: number;
  mega: boolean;
}

const YOURS = "var(--shell-accent)";
const THEIRS = "#3b82f6";

export default function SpeedOrderPanel() {
  const activeBattlers = useBattleSessionStore((s) => s.activeBattlers);
  const fainted = useBattleSessionStore((s) => s.fainted);
  const status = useBattleSessionStore((s) => s.status);
  const field = useBattleSessionStore((s) => s.fieldState);
  const teamSlots = useTeamStore((s) => s.slots);
  const oppSlots = useOpponentTeamStore((s) => s.slots);
  const megaUsed = useBattleSessionStore((s) => s.megaUsed);
  const megaDetails = useBattleSessionStore((s) => s.megaDetails);
  const opponentReveals = useBattleSessionStore((s) => s.opponentReveals);
  const stages = useBattleSessionStore((s) => s.stages);

  const trickRoom = field.trickRoomTurnsLeft > 0;
  const rows: Row[] = [];

  for (const side of ["yours", "opponent"] as const) {
    for (const name of activeBattlers[side]) {
      if (!name || fainted[side].includes(name)) continue;
      const cond: SpeedConditions = {
        ...NO_SPEED_CONDITIONS,
        tailwind: (side === "yours" ? field.tailwindTurnsLeft.yours : field.tailwindTurnsLeft.opponents) > 0,
        paralyzed: status[side][name] === "paralysis",
        stage: stages[side][name]?.spe ?? 0,
      };
      const megaOn = megaUsed[side] === name;
      const md = megaOn ? megaDetails[`${side}:${name}`] : undefined;

      if (side === "yours") {
        const slot = teamSlots.find((s) => s.pokemon?.name === name);
        if (!slot?.pokemon) continue;
        const base = (md?.stats ?? slot.pokemon.stats).find((s) => s.name === "speed")?.baseStat ?? 0;
        const speed = calculateEffectiveSpeed(base, slot.speedSp, slot.nature, slot.itemName, cond);
        rows.push({ key: `y-${name}`, name, side, low: speed, high: speed, likely: speed, tailwind: cond.tailwind, paralyzed: cond.paralyzed, stage: cond.stage, mega: megaOn });
      } else {
        const detail = oppSlots.find((s) => s.pokemon?.name === name)?.pokemon;
        if (!detail) continue;
        const effective = md ? { ...detail, stats: md.stats, types: md.types } : detail; // keeps the base name for the curated-set lookup
        const allVariants = getSpeedVariants(effective, cond);
        if (allVariants.length === 0) continue;
        // A confirmed item narrows the likely spreads: Scarf seen = only Scarf spreads, any other item seen = no Scarf spreads
        const rev = opponentReveals[name];
        let variants = allVariants;
        if (rev && "item" in rev) {
          const scarf = rev.item === "choice-scarf";
          const narrowed = allVariants.filter((v) => (scarf ? v.itemName === "choice-scarf" : v.itemName !== "choice-scarf"));
          if (narrowed.length > 0) variants = narrowed;
        }
        const speeds = variants.map((v) => v.speed);
        rows.push({
          key: `o-${name}`, name, side,
          low: Math.min(...speeds), high: Math.max(...speeds), likely: variants[0].speed,
          tailwind: cond.tailwind, paralyzed: cond.paralyzed, stage: cond.stage,mega: megaOn
        });
      }
    }
  }

  if (rows.length === 0) return null;

  rows.sort((a, b) => (trickRoom ? a.likely - b.likely : b.likely - a.likely));
  const max = Math.max(1, ...rows.map((r) => r.high));
  const pct = (n: number) => `${Math.min(100, (n / max) * 100)}%`;

  return (
    <div className="mt-3 rounded-lg bg-black/5 p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium uppercase text-[color:var(--ink)]/40">Speed order</p>
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
            trickRoom ? "bg-purple-600 text-white" : "bg-black/10 text-[color:var(--ink)]/60"
          }`}
        >
          {trickRoom ? "Trick Room · slowest first" : "Fastest first"}
        </span>
      </div>

      <ol className="mt-2 space-y-1.5">
        {rows.map((r, i) => {
          const color = r.side === "yours" ? YOURS : THEIRS;
          const isRange = r.high !== r.low;
          return (
            <li key={r.key} className="rounded-md bg-white p-2">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="w-4 text-center font-dex text-xs text-[color:var(--ink)]/50">{i + 1}</span>
                <span className="text-sm font-medium capitalize text-[color:var(--ink)]">{r.name}</span>
                <span className="rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase text-white" style={{ backgroundColor: color }}>
                  {r.side === "yours" ? "You" : "Foe"}
                </span>
                {r.tailwind && <span className="rounded-full bg-sky-100 px-1.5 py-0.5 text-[10px] font-medium text-sky-900">Tailwind</span>}
                {r.paralyzed && <span className="rounded-full bg-yellow-100 px-1.5 py-0.5 text-[10px] font-medium text-yellow-900">Paralyzed</span>}
                {r.mega && <span className="rounded-full bg-[color:var(--accent-gold)] px-1.5 py-0.5 text-[10px] font-bold uppercase text-black">Mega</span>}
                <span className="ml-auto text-sm font-semibold tabular-nums text-[color:var(--ink)]">
                  {isRange ? `${r.low}–${r.high}` : r.low}
                </span>
              </div>
              <div role="img" aria-label={`${r.name} speed ${isRange ? `${r.low} to ${r.high}` : r.low}`} className="relative mt-1.5 h-2 rounded-full bg-black/10">
                {isRange ? (
                  <>
                    <div
                      className="absolute inset-y-0 rounded-full opacity-40"
                      style={{ left: pct(r.low), width: `calc(${pct(r.high)} - ${pct(r.low)})`, backgroundColor: color }}
                    />
                    <div className="absolute top-1/2 h-3 w-1 -translate-y-1/2 rounded-sm" style={{ left: pct(r.likely), backgroundColor: color }} />
                  </>
                ) : (
                  <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: pct(r.low), backgroundColor: color }} />
                )}
              </div>
              {isRange && <p className="mt-1 text-[10px] text-[color:var(--ink)]/50">Range across plausible spreads; marker = most likely ({r.likely}).</p>}
            </li>
          );
        })}
      </ol>

      <p className="mt-2 text-[11px] text-[color:var(--ink)]/50">
        Priority moves (Fake Out, Protect, Prankster, etc.) ignore this order.
      </p>
    </div>
  );
}