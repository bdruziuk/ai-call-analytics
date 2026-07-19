import { normalizeLabelGroups } from "./normalizeLabelGroups";
import type { TopProduct } from "./analytics-types";

type ProductStats = { total: number; sold: number };

/** Merges raw per-call product labels (each written in that call's own
 *  language) into a deduplicated top list, ranked by call count. */
export async function normalizeTopProducts(raw: Map<string, ProductStats>, limit = 8): Promise<TopProduct[]> {
  const grouped = await normalizeLabelGroups(raw, {
    weight: (v) => v.total,
    merge: (a, b) => ({ total: a.total + b.total, sold: a.sold + b.sold }),
    domainHint: "product or dish names",
    limit,
  });

  return grouped.map(({ label, value }) => ({
    product: label,
    callCount: value.total,
    soldCount: value.sold,
    conversionRate: value.total === 0 ? 0 : Math.round((value.sold / value.total) * 100),
  }));
}
