import { POKEMON_TYPES, TeamDefenseMatrix, EffectivenessMultiplier } from "@/lib/types";
import { TYPE_COLOR, TYPE_LABEL } from "@/lib/typeMeta";

const CELL_STYLE: Record<EffectivenessMultiplier, { label: string; className: string }> = {
  4: { label: "4×", className: "bg-red-600 text-white font-semibold" },
  2: { label: "2×", className: "bg-red-200 text-red-950 font-medium" },
  1: { label: "", className: "text-transparent" },
  0.5: { label: "½", className: "bg-emerald-200 text-emerald-950" },
  0.25: { label: "¼", className: "bg-emerald-400 text-emerald-950 font-medium" },
  0: { label: "0", className: "bg-black text-white font-semibold" },
};

export default function TeamDefenseGrid({ matrix }: { matrix: TeamDefenseMatrix }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-black/10">
      <table className="w-full border-collapse text-xs">
        <thead>
          <tr>
            <th className="sticky left-0 z-10 bg-[color:var(--screen)] px-2 py-1.5 text-left font-medium text-[color:var(--ink)]/60">
              Team
            </th>
            {POKEMON_TYPES.map((t) => (
              <th key={t} className="px-1 py-1.5 text-center">
                <span
                  className="inline-block h-4 w-4 rounded-full"
                  style={{ backgroundColor: TYPE_COLOR[t] }}
                  title={TYPE_LABEL[t]}
                  aria-label={TYPE_LABEL[t]}
                />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {matrix.rows.map((row) => (
            <tr key={row.name} className="border-t border-black/5">
              <td className="sticky left-0 z-10 whitespace-nowrap bg-[color:var(--screen)] px-2 py-1.5 capitalize text-[color:var(--ink)]">
                {row.name}
              </td>
              {POKEMON_TYPES.map((t) => {
                const style = CELL_STYLE[row.cells[t]];
                return (
                  <td key={t} className={`px-1 py-1.5 text-center ${style.className}`}>
                    {style.label}
                  </td>
                );
              })}
            </tr>
          ))}
          <tr className="border-t-2 border-black/20 font-medium">
            <td className="sticky left-0 z-10 bg-[color:var(--screen)] px-2 py-1.5 text-[color:var(--ink)]/70">
              # weak (2×+)
            </td>
            {POKEMON_TYPES.map((t) => {
              const count = matrix.weakCounts[t];
              return (
                <td
                  key={t}
                  className={`px-1 py-1.5 text-center ${
                    count >= 3 ? "bg-red-600 text-white" : count > 0 ? "bg-red-100 text-red-900" : "text-[color:var(--ink)]/30"
                  }`}
                >
                  {count > 0 ? count : "–"}
                </td>
              );
            })}
          </tr>
        </tbody>
      </table>
    </div>
  );
}