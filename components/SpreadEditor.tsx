"use client";

import { useTeamStore } from "@/lib/store/teamStore";
import { MAX_SP_PER_STAT, MAX_TOTAL_SP } from "@/lib/logic/statCalc";
import { presetSp, type PresetKey, type StatKey } from "@/lib/logic/damageCalc";

const FIELDS: { key: StatKey; label: string }[] = [
  { key: "hp", label: "HP" }, { key: "atk", label: "Atk" }, { key: "def", label: "Def" },
  { key: "spa", label: "SpA" }, { key: "spd", label: "SpD" }, { key: "spe", label: "Spe" },
];
const PRESETS: { key: PresetKey; label: string }[] = [
  { key: "offense", label: "Max offense" }, { key: "balanced", label: "Balanced bulk" },
  { key: "physBulk", label: "Phys bulk" }, { key: "specBulk", label: "Spec bulk" }, { key: "none", label: "Clear" },
];

export default function SpreadEditor({ slotIndex }: { slotIndex: number }) {
  const slot = useTeamStore((s) => s.slots[slotIndex]);
  const setSlotSp = useTeamStore((s) => s.setSlotSp);
  const setSlotSpread = useTeamStore((s) => s.setSlotSpread);
  const setSlotNature = useTeamStore((s) => s.setSlotNature);
  const mon = slot.pokemon;
  if (!mon) return null;

  const values: Record<StatKey, number> = { ...slot.spread, spe: slot.speedSp };
  const total = Object.values(values).reduce((a, b) => a + b, 0);
  const left = MAX_TOTAL_SP - total;
  const base = (n: string) => mon.stats.find((s) => s.name === n)?.baseStat ?? 0;

  const applyPreset = (key: PresetKey) => {
    setSlotSpread(slotIndex, presetSp(mon, key));
    if (key === "offense" && !slot.nature) {
      setSlotNature(slotIndex, base("special-attack") >= base("attack") ? "modest" : "adamant");
    }
  };

  return (
    <div className="mt-3">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium uppercase text-[color:var(--ink)]/40">
          Stat Points <span className="normal-case opacity-60">(max {MAX_SP_PER_STAT} each)</span>
        </label>
        <span
          className={`text-xs tabular-nums ${
            left < 0 ? "font-semibold text-red-600" : left === 0 ? "font-semibold text-emerald-700" : "text-[color:var(--ink)]/50"
          }`}
        >
          {total}/{MAX_TOTAL_SP}
        </span>
      </div>
      <div className="mt-1 grid grid-cols-6 gap-1">
        {FIELDS.map((f) => (
          <label key={f.key} className="text-center text-[10px] uppercase text-[color:var(--ink)]/50">
            {f.label}
            <input
              type="number" inputMode="numeric" min={0} max={MAX_SP_PER_STAT} value={values[f.key]}
              onChange={(e) => setSlotSp(slotIndex, f.key, Number(e.target.value) || 0)}
              className="mt-0.5 w-full rounded-md border border-black/10 bg-white px-1 py-1.5 text-center text-sm tabular-nums text-[color:var(--ink)] outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent-gold)]"
            />
          </label>
        ))}
      </div>
      <div className="mt-1.5 flex flex-wrap gap-1">
        {PRESETS.map((p) => (
          <button
            key={p.key} type="button" onClick={() => applyPreset(p.key)}
            className="btn-tactile rounded-full bg-black/10 px-2.5 py-0.5 text-[11px] text-[color:var(--ink)]"
          >
            {p.label}
          </button>
        ))}
      </div>
      <p className="mt-1.5 text-[11px] text-[color:var(--ink)]/50">
        Used by the Live Battle damage preview. With every non-Speed stat at 0, the preview falls back to a balanced-bulk guess.
      </p>
    </div>
  );
}