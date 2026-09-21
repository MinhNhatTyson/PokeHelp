"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTeamStore } from "@/lib/store/teamStore";
import { useOpponentTeamStore } from "@/lib/store/opponentTeamStore";
import { useBattleSessionStore } from "@/lib/store/battleSessionStore";
import EventComposer from "@/components/EventComposer";
import FieldStatusPanel from "@/components/FieldStatusPanel";

function toggleSelection(list: string[], setList: (v: string[]) => void, name: string, max: number) {
  if (list.includes(name)) setList(list.filter((n) => n !== name));
  else if (list.length < max) setList([...list, name]);
}

export default function BattleGuidance() {
  const teamSlots = useTeamStore((s) => s.slots);
  const opponentSlots = useOpponentTeamStore((s) => s.slots);

  const {
    started, activeBattlers, yourTeamNames, opponentTeamNames, currentTurnEvents,
    conversation, turnNumber, adviceStatus,
    startSession, resetSession, addEvent, removeEvent, switchActiveBattler, submitTurn,
  } = useBattleSessionStore();

  const [showComposer, setShowComposer] = useState(false);
  const [yourBringFour, setYourBringFour] = useState<string[]>([]);
  const [yourLeads, setYourLeads] = useState<string[]>([]);
  const [opponentLeads, setOpponentLeads] = useState<string[]>([]);

  // Auto-reset when leaving this page, per design — a session doesn't
  // survive navigating to another tab of the app.
  useEffect(() => {
    return () => { resetSession(); };
  }, [resetSession]);

  const yourBuiltNames = teamSlots.filter((s) => s.pokemon).map((s) => s.pokemon!.name);
  // Team Preview reveals the opponent's full roster by species — but never
  // which 4 they'll actually bring, so we only ever ask "who are they
  // leading with", not "which 4 did they bring" (that's their call, and it
  // only becomes known turn by turn via Switch events).
  const opponentPreviewNames = opponentSlots.filter((s) => s.pokemon).map((s) => s.pokemon!.name);

  if (!started) {
    const canStart = yourBuiltNames.length > 0 && opponentPreviewNames.length > 0;
    const bringFourDone = yourBringFour.length === 4;
    const readyToConfirm = bringFourDone && yourLeads.length === 2 && opponentLeads.length === 2;

    return (
      <div className="w-full max-w-lg rounded-2xl border-4 border-[color:var(--shell)] bg-[color:var(--shell)] shadow-none">
        <div className="h-2 rounded-t-lg bg-[color:var(--shell-accent)]" />
        <div className="rounded-b-lg bg-[color:var(--screen)] p-6 sm:p-8">
          <h1 className="font-display text-2xl text-[color:var(--ink)]">Live battle guidance</h1>
          <p className="mt-1 text-sm text-[color:var(--ink)]/70">
            Pick who you&apos;re bringing, set your leads, and log each turn for quick advice on the next one.
          </p>

          {!canStart ? (
            <p className="mt-4 rounded-md bg-black/5 px-4 py-3 text-sm text-[color:var(--ink)]/70">
              Set your team in <Link href="/team" className="underline underline-offset-2">Team Builder</Link> and
              the opponent&apos;s preview in <Link href="/optimizer" className="underline underline-offset-2">Battle Optimizer</Link> first.
            </p>
          ) : (
            <div className="mt-4">
              <p className="text-xs font-medium uppercase text-[color:var(--ink)]/40">
                Your bring-4 (pick 4 of your {yourBuiltNames.length})
              </p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {yourBuiltNames.map((name) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => {
                      const willRemove = yourBringFour.includes(name);
                      toggleSelection(yourBringFour, setYourBringFour, name, 4);
                      if (willRemove) setYourLeads((prev) => prev.filter((n) => n !== name));
                    }}
                    className={`rounded-full px-3 py-1 text-sm capitalize ${yourBringFour.includes(name) ? "bg-[color:var(--shell-accent)] text-white" : "bg-black/10 text-[color:var(--ink)]"}`}
                  >
                    {name}
                  </button>
                ))}
              </div>

              {bringFourDone && (
                <>
                  <p className="mt-3 text-xs font-medium uppercase text-[color:var(--ink)]/40">Your leads (pick 2 of your bring-4)</p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {yourBringFour.map((name) => (
                      <button
                        key={name}
                        type="button"
                        onClick={() => toggleSelection(yourLeads, setYourLeads, name, 2)}
                        className={`rounded-full px-3 py-1 text-sm capitalize ${yourLeads.includes(name) ? "bg-[color:var(--shell-accent)] text-white" : "bg-black/10 text-[color:var(--ink)]"}`}
                      >
                        {name}
                      </button>
                    ))}
                  </div>
                </>
              )}

              <p className="mt-3 text-xs font-medium uppercase text-[color:var(--ink)]/40">
                Opponent&apos;s leads (pick 2 — you don&apos;t know their bring-4, only who they send out)
              </p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {opponentPreviewNames.map((name) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => toggleSelection(opponentLeads, setOpponentLeads, name, 2)}
                    className={`rounded-full px-3 py-1 text-sm capitalize ${opponentLeads.includes(name) ? "bg-[color:var(--shell-accent)] text-white" : "bg-black/10 text-[color:var(--ink)]"}`}
                  >
                    {name}
                  </button>
                ))}
              </div>

              <button
                type="button"
                disabled={!readyToConfirm}
                onClick={() => startSession(yourBringFour, opponentPreviewNames, { yours: yourLeads, opponent: opponentLeads })}
                className="mt-5 w-full rounded-md bg-[color:var(--shell-accent)] px-3 py-2.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                Start battle session
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Only what's actually on the field right now — not the full brought/previewed rosters.
  const participants = [
    ...activeBattlers.yours.filter((n): n is string => n !== null).map((name) => ({ name, side: "yours" as const })),
    ...activeBattlers.opponent.filter((n): n is string => n !== null).map((name) => ({ name, side: "opponent" as const })),
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

        <FieldStatusPanel />

        {conversation.length > 0 && (
          <div className="mt-4 rounded-lg border border-[color:var(--accent-gold)]/40 bg-black/5 p-3 text-sm text-[color:var(--ink)]">
            <p className="mb-1 text-xs font-medium uppercase text-[color:var(--ink)]/40">Advice</p>
            <p>{conversation[conversation.length - 1].text}</p>
          </div>
        )}

        <div className="mt-4">
          <p className="text-xs font-medium uppercase text-[color:var(--ink)]/40">Currently on the field</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5 text-xs">
            {participants.map((p) => (
              <span
                key={`${p.side}-${p.name}`}
                className={`rounded-full px-2.5 py-1 capitalize ${p.side === "yours" ? "bg-[color:var(--accent-gold)] text-black" : "bg-black/10 text-[color:var(--ink)]"}`}
              >
                {p.name}
              </span>
            ))}
          </div>
        </div>

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
            yourTeamNames={yourTeamNames}
            opponentTeamNames={opponentTeamNames}
            onConfirm={(fragment) => { addEvent(fragment); setShowComposer(false); }}
            onSwitch={switchActiveBattler}
            onCancel={() => setShowComposer(false)}
          />
        )}
      </div>
    </div>
  );
}