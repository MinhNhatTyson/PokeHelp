"use client";

import { useBattleSessionStore } from "@/lib/store/battleSessionStore";
import { FieldState } from "@/lib/types";

const WEATHER_META: Record<FieldState["weather"], { label: string; icon: string }> = {
  none: { label: "No weather", icon: "🌫️" },
  sun: { label: "Harsh Sunlight", icon: "☀️" },
  rain: { label: "Rain", icon: "🌧️" },
  sand: { label: "Sandstorm", icon: "🏜️" },
  snow: { label: "Snow", icon: "❄️" },
};

const TERRAIN_META: Record<FieldState["terrain"], { label: string; icon: string }> = {
  none: { label: "No terrain", icon: "🌫️" },
  electric: { label: "Electric Terrain", icon: "⚡" },
  grassy: { label: "Grassy Terrain", icon: "🌿" },
  misty: { label: "Misty Terrain", icon: "🌸" },
  psychic: { label: "Psychic Terrain", icon: "🔮" },
};

const DEFAULT_WEATHER_TURNS = 5;
const DEFAULT_TERRAIN_TURNS = 5;

function Stepper({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center justify-between text-xs text-[color:var(--ink)]/70">
      <span>{label}</span>
      <div className="flex items-center gap-1.5">
        <button type="button" onClick={() => onChange(Math.max(0, value - 1))} className="h-5 w-5 rounded-full bg-black/10 text-[color:var(--ink)]">−</button>
        <span className="w-4 text-center font-medium text-[color:var(--ink)]">{value}</span>
        <button type="button" onClick={() => onChange(value + 1)} className="h-5 w-5 rounded-full bg-black/10 text-[color:var(--ink)]">+</button>
      </div>
    </div>
  );
}

export default function FieldStatusPanel() {
  const fieldState = useBattleSessionStore((s) => s.fieldState);
  const setFieldState = useBattleSessionStore((s) => s.setFieldState);

  return (
    <div className="mt-3 rounded-lg bg-black/5 p-3">
      <p className="mb-2 text-xs font-medium uppercase text-[color:var(--ink)]/40">Field status</p>
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-md bg-white p-2.5">
          <label className="text-[11px] font-medium uppercase text-[color:var(--ink)]/40">Weather</label>
          <select
            value={fieldState.weather}
            onChange={(e) => {
              const weather = e.target.value as FieldState["weather"];
              setFieldState({ weather, weatherTurnsLeft: weather === "none" ? 0 : DEFAULT_WEATHER_TURNS });
            }}
            className="mt-1 w-full rounded-md border border-black/10 bg-white px-2 py-1.5 text-sm text-[color:var(--ink)] outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent-gold)]"
          >
            {Object.entries(WEATHER_META).map(([key, meta]) => (
              <option key={key} value={key}>{meta.icon} {meta.label}</option>
            ))}
          </select>
          {fieldState.weather !== "none" && (
            <div className="mt-2">
              <Stepper label="Turns left" value={fieldState.weatherTurnsLeft} onChange={(v) => setFieldState({ weatherTurnsLeft: v })} />
            </div>
          )}
        </div>

        <div className="rounded-md bg-white p-2.5">
          <label className="text-[11px] font-medium uppercase text-[color:var(--ink)]/40">Terrain</label>
          <select
            value={fieldState.terrain}
            onChange={(e) => {
              const terrain = e.target.value as FieldState["terrain"];
              setFieldState({ terrain, terrainTurnsLeft: terrain === "none" ? 0 : DEFAULT_TERRAIN_TURNS });
            }}
            className="mt-1 w-full rounded-md border border-black/10 bg-white px-2 py-1.5 text-sm text-[color:var(--ink)] outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent-gold)]"
          >
            {Object.entries(TERRAIN_META).map(([key, meta]) => (
              <option key={key} value={key}>{meta.icon} {meta.label}</option>
            ))}
          </select>
          {fieldState.terrain !== "none" && (
            <div className="mt-2">
              <Stepper label="Turns left" value={fieldState.terrainTurnsLeft} onChange={(v) => setFieldState({ terrainTurnsLeft: v })} />
            </div>
          )}
        </div>

        <div className="rounded-md bg-white p-2.5">
          <p className="text-[11px] font-medium uppercase text-[color:var(--ink)]/40">⏳ Trick Room</p>
          <div className="mt-1.5">
            <Stepper label="Turns left" value={fieldState.trickRoomTurnsLeft} onChange={(v) => setFieldState({ trickRoomTurnsLeft: v })} />
          </div>
        </div>

        <div className="rounded-md bg-white p-2.5">
          <p className="text-[11px] font-medium uppercase text-[color:var(--ink)]/40">💨 Tailwind</p>
          <div className="mt-1.5 space-y-1">
            <Stepper
              label="Yours"
              value={fieldState.tailwindTurnsLeft.yours}
              onChange={(v) => setFieldState({ tailwindTurnsLeft: { ...fieldState.tailwindTurnsLeft, yours: v } })}
            />
            <Stepper
              label="Opponent's"
              value={fieldState.tailwindTurnsLeft.opponents}
              onChange={(v) => setFieldState({ tailwindTurnsLeft: { ...fieldState.tailwindTurnsLeft, opponents: v } })}
            />
          </div>
        </div>
      </div>
    </div>
  );
}