import { NextRequest, NextResponse } from "next/server";
import { callGemini, extractText, geminiFailure } from "@/lib/server/gemini";
import { describeMegaForm } from "@/lib/data/commonSets";

interface GeminiTurn {
  role: "user" | "model";
  text: string;
}

interface BattleRequestBody {
  yourTeam: string[];
  opponentTeam: string[];
  conversation: GeminiTurn[]; // prior turns, NOT including the new one
  newTurnSentence: string;
  activeNote?: string;
  yourLoadouts?: { name: string; item: string | null; ability: string | null; nature: string | null; moves: string[] }[];
  opponentGuesses?: { name: string; types: string[]; item: string | null; ability: string | null; itemConfirmed?: boolean; abilityConfirmed?: boolean }[];
  model?: string;
}

function buildSystemInstruction(megaLines: string[], roster: string) {
  return `You are a live Pokémon Champions doubles (VGC) in-battle assistant. Rules: Level 50, bring 4 of 6, and Mega Evolution is the ONLY battle gimmick this season. 
  There is NO Terastallization or Dynamax, so never suggest them. Each side may Mega Evolve at most one Pokémon per battle. 
  A Mega Evolution happens before that Pokémon moves; its new typing, ability and Speed apply immediately, so re-evaluate weaknesses, immunities and turn order once a Mega is logged. 
  Before it Mega Evolves, a Pokémon keeps its base typing and ability.
  ${megaLines.length ? `Possible Mega forms in this match:\n${megaLines.join("\n")}\n` : ""}
  ${roster}
  After each turn, give SHORT, actionable advice (2-4 sentences max) for next turn: move choices, targeting, switches (name the exact bench Pokémon to bring in and why), Protect timing, and when to Mega Evolve. 
  Fainted Pokémon can never be targeted or switched back in, so only suggest bench Pokémon that have not fainted. A side loses once all 4 of its Pokémon have fainted, so weigh the remaining counts in your advice. 
  HP values are percentages of max HP: use them to judge KO ranges, Focus Sash/Sturdy, and when to Protect or switch. 
  Status conditions (burn, poison, bad poison) and item/weather/terrain residual HP effects are applied automatically at the end of each turn and listed in the turn log as "End of turn: …"; trust the HP values given and do not count those effects twice. Burn halves physical damage and paralysis cuts Speed, so factor active status conditions into your advice.
  Turn-log entries may include "(calc expected X–Y%)". That range comes from the Gen 9 damage formula using assumed spreads. If the logged damage falls outside it, the real set differs from the guess (item, ability, bulk or nature), so say what that implies for the opponent.
  Be direct and specific. Do not restate the turn log. Prefer moves from the player's known move lists. For the opponent, only use moves revealed in the log or standard for that species, and say when you are guessing.`;
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "GEMINI_API_KEY not configured" }, { status: 500 });
  }

  const body: BattleRequestBody = await req.json();
  const { yourTeam, opponentTeam, conversation, newTurnSentence, activeNote, model, yourLoadouts, opponentGuesses } = body;

  const fmt = (s: string | null | undefined) => (s ? s.replace(/-/g, " ") : "unknown");
  const roster = [
    "Player's bring-4 (known sets):",
    ...(yourLoadouts?.length
      ? yourLoadouts.map((m) => `- ${m.name}: ability ${fmt(m.ability)}, item ${fmt(m.item)}, ${m.nature ?? "neutral"} nature, moves: ${m.moves.join(", ") || "unknown"}`)
      : yourTeam.map((n) => `- ${n}`)),
    "Opponent's team preview (they bring only 4 of these; anything not marked confirmed is a GUESS from common sets, and the player records real reveals during the battle, so trust confirmed info over guesses):",
    ...(opponentGuesses?.length
      ? opponentGuesses.map((m) => {
        const item = m.itemConfirmed && m.item === null ? "none (confirmed)" : `${fmt(m.item)} (${m.itemConfirmed ? "confirmed" : "guess"})`;
        return `- ${m.name} [${m.types.join("/")}]: ability ${fmt(m.ability)} (${m.abilityConfirmed ? "confirmed" : "guess"}), item ${item}`;
      })
      : opponentTeam.map((n) => `- ${n}`)),
  ].join("\n");

  const contents = [
    ...conversation.map((t) => ({ role: t.role, parts: [{ text: t.text }] })),
    { role: "user" as const, parts: [{ text: activeNote ? `${newTurnSentence} (${activeNote}.)` : newTurnSentence }] },
  ];
  const megaLines = [...yourTeam, ...opponentTeam]
  .map((n) => { const d = describeMegaForm(n); return d ? `${n} -> ${d}` : null; })
  .filter((l): l is string => l !== null);

    const result = await callGemini(
    apiKey,
    {
      systemInstruction: { parts: [{ text: buildSystemInstruction(megaLines, roster) }] },
      contents,
      generationConfig: { temperature: 0.6, maxOutputTokens: 1024, thinkingConfig: { thinkingBudget: 0 } },
    },
    model
  );
  if (!result.ok) return geminiFailure(result);

  const advice = extractText(result.data);
  if (!advice) {
    console.error("Empty response from Gemini:", JSON.stringify(result.data));
    return NextResponse.json({ error: "Empty response from Gemini" }, { status: 502 });
  }
  return NextResponse.json({ advice, model: result.model });
}