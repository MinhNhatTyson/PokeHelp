"use client";

export default function StageStepper({ label, value, onChange }: {
  label: string; value: number; onChange: (v: number) => void;
}) {
  const clamp = (n: number) => Math.max(-6, Math.min(6, n));
  const tone = value > 0 ? "text-emerald-700" : value < 0 ? "text-red-700" : "text-[color:var(--ink)]";
  return (
    <div className="flex items-center justify-between gap-2 text-xs text-[color:var(--ink)]/70">
      <span>{label}</span>
      <div className="flex items-center gap-1">
        <button type="button" aria-label={`Lower ${label}`} onClick={() => onChange(clamp(value - 1))}
          className="h-7 w-7 rounded-full bg-black/10 text-[color:var(--ink)] btn-tactile">−</button>
        <span className={`w-9 text-center text-sm font-semibold tabular-nums ${tone}`}>{value > 0 ? `+${value}` : value}</span>
        <button type="button" aria-label={`Raise ${label}`} onClick={() => onChange(clamp(value + 1))}
          className="h-7 w-7 rounded-full bg-black/10 text-[color:var(--ink)] btn-tactile">+</button>
        <button type="button" onClick={() => onChange(0)} disabled={value === 0}
          className="ml-1 text-[11px] text-[color:var(--ink)]/50 hover:underline disabled:opacity-30">reset</button>
      </div>
    </div>
  );
}