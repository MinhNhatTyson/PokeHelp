import { NextRequest, NextResponse } from "next/server";
import { getCommonSet, CommonSetEntry } from "@/lib/data/commonSets";
import { parseGeminiError } from "@/lib/server/geminiError";

const GEMINI_MODEL = "gemini-3.5-flash";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

interface MoveSuggestionRequestBody {
  species: string;
  chosenMoves: string[];       // exactly 3
  legalMovepool: string[];     // this Pokémon's full PokeAPI movepool, slugs
  abilityName: string | null;
  itemName: string | null;
  teammates: { name: string; roleNotes: string | null }[]; // rest of the team, this slot excluded
  teamStrategy: string;
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "GEMINI_API_KEY not configured" }, { status: 500 });
  }

  const body: MoveSuggestionRequestBody = await req.json();
  const { species, chosenMoves, legalMovepool, abilityName, itemName, teammates, teamStrategy } = body;

  if (chosenMoves.length !== 3) {
    return NextResponse.json({ error: "Expected exactly 3 chosen moves" }, { status: 400 });
  }

  const commonSet = getCommonSet(species);
  const remainingMoves = legalMovepool.filter((m) => !chosenMoves.includes(m));
  if (remainingMoves.length === 0) {
    return NextResponse.json({ error: "No remaining legal moves to suggest from" }, { status: 400 });
  }

  const prompt = buildPrompt({ species, chosenMoves, remainingMoves, abilityName, itemName, teammates, teamStrategy, commonSet });

  try {
    const res = await fetch(GEMINI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: 1024,
          thinkingConfig: { thinkingBudget: 0 },
          responseMimeType: "application/json",
        },
      }),
    });

    if (!res.ok) {
      const errorBody = await res.text();
      const rateLimitInfo = parseGeminiError(res.status, errorBody);
      if (rateLimitInfo.isRateLimit) {
        console.error("Gemini rate limit hit:", rateLimitInfo);
        return NextResponse.json({ error: "rate_limit", rateLimitInfo }, { status: 429 });
      }
      console.error("Gemini request failed:", res.status, errorBody);
      return NextResponse.json({ error: "Gemini request failed", detail: errorBody }, { status: 502 });
    }

    const data = await res.json();
    const rawText: string | undefined = data.candidates?.[0]?.content?.parts
      ?.map((p: { text?: string }) => p.text ?? "")
      .join("")
      .trim();

    if (!rawText) {
      console.error("Empty response from Gemini:", JSON.stringify(data));
      return NextResponse.json({ error: "Empty response from Gemini" }, { status: 502 });
    }

    let parsed: { move?: string; reasoning?: string };
    try {
      parsed = JSON.parse(rawText.replace(/```json|```/g, "").trim());
    } catch {
      console.error("Gemini moveset-suggestion returned non-JSON:", rawText);
      return NextResponse.json({ error: "Gemini returned malformed JSON" }, { status: 502 });
    }

    // Hard validation gate — the prompt told the model to pick only from
    // `remainingMoves`, but we never trust that on the model's word alone.
    // This is the actual line of defense against a hallucinated/illegal move.
    if (!parsed.move || !remainingMoves.includes(parsed.move)) {
      console.error("Gemini suggested a move that failed validation:", parsed.move);
      return NextResponse.json({ error: "Suggested move failed validation" }, { status: 502 });
    }

    return NextResponse.json({ move: parsed.move, reasoning: parsed.reasoning ?? "" });
  } catch (err) {
    console.error("Gemini moveset-suggestion request threw:", err);
    return NextResponse.json({ error: "Gemini request threw" }, { status: 502 });
  }
}

function buildPrompt({
  species, chosenMoves, remainingMoves, abilityName, itemName, teammates, teamStrategy, commonSet,
}: {
  species: string;
  chosenMoves: string[];
  remainingMoves: string[];
  abilityName: string | null;
  itemName: string | null;
  teammates: { name: string; roleNotes: string | null }[];
  teamStrategy: string;
  commonSet: CommonSetEntry | null;
}): string {
  return `You are a VGC (Pokémon doubles) moveset assistant. A player has already picked 3 of 4 moves for a Pokémon on their team and needs the 4th.

Pokémon: ${species}
Ability: ${abilityName ?? "(not set)"}
Held item: ${itemName ?? "(not set)"}
Already-chosen moves: ${chosenMoves.join(", ")}

${commonSet
  ? `Known competitive usage data for this species (VGC ${commonSet.regulation}): commonly runs ${commonSet.commonMoves.join(", ")}, held item ${commonSet.topItem}, ability ${commonSet.likelyAbility}.`
  : "No curated tournament usage data available for this species — reason from general VGC knowledge instead."}

Rest of the player's team: ${teammates.length > 0 ? teammates.map((t) => `${t.name}${t.roleNotes ? ` (role: ${t.roleNotes})` : ""}`).join(", ") : "(no other team members set yet)"}
Player's stated overall game plan: ${teamStrategy || "(not provided)"}

You MUST choose the 4th move from exactly this list of the Pokémon's legal moves — respond with the exact slug as written:
${remainingMoves.join(", ")}

Pick the move that best complements the 3 already chosen, fits current VGC tournament usage for this species, and supports the rest of the team's game plan. Respond with ONLY a JSON object, no markdown fences, no commentary, in exactly this shape:
{"move": "<one slug from the list above>", "reasoning": "<2-3 sentences, referencing the team context>"}`;
}