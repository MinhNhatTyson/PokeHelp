import { ComboResult } from "@/lib/logic/battleOptimizer";
import TypeBadge from "@/components/TypeBadge";

export default function ComboResultCard({ rank, result }: { rank: number; result: ComboResult }) {
  const { members, breakdown, recommendedLead, backLine, strategyNotes } = result;
  return (
    <div className={`rounded-lg border p-4 ${rank === 1 ? "border-[color:var(--accent-gold)] bg-black/5" : "border-black/10"}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase text-[color:var(--ink)]/40">{rank === 1 ? "Top pick" : `#${rank}`}</span>
        <span className="text-sm font-medium text-[color:var(--ink)]">Score: {breakdown.total.toFixed(1)}</span>
      </div>

      <div className="mt-2 flex flex-wrap gap-3">
        {members.map((m) => (
          <div key={m.name} className="flex items-center gap-1.5">
            <span className="text-sm capitalize text-[color:var(--ink)]">{m.name}</span>
            <div className="flex gap-1">{m.types.map((t) => <TypeBadge key={t} type={t} size="sm" />)}</div>
          </div>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 rounded-md bg-black/5 px-3 py-2 text-xs">
        <span className="font-medium uppercase text-[color:var(--ink)]/50">Suggested lead</span>
        <span className="capitalize text-[color:var(--ink)]">{recommendedLead.map((m) => m.name).join(" + ")}</span>
        <span className="text-[color:var(--ink)]/30">·</span>
        <span className="text-[color:var(--ink)]/50">back: <span className="capitalize">{backLine.map((m) => m.name).join(" + ")}</span></span>
      </div>

      <div className="mt-3 grid gap-2 text-xs text-[color:var(--ink)]/70 sm:grid-cols-4">
        <p>Defense: {breakdown.defenseScore.toFixed(1)}</p>
        <p>Offense: {breakdown.offenseScore.toFixed(1)}</p>
        <p>Ability signals: {breakdown.abilityScore.toFixed(1)}</p>
        <p>Speed: {breakdown.speedScore.toFixed(1)}</p>
      </div>

      {breakdown.sharedWeaknesses.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
          <span className="text-[color:var(--ink)]/50">Shared weaknesses:</span>
          {breakdown.sharedWeaknesses.map((t) => <TypeBadge key={t} type={t} size="sm" />)}
        </div>
      )}

      {breakdown.offensiveGaps.length > 0 && (
        <p className="mt-1 text-xs text-[color:var(--ink)]/50">
          Can&apos;t hit hard: <span className="capitalize">{breakdown.offensiveGaps.join(", ")}</span>
        </p>
      )}

      {strategyNotes.length > 0 && (
        <ul className="mt-3 space-y-1 border-t border-black/10 pt-2 text-xs text-[color:var(--ink)]/70">
          {strategyNotes.map((note, i) => <li key={i}>{note}</li>)}
        </ul>
      )}
    </div>
  );
}