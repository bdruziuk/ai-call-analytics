import { normalizeLabelGroups } from "./normalizeLabelGroups";
import type { DemandTag } from "./analytics-types";

/** Merges raw per-call customer-intent labels (each written in that call's
 *  own language) into a deduplicated demand cloud, ranked by frequency. */
export async function normalizeDemandTags(raw: Map<string, number>, limit = 20): Promise<DemandTag[]> {
  const grouped = await normalizeLabelGroups(raw, {
    weight: (v) => v,
    merge: (a, b) => a + b,
    domainHint: "customer requests or search intents",
    limit,
  });

  const maxCount = Math.max(...grouped.map((g) => g.value), 1);
  return grouped.map(({ label, value }) => ({
    tag: label,
    count: value,
    weight: Math.ceil((value / maxCount) * 5) as 1 | 2 | 3 | 4 | 5,
  }));
}
