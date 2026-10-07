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
  model?: string;
}

function buildSystemInstruction(megaLines: string[]) {
  return `You are a live Pokémon Champions doubles (VGC) in-battle assistant. Rules: Level 50, bring 4 of 6, and Mega Evolution is the ONLY battle gimmick this season. 
  There is NO Terastallization or Dynamax, so never suggest them. Each side may Mega Evolve at most one Pokémon per battle. 
  A Mega Evolution happens before that Pokémon moves; its new typing, ability and Speed apply immediately, so re-evaluate weaknesses, immunities and turn order once a Mega is logged. 
  Before it Mega Evolves, a Pokémon keeps its base typing and ability.
  ${megaLines.length ? `Possible Mega forms in this match:\n${megaLines.join("\n")}\n` : ""}
  After each turn, give SHORT, actionable advice (2-4 sentences max) for next turn: move choices, targeting, switches (name the exact bench Pokémon to bring in and why), Protect timing, and when to Mega Evolve. 
  Fainted Pokémon can never be targeted or switched back in, so only suggest bench Pokémon that have not fainted. A side loses once all 4 of its Pokémon have fainted, so weigh the remaining counts in your advice. 
  HP values are percentages of max HP: use them to judge KO ranges, Focus Sash/Sturdy, and when to Protect or switch. 
  Status conditions (burn, poison, bad poison) and item/weather/terrain residual HP effects are applied automatically at the end of each turn and listed in the turn log as "End of turn: …"; trust the HP values given and do not count those effects twice. Burn halves physical damage and paralysis cuts Speed, so factor active status conditions into your advice.
  Be direct and specific. Do not restate the turn log. Do not invent moves/abilities not shown in the log.`;
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "GEMINI_API_KEY not configured" }, { status: 500 });
  }

  const body: BattleRequestBody = await req.json();
  const { yourTeam, opponentTeam, conversation, newTurnSentence, activeNote, model } = body;  

  const contents = [
    ...(conversation.length === 0
      ? [{
          role: "user" as const,
          parts: [{ text: `Your team: ${yourTeam.join(", ")}. Opponent's team preview: ${opponentTeam.join(", ")}. Battle is starting — I'll log each turn as it happens.` }],
        }]
      : []),
    ...conversation.map((t) => ({ role: t.role, parts: [{ text: t.text }] })),
    { role: "user" as const, parts: [{ text: activeNote ? `${newTurnSentence} (${activeNote}.)` : newTurnSentence }] },    
  ];
  const megaLines = [...yourTeam, ...opponentTeam]
  .map((n) => { const d = describeMegaForm(n); return d ? `${n} -> ${d}` : null; })
  .filter((l): l is string => l !== null);

    const result = await callGemini(
    apiKey,
    {
      systemInstruction: { parts: [{ text: buildSystemInstruction(megaLines) }] },
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