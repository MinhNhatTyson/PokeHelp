"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useBattleHistoryStore } from "@/lib/store/battleHistoryStore";
import Link from "next/link";
import { useTeamStore } from "@/lib/store/teamStore";
import { useOpponentTeamStore } from "@/lib/store/opponentTeamStore";
import { useBattleSessionStore, captureLiveSession, previewEndOfTurn } from "@/lib/store/battleSessionStore";
import StatusBadge from "@/components/StatusBadge";
import EventComposer from "@/components/EventComposer";
import FieldStatusPanel from "@/components/FieldStatusPanel";
import BackToOptimizer from "@/components/BackToOptimizer";
import HpBar from "@/components/HpBar";

function toggleSelection(list: string[], setList: (v: string[]) => void, name: string, max: number) {
  if (list.includes(name)) setList(list.filter((n) => n !== name));
  else if (list.length < max) setList([...list, name]);
}

export default function BattleGuidance() {
  const teamSlots = useTeamStore((s) => s.slots);
  const opponentSlots = useOpponentTeamStore((s) => s.slots);

  const {
    started, activeBattlers, fainted, hp, status, lastResiduals, yourTeamNames, opponentTeamNames, currentTurnEvents,
    conversation, turnNumber, adviceStatus,
    startSession, resetSession, addEvent, removeEvent, switchActiveBattler, submitTurn, initialLeads
  } = useBattleSessionStore();

  const [showComposer, setShowComposer] = useState(false);
  const [composerPreset, setComposerPreset] = useState<{ mode: "move" | "switch"; actor: string | null }>({ mode: "move", actor: null });
  const logBattle = useBattleHistoryStore((s) => s.logBattle);
  const [ending, setEnding] = useState(false);
  const [outcome, setOutcome] = useState<"win" | "loss" | null>(null);
  const [reason, setReason] = useState("");

    function closeSession(logged: boolean) {
    captureLiveSession({ outcome, reason: reason.trim(), logged });
    setEnding(false); setOutcome(null); setReason("");
    resetSession();
  }

  function endWithoutSaving() { closeSession(false); }

  function finishSession() {
    if (!outcome) return;
    const opp = initialLeads?.opponent ?? [];
    logBattle({
      yourTeamNames,
      opponentTeamNames,
      recommendedLead: (initialLeads?.yours ?? []).filter((n): n is string => n !== null),
      outcome,
      reason: reason.trim(),
      opponentLeads: opp.length === 2 && opp.every(Boolean) ? (opp as string[]) : undefined,
    });
    closeSession(true);
  }
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
          <BackToOptimizer />
          <h1 className="font-logo text-2xl text-[color:var(--ink)]">Live battle guidance</h1>
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
                    className={`rounded-full px-4 py-2 text-sm capitalize ${yourBringFour.includes(name) ? "bg-[color:var(--shell-accent)] text-white" : "bg-black/10 text-[color:var(--ink)]"}`}
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
                        className={`rounded-full px-4 py-2 text-sm capitalize ${yourLeads.includes(name) ? "bg-[color:var(--shell-accent)] text-white" : "bg-black/10 text-[color:var(--ink)]"}`}
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
                    className={`rounded-full px-4 py-2 text-sm capitalize ${opponentLeads.includes(name) ? "bg-[color:var(--shell-accent)] text-white" : "bg-black/10 text-[color:var(--ink)]"}`}
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
    ...activeBattlers.yours.filter((n): n is string => n !== null).map((name) => ({ name, side: "yours" as const, fainted: fainted.yours.includes(name) })),
    ...activeBattlers.opponent.filter((n): n is string => n !== null).map((name) => ({ name, side: "opponent" as const, fainted: fainted.opponent.includes(name) })),
  ];

  // All 4 of one side down = the battle is over. Both at once is ambiguous, so no suggestion.
  const youOut = yourTeamNames.length > 0 && fainted.yours.length >= yourTeamNames.length;
  const oppOut = fainted.opponent.length >= 4;
  const wipeout: "win" | "loss" | null = youOut && oppOut ? null : youOut ? "loss" : oppOut ? "win" : null;
  const eotPreview = previewEndOfTurn();

  return (
    <div className="w-full max-w-lg rounded-2xl border-4 border-[color:var(--shell)] bg-[color:var(--shell)] shadow-none">
      <div className="h-2 rounded-t-lg bg-[color:var(--shell-accent)]" />
      <div className="rounded-b-lg bg-[color:var(--screen)] p-5 sm:p-6">
        <BackToOptimizer confirmMessage="Leave Live Battle? The current session will be lost." />
        <div className="flex items-center justify-between">
          <h1 className="font-logo text-xl text-[color:var(--ink)]">Turn {turnNumber}</h1>
          <button
            type="button"
            onClick={() => setEnding(true)}
            className="btn-tactile rounded-full bg-black/10 px-3.5 py-2 text-xs font-medium text-[color:var(--ink)]"
          >
            End session
          </button>
        </div>

        {ending && (
          <div className="mt-3 rounded-lg border border-[color:var(--accent-gold)]/60 bg-black/5 p-3">
            <p className="text-xs font-medium uppercase text-[color:var(--ink)]/40">How did it go? (saved to Battle History)</p>
            <div className="mt-2 flex gap-2">
              {(["win", "loss"] as const).map((o) => (
                <button
                  key={o}
                  type="button"
                  onClick={() => setOutcome(o)}
                  className={`btn-tactile min-h-[44px] flex-1 rounded-lg text-sm font-semibold capitalize ${
                    outcome === o ? (o === "win" ? "bg-emerald-600 text-white" : "bg-red-600 text-white") : "bg-black/10 text-[color:var(--ink)]"
                  }`}
                >
                  {o}
                </button>
              ))}
            </div>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
              placeholder="Main reason (optional) — what went right or wrong?"
              className="mt-2 w-full resize-none rounded-md border border-black/10 bg-white px-3 py-2 text-sm text-[color:var(--ink)] outline-none placeholder:text-black/30 focus-visible:ring-2 focus-visible:ring-[color:var(--accent-gold)]"
            />
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={finishSession}
                disabled={!outcome}
                className="btn-tactile btn-glow-accent min-h-[44px] flex-1 rounded-lg bg-[color:var(--shell-accent)] px-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                Save &amp; end
              </button>
              <button type="button" onClick={endWithoutSaving} className="btn-tactile min-h-[44px] rounded-lg bg-black/10 px-3 text-sm text-[color:var(--ink)]">
                End without saving
              </button>
              <button type="button" onClick={() => setEnding(false)} className="min-h-[44px] px-2 text-sm text-[color:var(--ink)]/60 hover:underline">
                Keep playing
              </button>
            </div>
          </div>
        )}

        {wipeout && !ending && (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[color:var(--accent-gold)]/60 bg-[color:var(--accent-gold)]/25 px-3 py-2 text-sm text-[color:var(--ink)]">
            <span>
              {wipeout === "win" ? "All 4 of their Pokémon have fainted — that looks like a win." : "All 4 of your Pokémon have fainted — that looks like a loss."}
            </span>
            <button
              type="button"
              onClick={() => { setOutcome(wipeout); setEnding(true); }}
              className="btn-tactile min-h-[40px] rounded-full bg-[color:var(--shell-accent)] px-4 text-xs font-semibold text-white"
            >
              End session as {wipeout === "win" ? "Win" : "Loss"}
            </button>
          </div>
        )}

        <FieldStatusPanel />

        {conversation.length > 0 && (
          <div
            className={`pokecard mt-4 transition-opacity ${adviceStatus === "loading" ? "opacity-60" : ""}`}
            style={{ borderColor: "var(--accent-gold)" }}
          >
            <div className="flex items-center justify-between bg-gradient-to-r from-[color:var(--shell-accent)] to-[color:var(--accent-gold)] px-3 py-1.5">
              <span className="font-heading text-sm uppercase tracking-wide text-white">Advice</span>
              <span className="text-xs font-medium text-white/90">for turn {turnNumber}</span>
            </div>
            <p className="px-4 py-3 text-base leading-relaxed text-[color:var(--ink)]">
              {conversation[conversation.length - 1].text}
            </p>
          </div>
        )}

        {lastResiduals.length > 0 && (
          <div className="mt-2 rounded-lg border border-black/10 bg-white p-3">
            <p className="text-xs font-medium uppercase text-[color:var(--ink)]/40">End of turn {turnNumber - 1}</p>
            <ul className="mt-1.5 space-y-1 text-xs text-[color:var(--ink)]/80">
              {lastResiduals.map((n, i) => <li key={i}>{n}</li>)}
            </ul>
          </div>
        )}

        <div className="mt-4">
          <p className="text-xs font-medium uppercase text-[color:var(--ink)]/40">Currently on the field — tap one to switch it out</p>
          <div className="mt-1.5 grid grid-cols-2 gap-2">
            {participants.map((p) => {
              const pct = hp[p.side][p.name] ?? 100;
              return (
                <button
                  key={`${p.side}-${p.name}`}
                  type="button"
                  onClick={() => { setComposerPreset({ mode: "switch", actor: p.name }); setShowComposer(true); }}
                  className={`btn-tactile rounded-lg border-2 p-2 text-left ${
                    p.fainted ? "border-black/10 bg-black/5 opacity-60"
                    : p.side === "yours" ? "border-[color:var(--accent-gold)] bg-white" : "border-black/10 bg-white"
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className={`truncate text-sm font-medium capitalize text-[color:var(--ink)] ${p.fainted ? "line-through" : ""}`}>{p.name}</span>
                    <StatusBadge status={status[p.side][p.name]} />
                    <span aria-hidden="true" className="shrink-0 text-[10px] text-[color:var(--ink)]/60">{p.fainted ? "✕ replace" : "⇄"}</span>
                  </div>
                  <div className="mt-1.5 flex items-center gap-1.5">
                    <span className="font-dex text-[10px] text-[color:var(--ink)]/50">HP</span>
                    <HpBar pct={pct} className="h-2 flex-1" />
                    <span className="w-9 text-right text-[11px] tabular-nums text-[color:var(--ink)]">{pct}%</span>
                  </div>
                  <span className="mt-1 block text-[10px] uppercase tracking-wide text-[color:var(--ink)]/40">
                    {p.side === "yours" ? "You" : "Opponent"}
                  </span>
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-[11px] text-[color:var(--ink)]/50">
            Your bench: <span className="capitalize">{yourTeamNames.filter((n) => !participants.some((p) => p.name === n) && !fainted.yours.includes(n)).map((n) => `${n} ${hp.yours[n] ?? 100}%`).join(", ") || "none"}</span>
          </p>
          <p className="mt-0.5 text-[11px] text-[color:var(--ink)]/50">
            Remaining — you: {Math.max(0, yourTeamNames.length - fainted.yours.length)}/{yourTeamNames.length} · opponent: {Math.max(0, 4 - fainted.opponent.length)}/4
            {fainted.yours.length + fainted.opponent.length > 0 && (
              <> · fainted: <span className="capitalize">{[...fainted.yours, ...fainted.opponent].join(", ")}</span></>
            )}
          </p>
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
                <button
                  type="button"
                  onClick={() => removeEvent(e.id)}
                  aria-label="Remove event"
                  className="ml-2 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-lg text-[color:var(--ink)]/50 hover:bg-black/10 hover:text-red-600"
                >
                  ×
                </button>
              </div>
            ))}
          </div>     
          {eotPreview.length > 0 && (
            <div className="mt-2 rounded-md border border-dashed border-black/20 px-3 py-2">
              <p className="text-[10px] font-medium uppercase tracking-wide text-[color:var(--ink)]/40">Applied automatically at end of turn</p>
              <ul className="mt-1 space-y-0.5 text-xs text-[color:var(--ink)]/70">
                {eotPreview.map((n, i) => <li key={i}>{n}</li>)}
              </ul>
            </div>
          )}     
        </div>

        {adviceStatus === "error" && (
          <p className="mt-2 text-sm text-red-500">Couldn&apos;t reach the strategy assistant. Try again.</p>
        )}

        {!ending &&
          createPortal(
            <div className="fixed inset-x-0 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-20 border-t-2 border-[color:var(--accent-gold)] bg-[color:var(--shell)] px-4 py-3 lg:bottom-0">
              <div className="mx-auto flex max-w-lg items-center gap-2">
                <button
                  type="button"
                  onClick={() => { setComposerPreset({ mode: "move", actor: null }); setShowComposer(true); }}
                  className="btn-tactile btn-glow-gold flex min-h-[48px] flex-1 items-center justify-center gap-1.5 rounded-xl bg-[color:var(--accent-gold)] px-3 text-sm font-semibold text-black"
                >
                  + Add event
                  {currentTurnEvents.length > 0 && (
                    <span className="rounded-full bg-black/20 px-2 py-0.5 text-xs">{currentTurnEvents.length}</span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={submitTurn}
                  disabled={currentTurnEvents.length === 0 || adviceStatus === "loading"}
                  className="btn-tactile btn-glow-accent flex min-h-[48px] flex-[1.4] items-center justify-center rounded-xl bg-[color:var(--shell-accent)] px-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {adviceStatus === "loading" ? "Thinking…" : "Get advice"}
                </button>
              </div>
            </div>,
            document.body
          )}

        <div className="h-16" aria-hidden="true" />

        {showComposer && (
          <EventComposer
            participants={participants}
            yourTeamNames={yourTeamNames}
            opponentTeamNames={opponentTeamNames}
            initialMode={composerPreset.mode}
            initialActor={composerPreset.actor}
            fainted={fainted}
            onConfirm={(fragment, extra) => { addEvent(fragment, extra); setShowComposer(false); }}
            onSwitch={switchActiveBattler}
            onCancel={() => setShowComposer(false)}
          />
        )}
      </div>
    </div>
  );
}