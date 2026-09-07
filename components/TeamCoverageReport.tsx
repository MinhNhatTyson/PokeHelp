import { TeamDefenseReport, TeamOffenseReport } from "@/lib/types";
import TypeBadge from "@/components/TypeBadge";

const DEFENSE_GROUPS = [
  { key: "quad", label: "4× weak" },
  { key: "double", label: "2× weak" },
  { key: "half", label: "½× resisted" },
  { key: "quarter", label: "¼× resisted" },
  { key: "immune", label: "Immune" },
] as const;

export default function TeamCoverageReport({
  defense,
  offense,
  teamSize,
}: {
  defense: TeamDefenseReport;
  offense: TeamOffenseReport;
  teamSize: number;
}) {
  return (
    <div className="mt-6 space-y-8 border-t border-black/10 pt-6">
      <section>
        <h2 className="font-display text-lg text-[color:var(--ink)]">Team weaknesses</h2>
        <p className="text-xs text-[color:var(--ink)]/50">How many of your {teamSize} members take extra/reduced damage from each attacking type.</p>
        <div className="mt-3 space-y-4">
          {DEFENSE_GROUPS.map(({ key, label }) => {
            const entries = defense[key];
            if (entries.length === 0) return null;
            return (
              <div key={key}>
                <p className="text-sm font-medium text-[color:var(--ink)]/70">{label}</p>
                <div className="mt-1.5 space-y-1.5">
                  {entries.map((e) => (
                    <div key={e.type} className="flex flex-wrap items-center gap-2 text-sm">
                      <TypeBadge type={e.type} size="sm" />
                      <span className="text-[color:var(--ink)]/60">
                        {e.count}/{teamSize} — <span className="capitalize">{e.members.join(", ")}</span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section>
        <h2 className="font-display text-lg text-[color:var(--ink)]">Team offensive coverage</h2>
        <p className="text-xs text-[color:var(--ink)]/50">Based on each member&apos;s own types (STAB), not movesets.</p>
        <div className="mt-3 space-y-4">
          <div>
            <p className="text-sm font-medium text-[color:var(--ink)]/70">Super effective against</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {offense.superEffectiveAgainst.map((t) => <TypeBadge key={t} type={t} size="sm" />)}
            </div>
          </div>
          {offense.resistedByAll.length > 0 && (
            <div>
              <p className="text-sm font-medium text-[color:var(--ink)]/70">Gap — no member hits this well</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {offense.resistedByAll.map((t) => <TypeBadge key={t} type={t} size="sm" />)}
              </div>
            </div>
          )}
          {offense.noEffectFromAll.length > 0 && (
            <div>
              <p className="text-sm font-medium text-[color:var(--ink)]/70">Cannot touch at all</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {offense.noEffectFromAll.map((t) => <TypeBadge key={t} type={t} size="sm" />)}
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}