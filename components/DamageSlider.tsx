"use client";

import HpBar, { hpColor } from "@/components/HpBar";

const MILESTONES = [25, 50, 75];
const THUMB = 28; // px, keep in sync with .dmg-range in globals.css

export default function DamageSlider({ value, max, onChange, targetName, heal = false, current = 100 }: {
  value: number; max: number; onChange: (v: number) => void; targetName: string;
  heal?: boolean;   // heal mode: max = room left up to 100%
  current?: number; // HP right now (only needed in heal mode)
}) {
  if (max <= 0) return null;
  const set = (n: number) => onChange(Math.max(0, Math.min(max, Math.round(Number.isFinite(n) ? n : 0))));
  const now = heal ? current : max; // HP before the change
  const after = heal ? now + value : now - value;
  const isKo = !heal && value >= max;
  const fill = (value / max) * 100;
  const marks = MILESTONES.filter((m) => m < max);
  // The thumb centre travels (width - THUMB), so offset everything by the same amount
  const offset = (p: number) => `calc(${p}% + ${(THUMB / 2 - (p * THUMB) / 100).toFixed(2)}px)`;
  const from = heal ? "#34d399" : "#fbbf24";
  const to = heal ? "#10b981" : "#ef4444";
  const track = `linear-gradient(to right, ${from} 0, ${to} ${offset(fill)}, rgba(0,0,0,0.14) ${offset(fill)})`;

  return (
    <div className="mt-3 rounded-xl bg-gradient-to-b from-black/[0.04] to-black/[0.08] p-3">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wide text-[color:var(--ink)]/40">{heal ? "HP restored" : "Damage dealt"}</p>
          <p className="font-heading text-3xl leading-none tabular-nums text-[color:var(--ink)]">
            {heal && value > 0 ? "+" : ""}{value}<span className="text-lg">%</span>
          </p>
        </div>
        <div className="text-right">
          {isKo ? (
            <span className="inline-block rounded-full bg-red-600 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide text-white">KO</span>
          ) : (
            <p className="text-sm font-semibold tabular-nums" style={{ color: hpColor(after) }}>{now}% → {after}%</p>
          )}
          <p className="mt-0.5 text-[10px] capitalize text-[color:var(--ink)]/50">{targetName} HP</p>
        </div>
      </div>

      <HpBar pct={now} lost={heal ? 0 : value} gain={heal ? value : 0} className="mt-2.5 h-3" />

      <div className="mt-1">
        <input
          type="range" min={0} max={max} step={1} value={value}
          onChange={(e) => set(Number(e.target.value))}
          aria-label={`${heal ? "Healing for" : "Damage to"} ${targetName}`}
          aria-valuetext={`${value}% of max HP`}
          className="dmg-range"
          style={{ ["--track" as string]: track }}
        />
        <div aria-hidden="true" className="pointer-events-none relative -mt-1 h-5">
          {marks.map((m) => (
            <span key={m} className="absolute top-0 flex -translate-x-1/2 flex-col items-center" style={{ left: offset((m / max) * 100) }}>
              <span className="h-1.5 w-px bg-black/30" />
              <span className="text-[9px] tabular-nums text-[color:var(--ink)]/40">{m}</span>
            </span>
          ))}
        </div>
      </div>

      <div className="mt-1 flex flex-wrap items-center gap-1.5">
        {[...marks, max].map((m) => (
          <button
            key={m} type="button" aria-pressed={value === m} onClick={() => set(m)}
            className={`btn-tactile min-h-[36px] rounded-full px-3.5 text-xs font-semibold ${
              value === m ? "bg-[color:var(--shell-accent)] text-white" : "bg-black/10 text-[color:var(--ink)]"
            }`}
          >
            {m === max ? (heal ? `Full · +${m}%` : `KO · ${m}%`) : `${m}%`}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-1">
          <button type="button" aria-label="Decrease damage by 1" onClick={() => set(value - 1)}
            className="btn-tactile h-9 w-9 rounded-full bg-black/10 text-base text-[color:var(--ink)]">−</button>
          <input
            type="number" inputMode="numeric" min={0} max={max} value={value}
            onChange={(e) => set(Number(e.target.value))}
            aria-label={`Exact damage to ${targetName}`}
            className="h-9 w-14 rounded-md border border-black/10 bg-white text-center text-sm tabular-nums text-[color:var(--ink)] outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent-gold)]"
          />
          <button type="button" aria-label="Increase damage by 1" onClick={() => set(value + 1)}
            className="btn-tactile h-9 w-9 rounded-full bg-black/10 text-base text-[color:var(--ink)]">+</button>
        </div>
      </div>
    </div>
  );
}