export const BUSINESS_TYPES = [
  "pizzeria",
  "restaurant",
  "online_store",
  "logistics",
  "auto_service",
  "medical_clinic",
  "dental_clinic",
  "beauty_salon",
  "real_estate",
  "b2b_sales",
  "other",
] as const;

export type BusinessType = typeof BUSINESS_TYPES[number];

export function isValidBusinessType(v: unknown): v is BusinessType {
  return BUSINESS_TYPES.includes(v as BusinessType);
}

export const BUSINESS_TYPE_LABELS: Record<BusinessType, string> = {
  pizzeria:       "Піцерія",
  restaurant:     "Ресторан",
  online_store:   "Інтернет-магазин",
  logistics:      "Логістика та доставка",
  auto_service:   "Автосервіс",
  medical_clinic: "Медична клініка",
  dental_clinic:  "Стоматологічна клініка",
  beauty_salon:   "Салон краси",
  real_estate:    "Нерухомість",
  b2b_sales:      "B2B продажі",
  other:          "Інше",
};
