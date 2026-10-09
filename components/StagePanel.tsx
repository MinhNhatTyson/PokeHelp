"use client";

import { useBattleSessionStore } from "@/lib/store/battleSessionStore";
import type { BattleSide, StageStat } from "@/lib/types";
import StageStepper from "@/components/StageStepper";

const STATS: { key: StageStat; label: string; short: string }[] = [
  { key: "atk", label: "Attack", short: "Atk" },
  { key: "def", label: "Defense", short: "Def" },
  { key: "spa", label: "Sp. Atk", short: "SpA" },
  { key: "spd", label: "Sp. Def", short: "SpD" },
  { key: "spe", label: "Speed", short: "Spe" },
];

/** Small coloured chips for non-zero stages (used on the field cards). */
export function StageBadges({ side, name }: { side: BattleSide; name: string }) {
  const st = useBattleSessionStore((s) => s.stages[side][name]);
  const active = STATS.filter((x) => st?.[x.key]);
  if (active.length === 0) return null;
  return (
    <div className="mt-1 flex flex-wrap gap-1">
      {active.map((x) => {
        const v = st![x.key]!;
        return (
          <span
            key={x.key}
            className={`rounded px-1.5 py-0.5 text-[10px] font-bold tabular-nums ${v > 0 ? "bg-emerald-100 text-emerald-900" : "bg-red-100 text-red-900"}`}
          >
            {x.short} {v > 0 ? `+${v}` : v}
          </span>
        );
      })}
    </div>
  );
}

export default function StagePanel() {
  const activeBattlers = useBattleSessionStore((s) => s.activeBattlers);
  const fainted = useBattleSessionStore((s) => s.fainted);
  const stages = useBattleSessionStore((s) => s.stages);
  const setStage = useBattleSessionStore((s) => s.setStage);

  const rows = (["yours", "opponent"] as const).flatMap((side) =>
    activeBattlers[side].filter((n): n is string => !!n && !fainted[side].includes(n)).map((name) => ({ side, name }))
  );
  if (rows.length === 0) return null;

  const changed = rows.reduce((sum, r) => sum + STATS.filter((x) => stages[r.side][r.name]?.[x.key]).length, 0);

  return (
    <details className="group mt-3 rounded-lg border border-black/10 bg-white">
      <summary className="flex min-h-[44px] cursor-pointer list-none items-center justify-between gap-2 px-3 py-2">
        <span className="text-xs font-medium uppercase text-[color:var(--ink)]/40">Stat stages</span>
        <span className="flex items-center gap-2">
          <span className={`text-xs tabular-nums ${changed > 0 ? "text-[color:var(--shell-accent)]" : "text-[color:var(--ink)]/60"}`}>
            {changed > 0 ? `${changed} active` : "all neutral"}
          </span>
          <span aria-hidden="true" className="text-sm opacity-50 transition-transform group-open:rotate-180">▾</span>
        </span>
      </summary>
      <div className="space-y-3 border-t border-black/10 p-3">
        <p className="text-xs text-[color:var(--ink)]/60">
          Intimidate is applied automatically on entry. Set anything else here (Swords Dance, Icy Wind, Close Combat drops…). Stages reset when a Pokémon switches out.
        </p>
        {rows.map((r) => (
          <div key={`${r.side}-${r.name}`} className="rounded-md bg-black/5 p-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium capitalize text-[color:var(--ink)]">
                {r.name}{" "}
                <span className="text-[10px] font-bold uppercase text-[color:var(--ink)]/50">{r.side === "yours" ? "You" : "Foe"}</span>
              </span>
              <button
                type="button"
                onClick={() => STATS.forEach((x) => setStage(r.side, r.name, x.key, 0))}
                className="text-[11px] text-[color:var(--ink)]/50 hover:underline"
              >
                reset all
              </button>
            </div>
            <div className="mt-1.5 space-y-1.5">
              {STATS.map((x) => (
                <StageStepper
                  key={x.key}
                  label={x.label}
                  value={stages[r.side][r.name]?.[x.key] ?? 0}
                  onChange={(v) => setStage(r.side, r.name, x.key, v)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </details>
  );
}