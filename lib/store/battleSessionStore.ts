import { create } from "zustand";
import { FieldState, BattleEvent, BattleConversationTurn } from "@/lib/types";

const EMPTY_FIELD_STATE: FieldState = {
  weather: "none",
  terrain: "none",
  trickRoomTurnsLeft: 0,
  tailwindTurnsLeft: { yours: 0, opponents: 0 },
};

interface BattleSessionState {
  started: boolean;
  yourTeamNames: string[];
  opponentTeamNames: string[];
  fieldState: FieldState;
  currentTurnEvents: BattleEvent[];
  conversation: BattleConversationTurn[];
  turnNumber: number;
  adviceStatus: "idle" | "loading" | "error";

  startSession: (yourTeamNames: string[], opponentTeamNames: string[]) => void;
  resetSession: () => void;
  setFieldState: (updates: Partial<FieldState>) => void;
  addEvent: (fragment: string) => void;
  removeEvent: (id: string) => void;
  submitTurn: () => Promise<void>;
}

const initialState = {
  started: false,
  yourTeamNames: [] as string[],
  opponentTeamNames: [] as string[],
  fieldState: EMPTY_FIELD_STATE,
  currentTurnEvents: [] as BattleEvent[],
  conversation: [] as BattleConversationTurn[],
  turnNumber: 1,
  adviceStatus: "idle" as const,
};

// Deliberately NOT persisted — battle sessions are meant to reset when you
// navigate away (see BattleGuidance's unmount cleanup), unlike teamStore.
export const useBattleSessionStore = create<BattleSessionState>((set, get) => ({
  ...initialState,

  startSession: (yourTeamNames, opponentTeamNames) =>
    set({ ...initialState, started: true, yourTeamNames, opponentTeamNames }),

  resetSession: () => set({ ...initialState }),

  setFieldState: (updates) =>
    set((state) => ({ fieldState: { ...state.fieldState, ...updates } })),

  addEvent: (fragment) =>
    set((state) => ({
      currentTurnEvents: [...state.currentTurnEvents, { id: crypto.randomUUID(), sentenceFragment: fragment }],
    })),

  removeEvent: (id) =>
    set((state) => ({ currentTurnEvents: state.currentTurnEvents.filter((e) => e.id !== id) })),

  submitTurn: async () => {
    const state = get();
    if (state.currentTurnEvents.length === 0) return;

    const fieldSummary = describeFieldState(state.fieldState);
    const eventsSummary = state.currentTurnEvents.map((e) => e.sentenceFragment).join(". ");
    const compiledSentence = [fieldSummary, eventsSummary].filter(Boolean).join(". ") + ".";

    set({ adviceStatus: "loading" });

    try {
      const res = await fetch("/api/battle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          yourTeam: state.yourTeamNames,
          opponentTeam: state.opponentTeamNames,
          conversation: state.conversation,
          newTurnSentence: compiledSentence,
        }),
      });

      if (!res.ok) throw new Error("request failed");
      const data = await res.json();

      set((s) => ({
        conversation: [
          ...s.conversation,
          { role: "user", text: compiledSentence },
          { role: "model", text: data.advice },
        ],
        currentTurnEvents: [],
        turnNumber: s.turnNumber + 1,
        adviceStatus: "idle",
        fieldState: decrementCounters(s.fieldState),
      }));
    } catch {
      set({ adviceStatus: "error" });
    }
  },
}));

function describeFieldState(f: FieldState): string {
  const parts: string[] = [];
  if (f.weather !== "none") parts.push(`Weather is ${f.weather}`);
  if (f.terrain !== "none") parts.push(`${f.terrain} terrain is active`);
  if (f.trickRoomTurnsLeft > 0) parts.push(`Trick Room has ${f.trickRoomTurnsLeft} turns left`);
  if (f.tailwindTurnsLeft.yours > 0) parts.push(`Your Tailwind has ${f.tailwindTurnsLeft.yours} turns left`);
  if (f.tailwindTurnsLeft.opponents > 0) parts.push(`Opponent's Tailwind has ${f.tailwindTurnsLeft.opponents} turns left`);
  return parts.join(", ");
}

// Auto-decrement each submitted turn, per the "only tap when it changes" design.
function decrementCounters(f: FieldState): FieldState {
  return {
    ...f,
    trickRoomTurnsLeft: Math.max(0, f.trickRoomTurnsLeft - 1),
    tailwindTurnsLeft: {
      yours: Math.max(0, f.tailwindTurnsLeft.yours - 1),
      opponents: Math.max(0, f.tailwindTurnsLeft.opponents - 1),
    },
  };
}