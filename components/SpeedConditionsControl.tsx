"use client";

import { SpeedConditions } from "@/lib/logic/statCalc";
import StageStepper from "@/components/StageStepper";

export function describeConditions(c: SpeedConditions): string {
  const parts: string[] = [];
  if (c.stage !== 0) parts.push(`${c.stage > 0 ? "+" : ""}${c.stage} Spe`);
  if (c.tailwind) parts.push("Tailwind");
  if (c.paralyzed) parts.push("Paralyzed");
  return parts.join(", ");
}

export default function SpeedConditionsControl({ value, onChange }: {
  value: SpeedConditions; onChange: (v: SpeedConditions) => void;
}) {
  const toggle = (key: "tailwind" | "paralyzed") => onChange({ ...value, [key]: !value[key] });
  return (
    <div className="mt-2 rounded-lg bg-black/5 p-3">
      <StageStepper label="Speed stage" value={value.stage} onChange={(stage) => onChange({ ...value, stage })} />
      <div className="mt-2 flex flex-wrap gap-1.5">
        {([["tailwind", "Tailwind"], ["paralyzed", "Paralyzed"]] as const).map(([key, label]) => (
          <button key={key} type="button" aria-pressed={value[key]} onClick={() => toggle(key)}
            className={`rounded-full px-3 py-1 text-xs font-medium btn-tactile ${value[key] ? "bg-[color:var(--shell-accent)] text-white" : "bg-black/10 text-[color:var(--ink)]"}`}>
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}