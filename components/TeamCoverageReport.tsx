"use client";

import { useState } from "react";
import { TeamDefenseMatrix, TeamOffenseReport } from "@/lib/types";
import TypeBadge from "@/components/TypeBadge";
import TeamDefenseGrid from "@/components/TeamDefenseGrid";

const TABS = [
  { key: "defense", label: "Weaknesses" },
  { key: "offense", label: "Coverage" },
] as const;

export default function TeamCoverageReport({
  defenseMatrix,
  offense,
}: {
  defenseMatrix: TeamDefenseMatrix;
  offense: TeamOffenseReport;
}) {
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("defense");

  return (
    <div className="mt-6 border-t border-black/10 pt-6">
      <div className="flex gap-1 rounded-lg bg-black/5 p-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              tab === t.key ? "bg-white text-[color:var(--ink)] shadow-sm" : "text-[color:var(--ink)]/50 hover:text-[color:var(--ink)]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "defense" ? (
        <div className="mt-4">
          <p className="text-xs text-[color:var(--ink)]/50">
            Rows are your team; columns are attacking types. Bottom row counts members weak to that type.
          </p>
          <div className="mt-3">
            <TeamDefenseGrid matrix={defenseMatrix} />
          </div>
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          <p className="text-xs text-[color:var(--ink)]/50">Based on each member&apos;s own types (STAB), not movesets.</p>
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
      )}
    </div>
  );
}