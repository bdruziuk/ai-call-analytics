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
  balanceUsd?: number | null;
  error?: string;
};

async function fetchOpenAICosts(): Promise<CostResult> {
  const adminKey = process.env.OPENAI_ADMIN_KEY;
  if (!adminKey) return { totalUsd: null, periodLabel: "", error: "OPENAI_ADMIN_KEY not set" };

  const now   = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const startTs = Math.floor(start.getTime() / 1000);
  const endTs   = Math.floor(now.getTime()   / 1000);
  const label   = start.toLocaleDateString("uk", { month: "long", year: "numeric" });

  try {
    const [costsRes, creditsRes] = await Promise.all([
      fetch(
        `https://api.openai.com/v1/organization/costs?start_time=${startTs}&end_time=${endTs}&bucket_width=1d&limit=31`,
        { headers: { Authorization: `Bearer ${adminKey}` }, next: { revalidate: 0 } },
      ),
      fetch(
        "https://api.openai.com/v1/dashboard/billing/credit_grants",
        { headers: { Authorization: `Bearer ${adminKey}` }, next: { revalidate: 0 } },
      ),
    ]);

    if (!costsRes.ok) {
      const text = await costsRes.text();
      return { totalUsd: null, periodLabel: "", error: `OpenAI ${costsRes.status}: ${text.slice(0, 120)}` };
    }

    const data = await costsRes.json() as {
      data?: { results?: { amount?: { value?: number } }[] }[];
    };
    let total = 0;
    for (const bucket of data.data ?? []) {
      for (const r of bucket.results ?? []) {
        total += r.amount?.value ?? 0;
      }
    }

    let balanceUsd: number | null = null;
    if (creditsRes.ok) {
      const credits = await creditsRes.json() as {
        total_available?: number;
        total_granted?: number;
        total_used?: number;
      };
      if (credits.total_available != null) {
        balanceUsd = Math.round(credits.total_available * 100) / 100;
      }
    }

    return { totalUsd: Math.round(total * 100) / 100, periodLabel: label, balanceUsd };
  } catch (err) {
    return { totalUsd: null, periodLabel: "", error: String(err) };
  }
}

async function fetchRailwayCosts(): Promise<CostResult> {
  const token     = process.env.RAILWAY_TOKEN;
  const projectId = process.env.RAILWAY_PROJECT_ID;
  if (!token)     return { totalUsd: null, periodLabel: "", error: "RAILWAY_TOKEN not set" };
  if (!projectId) return { totalUsd: null, periodLabel: "", error: "RAILWAY_PROJECT_ID not set" };

  const projectQuery = `query { project(id: "${projectId}") { workspaceId } }`;

  async function gql(body: object) {
    const r = await fetch("https://backboard.railway.app/graphql/v2", {
      method:  "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body:    JSON.stringify(body),
      next:    { revalidate: 0 },
    });
    if (!r.ok) {
      const text = await r.text();
      throw new Error(`Railway HTTP ${r.status}: ${text.slice(0, 200)}`);
    }
    return r.json() as Promise<{ data?: Record<string, unknown>; errors?: { message: string }[] }>;
  }

  try {
    const proj = await gql({ query: projectQuery });
    if (proj.errors?.length) throw new Error(proj.errors[0].message);
    const workspaceId = (proj.data?.project as { workspaceId?: string } | undefined)?.workspaceId;
    if (!workspaceId) throw new Error("workspaceId not found on project");

    const wsQuery = `query {
      workspace(workspaceId: "${workspaceId}") {
        customer { currentUsage creditBalance remainingUsageCreditBalance }
      }
    }`;
    const ws = await gql({ query: wsQuery });
    if (ws.errors?.length) throw new Error(ws.errors[0].message);

    type Customer = { currentUsage?: number; creditBalance?: number; remainingUsageCreditBalance?: number };
    const customer = (ws.data?.workspace as { customer?: Customer } | undefined)?.customer;

    const cost    = customer?.currentUsage ?? null;
    // creditBalance = prepaid credits; remainingUsageCreditBalance = usage credits remaining
    const balance = customer?.remainingUsageCreditBalance ?? customer?.creditBalance ?? null;

    const label = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      .toLocaleDateString("uk", { month: "long", year: "numeric" });

    return {
      totalUsd:   cost    !== null ? Math.round(cost    * 100) / 100 : null,
      balanceUsd: balance !== null ? Math.round(balance * 100) / 100 : null,
      periodLabel: label,
    };
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
