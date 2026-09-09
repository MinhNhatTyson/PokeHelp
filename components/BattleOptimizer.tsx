"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useTeamStore } from "@/lib/store/teamStore";
import { useOpponentTeamStore, OPPONENT_TEAM_SIZE } from "@/lib/store/opponentTeamStore";
import { rankBringFourCombos, statsFromEntries, CoverageMon } from "@/lib/logic/battleOptimizer";
import OpponentSlotPicker from "@/components/OpponentSlotPicker";
import ComboResultCard from "@/components/ComboResultCard";
import { getCommonSet } from "@/lib/data/commonSets";

export default function BattleOptimizer() {
  const userSlots = useTeamStore((s) => s.slots);
  const opponentSlots = useOpponentTeamStore((s) => s.slots);
  const clearOpponentTeam = useOpponentTeamStore((s) => s.clearTeam);
  const [showAll, setShowAll] = useState(false);

  const userReady = userSlots.every((s) => s.pokemon && s.abilityName);
  const opponentReady = opponentSlots.every((s) => s.pokemon);

  const userCoverage: CoverageMon[] = useMemo(
    () => userSlots.map((s) => ({
      name: s.pokemon?.name ?? "", types: s.pokemon?.types ?? [], abilityName: s.abilityName,
      stats: s.pokemon ? statsFromEntries(s.pokemon.stats) : undefined,
    })),
    [userSlots]
  );
  const opponentCoverage: CoverageMon[] = useMemo(
    () => opponentSlots.map((s) => {
      const commonSet = s.pokemon ? getCommonSet(s.pokemon.name) : null;
      const effective = s.megaFormDetail ?? s.pokemon;
      const abilityName = s.megaFormDetail ? commonSet?.megaForm?.formAbility ?? null : s.abilityName;
      return {
        name: s.pokemon?.name ?? "", // keep displaying the base/preview species name
        types: effective?.types ?? [],
        abilityName,
        stats: effective ? statsFromEntries(effective.stats) : undefined,
      };
    }),
    [opponentSlots]
  );

  const results = useMemo(() => {
    if (!userReady || !opponentReady) return null;
    return rankBringFourCombos(userCoverage, opponentCoverage);
  }, [userReady, opponentReady, userCoverage, opponentCoverage]);

  return (
    <div className="w-full max-w-5xl rounded-2xl border-4 border-[color:var(--shell)] bg-[color:var(--shell)] shadow-none">
      <div className="h-2 rounded-t-lg bg-[color:var(--shell-accent)]" />

      <div className="rounded-b-lg bg-[color:var(--screen)] p-6 sm:p-8">
        <h1 className="font-display text-2xl sm:text-3xl text-[color:var(--ink)]">Battle optimizer</h1>
        <p className="mt-1 text-sm text-[color:var(--ink)]/70">
          Set your opponent&apos;s team preview, and we&apos;ll rank which 4 of your 6 to bring — based on
          type coverage and a curated set of ability signals (weather, Intimidate, key immunities).
        </p>

        {!userReady && (
          <p className="mt-4 rounded-md bg-black/5 px-4 py-3 text-sm text-[color:var(--ink)]/70">
            Your team isn&apos;t fully set yet — every slot needs a Pokémon and an ability.{" "}
            <Link href="/team" className="underline underline-offset-2">Finish it in Team Builder →</Link>
          </p>
        )}

        <div className="mt-6">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg text-[color:var(--ink)]">Opponent&apos;s team preview</h2>
            <button type="button" onClick={clearOpponentTeam} className="text-sm text-[color:var(--ink)]/50 hover:underline">
              Reset opponent
            </button>
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: OPPONENT_TEAM_SIZE }, (_, i) => <OpponentSlotPicker key={i} index={i} />)}
          </div>
        </div>

        {results && (
          <div className="mt-8 border-t border-black/10 pt-6">
            <h2 className="font-display text-lg text-[color:var(--ink)]">Recommended lineups</h2>
            <p className="mt-1 text-xs text-[color:var(--ink)]/50">
              Heuristic score from type coverage + ability signals — not a moveset-level simulation. Use it as a starting point, not gospel.
            </p>
            <div className="mt-4 space-y-3">
              {(showAll ? results : results.slice(0, 3)).map((r, i) => (
                <ComboResultCard key={r.indices.join("-")} rank={i + 1} result={r} />
              ))}
            </div>
            {!showAll && results.length > 3 && (
              <button type="button" onClick={() => setShowAll(true)} className="mt-3 text-sm text-[color:var(--ink)]/60 underline-offset-2 hover:underline">
                Show all {results.length} combinations
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}