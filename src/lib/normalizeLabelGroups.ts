import { openai } from "./openai";

const MAX_DISTINCT_FOR_AI = 40;
const AI_TIMEOUT_MS = 8000;

function normalizeKey(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Groups free-text labels that refer to the same real-world thing, even
 *  across languages (each call's fields are written in that call's own
 *  language) or with minor spelling variation. Returns null if AI grouping
 *  is unavailable or fails — callers should fall back to the ungrouped list. */
async function groupLabels(names: string[], domainHint: string): Promise<Map<string, string> | null> {
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
              `You group ${domainHint} that refer to the same real-world thing, even when written in ` +
              "different languages (e.g. Ukrainian, Russian, English) or with minor spelling variations. " +
              'Return strict JSON: { "groups": [ { "canonicalName": string, "members": string[] } ] }. ' +
              "Every input name must appear, unchanged, in exactly one group's members array. " +
              "canonicalName should be a clean, human-readable label in whichever language is most common " +
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

type GroupOptions<T> = {
  /** Extracts the sort/ranking weight from a stats value (e.g. call count). */
  weight: (value: T) => number;
  /** Combines two stats values when their labels are merged into one group. */
  merge: (a: T, b: T) => T;
  /** Short noun phrase describing what the labels are, used in the AI prompt
   *  (e.g. "product or dish names", "customer requests or search intents"). */
  domainHint: string;
  limit: number;
};

/** Merges raw per-call free-text labels (e.g. products, customer intents)
 *  into a deduplicated, ranked list.
 *  Pass 1 (cheap, deterministic): merges exact matches that only differ by
 *  case/whitespace, picking the most frequent original spelling as the label.
 *  Pass 2 (best-effort AI): merges the same thing written in different
 *  languages or with spelling variants. Falls back to pass-1 results if the
 *  AI call is unavailable or fails, so this never breaks the caller. */
export async function normalizeLabelGroups<T>(
  raw: Map<string, T>,
  { weight, merge, domainHint, limit }: GroupOptions<T>,
): Promise<{ label: string; value: T }[]> {
  const sortDesc = (arr: [string, T][]) => [...arr].sort((a, b) => weight(b[1]) - weight(a[1]));
  const toResult = (arr: [string, T][]) => sortDesc(arr).slice(0, limit).map(([label, value]) => ({ label, value }));

  // ── Pass 1: case/whitespace dedup ──────────────────────────────────────
  const byKey = new Map<string, { value: T; labelWeights: Map<string, number> }>();
  for (const [rawLabel, value] of raw) {
    const key = normalizeKey(rawLabel);
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, { value, labelWeights: new Map([[rawLabel, weight(value)]]) });
    } else {
      existing.value = merge(existing.value, value);
      existing.labelWeights.set(rawLabel, (existing.labelWeights.get(rawLabel) ?? 0) + weight(value));
    }
  }
  const deduped: [string, T][] = [...byKey.values()].map((entry) => {
    const bestLabel = [...entry.labelWeights.entries()].sort(([, a], [, b]) => b - a)[0][0];
    return [bestLabel, entry.value];
  });

  if (deduped.length <= 1) return toResult(deduped);

  // ── Pass 2: AI cross-language / near-duplicate grouping ────────────────
  const candidates = sortDesc(deduped).slice(0, MAX_DISTINCT_FOR_AI);
  const grouped = await groupLabels(candidates.map(([name]) => name), domainHint);
  if (!grouped) return toResult(deduped);

  const merged = new Map<string, T>();
  for (const [name, value] of deduped) {
    const canonical = grouped.get(name) ?? name;
    const existing = merged.get(canonical);
    merged.set(canonical, existing ? merge(existing, value) : value);
  }

  return toResult([...merged.entries()]);
}
