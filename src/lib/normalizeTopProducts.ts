import { openai } from "./openai";
import type { TopProduct } from "./analytics-types";

type ProductStats = { total: number; sold: number };
type ProductCounts = Map<string, ProductStats>;

const MAX_DISTINCT_FOR_AI = 40;
const AI_TIMEOUT_MS = 8000;

function normalizeKey(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

function toTopProducts(entries: [string, ProductStats][], limit: number): TopProduct[] {
  return entries
    .sort(([, a], [, b]) => b.total - a.total)
    .slice(0, limit)
    .map(([product, { total, sold }]) => ({
      product,
      callCount: total,
      soldCount: sold,
      conversionRate: total === 0 ? 0 : Math.round((sold / total) * 100),
    }));
}

/** Groups product names that refer to the same real-world item, even across
 *  languages (each call's `product` is written in that call's own language)
 *  or with minor spelling variation. Returns null if AI grouping is
 *  unavailable or fails — callers should fall back to the ungrouped list. */
async function groupProductNames(names: string[]): Promise<Map<string, string> | null> {
  if (!process.env.OPENAI_API_KEY || names.length <= 1) return null;

  try {
    const response = await Promise.race([
      openai.chat.completions.create({
        model: "gpt-4.1-mini",
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "You group product/dish names that refer to the same real-world item, even when written in " +
              "different languages (e.g. Ukrainian, Russian, English) or with minor spelling variations. " +
              'Return strict JSON: { "groups": [ { "canonicalName": string, "members": string[] } ] }. ' +
              "Every input name must appear, unchanged, in exactly one group's members array. " +
              "canonicalName should be a clean, human-readable name in whichever language is most common " +
              "among that group's members — do not translate into a different language than the inputs use.",
          },
          { role: "user", content: JSON.stringify(names) },
        ],
      }),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timeout")), AI_TIMEOUT_MS)),
    ]);

    const content = response.choices[0]?.message?.content;
    if (!content) return null;

    const parsed = JSON.parse(content) as { groups?: { canonicalName: string; members: string[] }[] };
    if (!parsed.groups?.length) return null;

    const map = new Map<string, string>();
    for (const g of parsed.groups) {
      for (const member of g.members ?? []) map.set(member, g.canonicalName);
    }
    // Guarantee full coverage in case the model dropped an input.
    for (const n of names) if (!map.has(n)) map.set(n, n);
    return map;
  } catch {
    return null;
  }
}

/** Merges raw per-call product labels into a deduplicated top list.
 *  Pass 1 (cheap, deterministic): merges exact matches that only differ by
 *  case/whitespace, picking the most frequent original spelling as the label.
 *  Pass 2 (best-effort AI): merges the same product written in different
 *  languages or with spelling variants. Falls back to pass-1 results if the
 *  AI call is unavailable or fails, so this never breaks the dashboard. */
export async function normalizeTopProducts(raw: ProductCounts, limit = 8): Promise<TopProduct[]> {
  // ── Pass 1: case/whitespace dedup ──────────────────────────────────────
  const byKey = new Map<string, ProductStats & { labelCounts: Map<string, number> }>();
  for (const [rawLabel, stats] of raw) {
    const key = normalizeKey(rawLabel);
    if (!byKey.has(key)) byKey.set(key, { total: 0, sold: 0, labelCounts: new Map() });
    const entry = byKey.get(key)!;
    entry.total += stats.total;
    entry.sold  += stats.sold;
    entry.labelCounts.set(rawLabel, (entry.labelCounts.get(rawLabel) ?? 0) + stats.total);
  }

  const deduped: [string, ProductStats][] = [...byKey.values()].map((entry) => {
    const bestLabel = [...entry.labelCounts.entries()].sort(([, a], [, b]) => b - a)[0][0];
    return [bestLabel, { total: entry.total, sold: entry.sold }];
  });

  if (deduped.length <= 1) return toTopProducts(deduped, limit);

  // ── Pass 2: AI cross-language / near-duplicate grouping ────────────────
  const candidates = [...deduped].sort(([, a], [, b]) => b.total - a.total).slice(0, MAX_DISTINCT_FOR_AI);
  const grouped = await groupProductNames(candidates.map(([name]) => name));
  if (!grouped) return toTopProducts(deduped, limit);

  const merged = new Map<string, ProductStats>();
  for (const [name, stats] of deduped) {
    const canonical = grouped.get(name) ?? name;
    if (!merged.has(canonical)) merged.set(canonical, { total: 0, sold: 0 });
    const m = merged.get(canonical)!;
    m.total += stats.total;
    m.sold  += stats.sold;
  }

  return toTopProducts([...merged.entries()], limit);
}
