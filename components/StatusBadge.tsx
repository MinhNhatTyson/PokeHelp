import type { StatusKind } from "@/lib/types";

export const STATUS_META: Record<StatusKind, { short: string; label: string; color: string; dark?: boolean }> = {
  burn: { short: "BRN", label: "Burned", color: "#F08030" },
  poison: { short: "PSN", label: "Poisoned", color: "#A040A0" },
  toxic: { short: "TOX", label: "Badly poisoned", color: "#7B2D8E" },
  paralysis: { short: "PAR", label: "Paralyzed", color: "#F8D030", dark: true },
  sleep: { short: "SLP", label: "Asleep", color: "#8C888C" },
  freeze: { short: "FRZ", label: "Frozen", color: "#98D8D8", dark: true },
};

export default function StatusBadge({ status }: { status?: StatusKind | null }) {
  if (!status) return null;
  const m = STATUS_META[status];
  return (
    <span
      title={m.label}
      className={`shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase leading-none tracking-wide ${m.dark ? "text-black/80" : "text-white"}`}
      style={{ backgroundColor: m.color }}
    >
      {m.short}
    </span>
  );
}