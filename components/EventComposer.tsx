"use client";

import { useState } from "react";
import { getCommonSet } from "@/lib/data/commonSets";

const RESULT_OPTIONS = [
  { key: "25", label: "25%" },
  { key: "50", label: "50%" },
  { key: "75", label: "75%" },
  { key: "ko", label: "100% / KO" },
  { key: "miss", label: "Missed" },
  { key: "protect", label: "Protected" },
  { key: "noeffect", label: "No effect" },
] as const;

const STATUS_OPTIONS = ["Burn", "Paralysis", "Sleep", "Poison", "Freeze", "Confusion"] as const;

function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default function EventComposer({
  participants,
  onConfirm,
  onCancel,
}: {
  participants: { name: string; side: "yours" | "opponent" }[];
  onConfirm: (fragment: string) => void;
  onCancel: () => void;
}) {
  const [mode, setMode] = useState<"attack" | "switch">("attack");
  const [actor, setActor] = useState<string | null>(null);
  const [move, setMove] = useState("");
  const [target, setTarget] = useState<string | null>(null);
  const [result, setResult] = useState<(typeof RESULT_OPTIONS)[number]["key"] | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [switchTo, setSwitchTo] = useState("");

  const actorSide = participants.find((p) => p.name === actor)?.side;
  const opposingParticipants = participants.filter((p) => p.side !== actorSide);
  const suggestedMoves = actor ? getCommonSet(actor)?.commonMoves ?? [] : [];

  function handleConfirm() {
    if (!actor) return;
    let fragment = "";
    if (mode === "switch") {
      if (!switchTo.trim()) return;
      fragment = `${cap(actor)} switched out for ${cap(switchTo.trim())}`;
    } else {
      if (!move.trim() || !result) return;
      const resultText =
        result === "miss" ? "missed" :
        result === "protect" ? `was blocked by ${target ? cap(target) : "the target"}'s Protect` :
        result === "noeffect" ? `had no effect on ${target ? cap(target) : "the target"}` :
        result === "ko" ? `dealt enough damage to KO ${target ? cap(target) : "the target"}` :
        `dealt around ${result}% damage to ${target ? cap(target) : "the target"}`;
      fragment = `${cap(actor)}'s ${move.trim()} ${resultText}`;
      if (status) fragment += `, inflicting ${status}`;
    }
    onConfirm(fragment);
  }

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/40 sm:items-center">
      <div className="w-full max-w-md rounded-t-2xl bg-[color:var(--screen)] p-5 sm:rounded-2xl">
        <div className="flex gap-1 rounded-lg bg-black/5 p-1">
          <button type="button" onClick={() => setMode("attack")} className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium ${mode === "attack" ? "bg-white shadow-sm" : "opacity-50"}`}>Attack / Move</button>
          <button type="button" onClick={() => setMode("switch")} className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium ${mode === "switch" ? "bg-white shadow-sm" : "opacity-50"}`}>Switch</button>
        </div>

        <div className="mt-4">
          <p className="text-xs font-medium uppercase text-[color:var(--ink)]/40">Who acted</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {participants.map((p) => (
              <button
                key={p.name}
                type="button"
                onClick={() => { setActor(p.name); setTarget(null); }}
                className={`rounded-full px-3 py-1 text-sm capitalize ${actor === p.name ? "bg-[color:var(--shell-accent)] text-white" : "bg-black/10 text-[color:var(--ink)]"}`}
              >
                {p.name}
              </button>
            ))}
          </div>
        </div>

        {mode === "attack" ? (
          <>
            <div className="mt-4">
              <p className="text-xs font-medium uppercase text-[color:var(--ink)]/40">Move</p>
              {suggestedMoves.length > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {suggestedMoves.map((m) => (
                    <button key={m} type="button" onClick={() => setMove(m)} className={`rounded-full px-3 py-1 text-sm ${move === m ? "bg-[color:var(--accent-gold)] text-black" : "bg-black/10 text-[color:var(--ink)]"}`}>
                      {m}
                    </button>
                  ))}
                </div>
              )}
              <input
                value={move}
                onChange={(e) => setMove(e.target.value)}
                placeholder="Or type a move…"
                className="mt-2 w-full rounded-md border border-black/10 bg-white px-3 py-2 text-sm text-[color:var(--ink)] outline-none"
              />
            </div>

            {actor && (
              <div className="mt-4">
                <p className="text-xs font-medium uppercase text-[color:var(--ink)]/40">Target</p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {opposingParticipants.map((p) => (
                    <button
                      key={p.name}
                      type="button"
                      onClick={() => setTarget(p.name)}
                      className={`rounded-full px-3 py-1 text-sm capitalize ${target === p.name ? "bg-[color:var(--shell-accent)] text-white" : "bg-black/10 text-[color:var(--ink)]"}`}
                    >
                      {p.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-4">
              <p className="text-xs font-medium uppercase text-[color:var(--ink)]/40">Result</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {RESULT_OPTIONS.map((r) => (
                  <button key={r.key} type="button" onClick={() => setResult(r.key)} className={`rounded-full px-3 py-1 text-sm ${result === r.key ? "bg-[color:var(--shell-accent)] text-white" : "bg-black/10 text-[color:var(--ink)]"}`}>
                    {r.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4">
              <p className="text-xs font-medium uppercase text-[color:var(--ink)]/40">Status inflicted (optional)</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {STATUS_OPTIONS.map((s) => (
                  <button key={s} type="button" onClick={() => setStatus(status === s ? null : s)} className={`rounded-full px-3 py-1 text-sm ${status === s ? "bg-[color:var(--accent-gold)] text-black" : "bg-black/10 text-[color:var(--ink)]"}`}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div className="mt-4">
            <p className="text-xs font-medium uppercase text-[color:var(--ink)]/40">Switched in</p>
            <input
              value={switchTo}
              onChange={(e) => setSwitchTo(e.target.value)}
              placeholder="Species switching in…"
              className="mt-1.5 w-full rounded-md border border-black/10 bg-white px-3 py-2 text-sm capitalize text-[color:var(--ink)] outline-none"
            />
          </div>
        )}

        <div className="mt-5 flex gap-2">
          <button type="button" onClick={onCancel} className="flex-1 rounded-md bg-black/10 px-3 py-2 text-sm font-medium text-[color:var(--ink)]">Cancel</button>
          <button type="button" onClick={handleConfirm} className="flex-1 rounded-md bg-[color:var(--shell-accent)] px-3 py-2 text-sm font-medium text-white">Add event</button>
        </div>
      </div>
    </div>
  );
}