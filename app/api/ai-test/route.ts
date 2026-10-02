import { NextRequest, NextResponse } from "next/server";
import { callGemini, extractText, geminiFailure } from "@/lib/server/gemini";

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "GEMINI_API_KEY not configured" }, { status: 500 });

  const { model } = (await req.json()) as { model?: string };
  const result = await callGemini(
    apiKey,
    {
      contents: [{ parts: [{ text: "Reply with the single word: ready" }] }],
      generationConfig: { maxOutputTokens: 16, thinkingConfig: { thinkingBudget: 0 } },
    },
    model
  );
  if (!result.ok) return geminiFailure(result);
  return NextResponse.json({ model: result.model, tried: result.tried, reply: extractText(result.data) });
}