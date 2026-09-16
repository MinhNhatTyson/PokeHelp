"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTeamStore } from "@/lib/store/teamStore";
import { useOpponentTeamStore } from "@/lib/store/opponentTeamStore";
import { useBattleSessionStore } from "@/lib/store/battleSessionStore";
import EventComposer from "@/components/EventComposer";

const WEATHER_OPTIONS = ["none", "rain", "sun", "sand", "snow"] as const;
const TERRAIN_OPTIONS = ["none", "electric", "grassy", "misty", "psychic"] as const;

export default function BattleGuidance() {
  const teamSlots = useTeamStore((s) => s.slots);
  const opponentSlots = useOpponentTeamStore((s) => s.slots);

  const {
    started, yourTeamNames, opponentTeamNames, fieldState, currentTurnEvents,
    conversation, turnNumber, adviceStatus,
    startSession, resetSession, setFieldState, addEvent, removeEvent, submitTurn,
  } = useBattleSessionStore();

  const [showComposer, setShowComposer] = useState(false);

  // Auto-reset when leaving this page, per design — a session doesn't
  // survive navigating to another tab of the app.
  useEffect(() => {
    return () => { resetSession(); };
  }, [resetSession]);

  const yourReadyNames = teamSlots.filter((s) => s.pokemon).map((s) => s.pokemon!.name);
  const opponentReadyNames = opponentSlots.filter((s) => s.pokemon).map((s) => s.pokemon!.name);

  if (!started) {
    const canStart = yourReadyNames.length > 0 && opponentReadyNames.length > 0;
    return (
      <div className="w-full max-w-lg rounded-2xl border-4 border-[color:var(--shell)] bg-[color:var(--shell)] shadow-none">
        <div className="h-2 rounded-t-lg bg-[color:var(--shell-accent)]" />
        <div className="rounded-b-lg bg-[color:var(--screen)] p-6 sm:p-8">
          <h1 className="font-display text-2xl text-[color:var(--ink)]">Live battle guidance</h1>
          <p className="mt-1 text-sm text-[color:var(--ink)]/70">
            Log what happens each turn and get quick advice for the next one. Session resets when you leave this page.
          </p>

          {!canStart ? (
            <p className="mt-4 rounded-md bg-black/5 px-4 py-3 text-sm text-[color:var(--ink)]/70">
              Set your team in <Link href="/team" className="underline underline-offset-2">Team Builder</Link> and
              the opponent&apos;s preview in <Link href="/optimizer" className="underline underline-offset-2">Battle Optimizer</Link> first.
            </p>
          ) : (
            <div className="mt-4">
              <p className="text-xs font-medium uppercase text-[color:var(--ink)]/40">Your team</p>
              <p className="mt-1 text-sm capitalize text-[color:var(--ink)]">{yourReadyNames.join(", ")}</p>
              <p className="mt-3 text-xs font-medium uppercase text-[color:var(--ink)]/40">Opponent preview</p>
              <p className="mt-1 text-sm capitalize text-[color:var(--ink)]">{opponentReadyNames.join(", ")}</p>
              <button
                type="button"
                onClick={() => startSession(yourReadyNames, opponentReadyNames)}
                className="mt-5 w-full rounded-md bg-[color:var(--shell-accent)] px-3 py-2.5 text-sm font-medium text-white"
              >
                Start battle session
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  const participants = [
    ...yourTeamNames.map((name) => ({ name, side: "yours" as const })),
    ...opponentTeamNames.map((name) => ({ name, side: "opponent" as const })),
  ];

  return (
    <div className="w-full max-w-lg rounded-2xl border-4 border-[color:var(--shell)] bg-[color:var(--shell)] shadow-none">
      <div className="h-2 rounded-t-lg bg-[color:var(--shell-accent)]" />
      <div className="rounded-b-lg bg-[color:var(--screen)] p-5 sm:p-6">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-xl text-[color:var(--ink)]">Turn {turnNumber}</h1>
          <button type="button" onClick={resetSession} className="text-xs text-[color:var(--ink)]/50 hover:underline">
            End session
          </button>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg bg-black/5 p-2.5 text-xs">
          <button
            type="button"
            onClick={() => setFieldState({ weather: WEATHER_OPTIONS[(WEATHER_OPTIONS.indexOf(fieldState.weather) + 1) % WEATHER_OPTIONS.length] })}
            className="rounded-full bg-white px-2.5 py-1 capitalize text-[color:var(--ink)]"
          >
            🌤 {fieldState.weather}
          </button>
          <button
            type="button"
            onClick={() => setFieldState({ terrain: TERRAIN_OPTIONS[(TERRAIN_OPTIONS.indexOf(fieldState.terrain) + 1) % TERRAIN_OPTIONS.length] })}
            className="rounded-full bg-white px-2.5 py-1 capitalize text-[color:var(--ink)]"
          >
            🌱 {fieldState.terrain}
          </button>
          <div className="flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[color:var(--ink)]">
            <span>TR</span>
            <button type="button" onClick={() => setFieldState({ trickRoomTurnsLeft: Math.max(0, fieldState.trickRoomTurnsLeft - 1) })}>−</button>
            <span className="w-4 text-center">{fieldState.trickRoomTurnsLeft}</span>
            <button type="button" onClick={() => setFieldState({ trickRoomTurnsLeft: fieldState.trickRoomTurnsLeft + 1 })}>+</button>
          </div>
          <div className="flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[color:var(--ink)]">
            <span>TW (you)</span>
            <button type="button" onClick={() => setFieldState({ tailwindTurnsLeft: { ...fieldState.tailwindTurnsLeft, yours: Math.max(0, fieldState.tailwindTurnsLeft.yours - 1) } })}>−</button>
            <span className="w-4 text-center">{fieldState.tailwindTurnsLeft.yours}</span>
            <button type="button" onClick={() => setFieldState({ tailwindTurnsLeft: { ...fieldState.tailwindTurnsLeft, yours: fieldState.tailwindTurnsLeft.yours + 1 } })}>+</button>
          </div>
          <div className="flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[color:var(--ink)]">
            <span>TW (opp)</span>
            <button type="button" onClick={() => setFieldState({ tailwindTurnsLeft: { ...fieldState.tailwindTurnsLeft, opponents: Math.max(0, fieldState.tailwindTurnsLeft.opponents - 1) } })}>−</button>
            <span className="w-4 text-center">{fieldState.tailwindTurnsLeft.opponents}</span>
            <button type="button" onClick={() => setFieldState({ tailwindTurnsLeft: { ...fieldState.tailwindTurnsLeft, opponents: fieldState.tailwindTurnsLeft.opponents + 1 } })}>+</button>
          </div>
        </div>

        {conversation.length > 0 && (
          <div className="mt-4 rounded-lg border border-[color:var(--accent-gold)]/40 bg-black/5 p-3 text-sm text-[color:var(--ink)]">
            <p className="mb-1 text-xs font-medium uppercase text-[color:var(--ink)]/40">Advice</p>
            <p>{conversation[conversation.length - 1].text}</p>
          </div>
        )}

        <div className="mt-4">
          <p className="text-xs font-medium uppercase text-[color:var(--ink)]/40">This turn</p>
          <div className="mt-1.5 space-y-1.5">
            {currentTurnEvents.length === 0 && (
              <p className="text-sm text-[color:var(--ink)]/40">No events logged yet.</p>
            )}
            {currentTurnEvents.map((e) => (
              <div key={e.id} className="flex items-center justify-between rounded-md bg-black/5 px-3 py-1.5 text-sm text-[color:var(--ink)]">
                <span>{e.sentenceFragment}</span>
                <button type="button" onClick={() => removeEvent(e.id)} className="ml-2 text-[color:var(--ink)]/40 hover:text-red-600">×</button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setShowComposer(true)}
            className="mt-2 w-full rounded-md border border-dashed border-black/20 px-3 py-2 text-sm text-[color:var(--ink)]/60 hover:bg-black/5"
          >
            + Add event
          </button>
        </div>

        <button
          type="button"
          onClick={submitTurn}
          disabled={currentTurnEvents.length === 0 || adviceStatus === "loading"}
          className="mt-4 w-full rounded-md bg-[color:var(--shell-accent)] px-3 py-2.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {adviceStatus === "loading" ? "Thinking…" : "Get advice for next turn"}
        </button>
        {adviceStatus === "error" && (
          <p className="mt-2 text-sm text-red-500">Couldn&apos;t reach the strategy assistant. Try again.</p>
        )}

        {showComposer && (
          <EventComposer
            participants={participants}
            onConfirm={(fragment) => { addEvent(fragment); setShowComposer(false); }}
            onCancel={() => setShowComposer(false)}
          />
        )}
      </div>
    </div>
  );
}