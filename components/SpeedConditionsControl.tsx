"use client";

import { useState } from "react";
import { SpeedConditions, NO_SPEED_CONDITIONS } from "@/lib/logic/statCalc";
import StageStepper from "@/components/StageStepper";

export function describeConditions(c: SpeedConditions): string {
  const parts: string[] = [];
  if (c.stage !== 0) parts.push(`${c.stage > 0 ? "+" : ""}${c.stage} Spe`);
  if (c.tailwind) parts.push("Tailwind");
  if (c.paralyzed) parts.push("Paralyzed");
  return parts.join(", ");
}

export default function SpeedConditionsControl({ value, onChange, label = "Conditions" }: {
  value: SpeedConditions; onChange: (v: SpeedConditions) => void; label?: string;
}) {
  const [open, setOpen] = useState(false);
  const summary = describeConditions(value);
  const active = summary !== "";
  const toggle = (key: "tailwind" | "paralyzed") => onChange({ ...value, [key]: !value[key] });

  return (
    <div className="mt-2 overflow-hidden rounded-lg bg-black/5">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex min-h-[44px] w-full items-center justify-between gap-2 px-3 py-2 text-left transition-colors hover:bg-black/5"
      >
        <span className="flex min-w-0 items-center gap-2">
          <span
            aria-hidden="true"
            className={`h-2 w-2 shrink-0 rounded-full ${active ? "bg-[color:var(--shell-accent)]" : "bg-black/20"}`}
          />
          <span className="text-xs font-medium uppercase text-[color:var(--ink)]/40">{label}</span>
          <span className={`truncate text-xs ${active ? "font-medium text-[color:var(--ink)]" : "text-[color:var(--ink)]/50"}`}>
            {active ? summary : "None"}
          </span>
        </span>
        <svg
          width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true"
          className={`shrink-0 text-[color:var(--ink)]/50 transition-transform motion-reduce:transition-none ${open ? "rotate-180" : ""}`}
        >
          <path d="M5 8l5 5 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div className="border-t border-black/10 p-3">
          <StageStepper label="Speed stage" value={value.stage} onChange={(stage) => onChange({ ...value, stage })} />
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {([["tailwind", "Tailwind"], ["paralyzed", "Paralyzed"]] as const).map(([key, text]) => (
              <button key={key} type="button" aria-pressed={value[key]} onClick={() => toggle(key)}
                className={`rounded-full px-3 py-1 text-xs font-medium btn-tactile ${value[key] ? "bg-[color:var(--shell-accent)] text-white" : "bg-black/10 text-[color:var(--ink)]"}`}>
                {text}
              </button>
            ))}
            <button type="button" onClick={() => onChange(NO_SPEED_CONDITIONS)} disabled={!active}
              className="ml-auto text-[11px] text-[color:var(--ink)]/50 hover:underline disabled:opacity-30">
              reset all
            </button>
          </div>
        </div>
      )}
    </div>
  );
}