import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";

function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",").map((e) => e.trim().toLowerCase())
    .includes(email.toLowerCase());
}

type CostResult = {
  totalUsd: number | null;
  periodLabel: string;
  error?: string;
};

async function fetchOpenAICosts(): Promise<CostResult> {
  const adminKey = process.env.OPENAI_ADMIN_KEY;
  if (!adminKey) return { totalUsd: null, periodLabel: "", error: "OPENAI_ADMIN_KEY not set" };

  const now   = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const startTs = Math.floor(start.getTime() / 1000);
  const endTs   = Math.floor(now.getTime()   / 1000);

  try {
    const res = await fetch(
      `https://api.openai.com/v1/organization/costs?start_time=${startTs}&end_time=${endTs}&bucket_width=1d&limit=31`,
      { headers: { Authorization: `Bearer ${adminKey}` }, next: { revalidate: 0 } },
    );
    if (!res.ok) {
      const text = await res.text();
      return { totalUsd: null, periodLabel: "", error: `OpenAI ${res.status}: ${text.slice(0, 120)}` };
    }
    const data = await res.json() as {
      data?: { results?: { amount?: { value?: number } }[] }[];
    };

    let total = 0;
    for (const bucket of data.data ?? []) {
      for (const r of bucket.results ?? []) {
        total += r.amount?.value ?? 0;
      }
    }
    const label = start.toLocaleDateString("uk", { month: "long", year: "numeric" });
    return { totalUsd: Math.round(total * 100) / 100, periodLabel: label };
  } catch (err) {
    return { totalUsd: null, periodLabel: "", error: String(err) };
  }
}

async function fetchRailwayCosts(): Promise<CostResult> {
  const token     = process.env.RAILWAY_TOKEN;
  const projectId = process.env.RAILWAY_PROJECT_ID;
  if (!token)     return { totalUsd: null, periodLabel: "", error: "RAILWAY_TOKEN not set" };
  if (!projectId) return { totalUsd: null, periodLabel: "", error: "RAILWAY_PROJECT_ID not set" };

  const query = `
    query GetProject($id: String!) {
      project(id: $id) {
        estimatedUsage { estimatedCost }
      }
    }
  `;

  try {
    const res = await fetch("https://backboard.railway.app/graphql/v2", {
      method:  "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body:    JSON.stringify({ query, variables: { id: projectId } }),
      next:    { revalidate: 0 },
    });
    if (!res.ok) {
      const text = await res.text();
      return { totalUsd: null, periodLabel: "", error: `Railway HTTP ${res.status}: ${text.slice(0, 200)}` };
    }

    const json = await res.json() as {
      data?: { project?: { estimatedUsage?: { estimatedCost?: number } } };
      errors?: { message: string }[];
    };

    if (json.errors?.length) {
      return { totalUsd: null, periodLabel: "", error: json.errors[0].message };
    }

    const cost = json.data?.project?.estimatedUsage?.estimatedCost ?? null;
    const now  = new Date();
    const label = new Date(now.getFullYear(), now.getMonth(), 1)
      .toLocaleDateString("uk", { month: "long", year: "numeric" });

    return { totalUsd: cost !== null ? Math.round(cost * 100) / 100 : null, periodLabel: label };
  } catch (err) {
    return { totalUsd: null, periodLabel: "", error: String(err) };
  }
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email || !isAdminEmail(session.user.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [openai, railway] = await Promise.all([fetchOpenAICosts(), fetchRailwayCosts()]);
  return NextResponse.json({ openai, railway });
}
