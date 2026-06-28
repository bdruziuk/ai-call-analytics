export function normalizeSaleStatus(raw: unknown): string {
  const normalized = String(raw).toLowerCase().trim();
  if (normalized === "junk" || normalized.includes("junk")) return "junk";
  if (normalized.includes("sold") && !normalized.includes("not"))  return "sold";
  if (normalized.includes("potential")) return "potential_sale";
  return "not_sold";
}
