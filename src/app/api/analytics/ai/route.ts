import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { openai } from "@/lib/openai";

/* ── Types that match what the client sends ─────────────────────────────── */

type ManagerStats = {
  name: string;
  totalCalls: number;
  avgScore: number | null;
  conversionRate: number | null;
  topIssues: string[];
  topMistakes: string[];
};

type AnalyticsSummary = {
  dateFrom: string;
  dateTo: string;
  totalCalls: number;
  avgScore: number | null;
  sold: number;
  notSold: number;
  potential: number;
  topIssues: { issue: string; count: number }[];
  topMistakes: { mistake: string; count: number }[];
  topObjections: { objection: string; count: number }[];
  topProducts: { product: string; count: number }[];
  managers: ManagerStats[];
  scoreTrend: { month: string; avgScore: number; count: number }[];
};

/* ── Build the GPT prompt ───────────────────────────────────────────────── */

function buildPrompt(data: AnalyticsSummary, lang: string): string {
  const isUk = lang === "uk";
  const isRu = lang === "ru";

  const total      = data.sold + data.notSold + data.potential;
  const convRate   = total > 0 ? Math.round((data.sold / total) * 100) : 0;
  const langLabel  = isUk ? "Ukrainian" : isRu ? "Russian" : "English";

  const list = (arr: { issue?: string; mistake?: string; objection?: string; product?: string; count: number }[]) =>
    arr.map((x, i) => `  ${i + 1}. "${x.issue ?? x.mistake ?? x.objection ?? x.product}" (${x.count}×)`).join("\n") || "  —";

  const managers = data.managers.map((m) =>
    `  • ${m.name}: ${m.totalCalls} calls, avg score ${m.avgScore ?? "—"}/10, conversion ${m.conversionRate ?? "—"}%` +
    (m.topIssues.length ? `\n    Issues: ${m.topIssues.slice(0, 3).join("; ")}` : "") +
    (m.topMistakes.length ? `\n    Mistakes: ${m.topMistakes.slice(0, 3).join("; ")}` : "")
  ).join("\n");

  const trend = data.scoreTrend
    .map((t) => `  ${t.month}: avg ${t.avgScore}/10 (${t.count} calls)`)
    .join("\n") || "  — not enough data";

  return `You are a sales performance consultant analysing call-center data.
Respond ONLY in ${langLabel}.
Respond ONLY with a valid JSON object — no markdown, no extra text — in exactly this format:
{
  "summary": "<2–3 sentence executive summary of overall performance>",
  "teamRecommendations": ["<rec 1>", "<rec 2>", "<rec 3>"],
  "managerCoaching": [
    { "managerName": "<name>", "points": ["<point 1>", "<point 2>"] }
  ],
  "objectionHandling": ["<strategy 1>", "<strategy 2>", "<strategy 3>"],
  "processImprovements": ["<improvement 1>", "<improvement 2>"]
}

=== ANALYTICS DATA ===
Period: ${data.dateFrom} → ${data.dateTo}
Total completed calls: ${data.totalCalls}
Average score: ${data.avgScore ?? "—"}/10
Sold: ${data.sold} | Not sold: ${data.notSold} | Potential: ${data.potential} | Conversion: ${convRate}%

TOP ISSUES (most frequent):
${list(data.topIssues)}

TOP MANAGER MISTAKES:
${list(data.topMistakes)}

TOP OBJECTIONS:
${list(data.topObjections)}

TOP PRODUCTS:
${list(data.topProducts)}

MANAGER PERFORMANCE:
${managers || "  — no managers assigned"}

SCORE TREND (monthly):
${trend}
`;
}

/* ── Route handler ──────────────────────────────────────────────────────── */

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body: { data: AnalyticsSummary; lang: string } = await request.json();

  if (!body.data || body.data.totalCalls === 0) {
    return NextResponse.json({ error: "No data" }, { status: 400 });
  }

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.5,
      messages: [
        {
          role: "user",
          content: buildPrompt(body.data, body.lang ?? "en"),
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";

    // Strip accidental markdown fences
    const cleaned = raw.replace(/^```(?:json)?\n?/i, "").replace(/\n?```$/i, "").trim();

    const report = JSON.parse(cleaned);
    return NextResponse.json(report);
  } catch (err) {
    console.error("[analytics/ai]", err);
    return NextResponse.json({ error: "ai_error" }, { status: 500 });
  }
}
