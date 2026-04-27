import { NextResponse } from "next/server";
import OpenAI from "openai";

export async function POST(req: Request) {
  try {
    const { stops, days, brief } = await req.json();

    if (!stops || !Array.isArray(stops) || stops.length === 0) {
      return NextResponse.json({ error: "Brak przystanków" }, { status: 400 });
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: "Brak OPENAI_API_KEY" }, { status: 500 });
    }

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const prompt = `
You are a travel planner AI.

Create a personalized day-by-day travel plan.

Trip stops:
${stops.join(", ")}

Trip duration:
${days || stops.length} days

Traveler brief:
- Budget: ${brief?.budget || "not provided"}
- Travel style: ${brief?.style || "not provided"}
- Pace: ${brief?.pace || "not provided"}
- Wants to see: ${brief?.interests || "not provided"}
- Wants to avoid: ${brief?.avoid || "not provided"}

Rules:
- Each day should be realistic and coherent
- Keep travel between places sensible
- Match the budget and style
- Include a mix of iconic spots and local vibe
- Avoid things listed in "Wants to avoid"
- Return plain text only
- Keep it concise, but useful

Return format:
Day 1 - City
- activity
- activity
- activity

Day 2 - City
- activity
- activity
- activity
`;

    const response = await openai.responses.create({
      model: "gpt-4.1-mini",
      input: prompt,
    });

    return NextResponse.json({
      plan: response.output_text || "Nie udało się wygenerować planu.",
    });
  } catch (e: any) {
    console.error("AI error:", e);
    return NextResponse.json(
      { error: e?.message || "AI failed" },
      { status: 500 }
    );
  }
}
