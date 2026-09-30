import { NextRequest, NextResponse } from "next/server";
import { parseGeminiError } from "@/lib/server/geminiError";
import { describeMegaForm } from "@/lib/data/commonSets";

const GEMINI_MODEL = "gemini-3.5-flash";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

interface GeminiTurn {
  role: "user" | "model";
  text: string;
}

interface BattleRequestBody {
  yourTeam: string[];
  opponentTeam: string[];
  conversation: GeminiTurn[]; // prior turns, NOT including the new one
  newTurnSentence: string;
}

function buildSystemInstruction(megaLines: string[]) {
  return `You are a live Pokémon Champions doubles (VGC) in-battle assistant. Rules: Level 50, bring 4 of 6, and Mega Evolution is the ONLY battle gimmick this season. There is NO Terastallization or Dynamax, so never suggest them. Each side may Mega Evolve at most one Pokémon per battle. A Mega Evolution happens before that Pokémon moves; its new typing, ability and Speed apply immediately, so re-evaluate weaknesses, immunities and turn order once a Mega is logged. Before it Mega Evolves, a Pokémon keeps its base typing and ability.
${megaLines.length ? `Possible Mega forms in this match:\n${megaLines.join("\n")}\n` : ""}After each turn, give SHORT, actionable advice (2-4 sentences max) for next turn: move choices, targeting, switches, Protect timing, and when to Mega Evolve. Be direct and specific. Do not restate the turn log. Do not invent moves/abilities not shown in the log.`;
}

const SYSTEM_INSTRUCTION = `You are a live VGC (Pokémon doubles) in-battle assistant. You are given a running log of what happened turn-by-turn in an actual match. After each turn, give SHORT, actionable advice (2-4 sentences max) for what to do next turn — move choices, targeting, switches, Protect/Tera timing. Be direct and specific, reference the actual Pokémon and moves involved. Do not restate the turn log back at the player. Do not simulate turns yourself or invent moves/abilities not shown in the log.`;

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "GEMINI_API_KEY not configured" }, { status: 500 });
  }

  const body: BattleRequestBody = await req.json();
  const { yourTeam, opponentTeam, conversation, newTurnSentence } = body;

  const contents = [
    ...(conversation.length === 0
      ? [{
          role: "user" as const,
          parts: [{ text: `Your team: ${yourTeam.join(", ")}. Opponent's team preview: ${opponentTeam.join(", ")}. Battle is starting — I'll log each turn as it happens.` }],
        }]
      : []),
    ...conversation.map((t) => ({ role: t.role, parts: [{ text: t.text }] })),
    { role: "user" as const, parts: [{ text: newTurnSentence }] },
  ];
  const megaLines = [...yourTeam, ...opponentTeam]
  .map((n) => { const d = describeMegaForm(n); return d ? `${n} -> ${d}` : null; })
  .filter((l): l is string => l !== null);

  try {
    const res = await fetch(GEMINI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: buildSystemInstruction(megaLines) }] },
        contents,
        generationConfig: { temperature: 0.6, maxOutputTokens: 1024, thinkingConfig: { thinkingBudget: 0 } },
      }),
    });

    if (!res.ok) {
      const errorBody = await res.text();
      const rateLimitInfo = parseGeminiError(res.status, errorBody);
      if (rateLimitInfo.isRateLimit) {
        console.error("Gemini rate limit hit:", rateLimitInfo);
        return NextResponse.json({ error: "rate_limit", rateLimitInfo }, { status: 429 });
      }
      if (res.status === 503) {
        console.error("Gemini overloaded after retries:", errorBody);
        return NextResponse.json({ error: "overloaded" }, { status: 503 });
      }
      console.error("Gemini request failed:", res.status, errorBody);
      return NextResponse.json({ error: "Gemini request failed", detail: errorBody }, { status: 502 });
    }

    const data = await res.json();
    const advice: string | undefined = data.candidates?.[0]?.content?.parts
      ?.map((p: { text?: string }) => p.text ?? "")
      .join("")
      .trim();

    if (!advice) {
      console.error("Empty response from Gemini:", JSON.stringify(data));
      return NextResponse.json({ error: "Empty response from Gemini" }, { status: 502 });
    }

    return NextResponse.json({ advice });
  } catch (err) {
    console.error("Gemini battle request threw:", err);
    return NextResponse.json({ error: "Gemini request threw" }, { status: 502 });
  }
}