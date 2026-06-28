import type { BusinessType } from "@/lib/businessTypes";
import { getIndustryContext, getIndustrySchemaExtension } from "./industryPrompts";

export type ReportType = "high_level" | "medium" | "detailed";
export type AnalysisLanguage = "uk" | "ru" | "en" | "uk_ru";

export const REPORT_TYPES: ReportType[] = ["high_level", "medium", "detailed"];

// ── Base rules ─────────────────────────────────────────────────────────────────
// Generic — business-specific context is injected via industry extension.

const baseRules: Record<AnalysisLanguage, string> = {
  uk: `Ти аналізуєш телефонні дзвінки між операторами та клієнтами.
Усі значення JSON пиши виключно українською мовою.
Поверни ТІЛЬКИ валідний JSON. Без markdown. Без пояснень поза JSON.
saleStatus може бути лише: "sold", "not_sold", "potential_sale", "junk".
Використовуй "junk" якщо дзвінок не пов'язаний з діяльністю бізнесу: помилилися номером, пропонують послуги/рекламу, питають про вакансії, спам, мовчазний/технічний дзвінок.
Якщо даних недостатньо — пиши "невідомо".`,

  ru: `Ты анализируешь телефонные звонки между операторами и клиентами.
Все значения JSON пиши исключительно на русском языке.
Верни ТОЛЬКО валидный JSON. Без markdown. Без объяснений вне JSON.
saleStatus может быть только: "sold", "not_sold", "potential_sale", "junk".
Используй "junk" если звонок не связан с деятельностью бизнеса: ошиблись номером, предлагают услуги/рекламу, спрашивают о вакансиях, спам, молчащий/технический звонок.
Если данных недостаточно — пиши "неизвестно".`,

  en: `You analyze phone calls between operators and customers.
Write all JSON values in English.
Return ONLY valid JSON. No markdown. No explanations outside JSON.
saleStatus must be one of: "sold", "not_sold", "potential_sale", "junk".
Use "junk" if the call is unrelated to the business: wrong number, sales pitches, job inquiries, spam, silent or technical calls.
If data is insufficient — write "unknown".`,

  uk_ru: `Ти аналізуєш телефонні дзвінки між операторами та клієнтами (розмова ведеться українською та/або російською).
Усі значення JSON пиши українською мовою.
Поверни ТІЛЬКИ валідний JSON. Без markdown. Без пояснень поза JSON.
saleStatus може бути лише: "sold", "not_sold", "potential_sale", "junk".
Використовуй "junk" якщо дзвінок не пов'язаний з діяльністю бізнесу: помилилися номером, пропонують послуги/рекламу, питають про вакансії, спам, мовчазний/технічний дзвінок.
Якщо даних недостатньо — пиши "невідомо".`,
};

// ── Report-type instructions per language ──────────────────────────────────────

const reportInstructions: Record<AnalysisLanguage, Record<ReportType, string>> = {
  uk: {
    high_level: `Зроби короткий high-level аналіз дзвінка.`,

    medium: `Зроби середній аналіз дзвінка для власника бізнесу.
Оціни: що хотів клієнт; чи відбувся продаж/конверсія; які були заперечення; що оператор зробив добре і погано; що покращити.`,

    detailed: `Зроби детальний професійний аналіз дзвінка.
Оціни: продукт/послугу; намір клієнта; результат і причини; заперечення; якість консультації та виявлення потреби; роботу із сумнівами; upsell/cross-sell; тон комунікації; помилки оператора; конкретні рекомендації та coaching feedback.`,
  },

  ru: {
    high_level: `Сделай краткий high-level анализ звонка.`,

    medium: `Сделай средний анализ звонка для владельца бизнеса.
Оцени: что хотел клиент; состоялась ли продажа/конверсия; какие были возражения; что оператор сделал хорошо и плохо; что улучшить.`,

    detailed: `Сделай детальный профессиональный анализ звонка.
Оцени: продукт/услугу; намерение клиента; результат и причины; возражения; качество консультации и выявления потребности; работу с сомнениями; upsell/cross-sell; тон коммуникации; ошибки оператора; конкретные рекомендации и coaching feedback.`,
  },

  en: {
    high_level: `Provide a concise high-level analysis of the call.`,

    medium: `Provide a medium-depth analysis of the call for a business owner.
Evaluate: what the customer wanted; whether a sale/conversion occurred; objections raised; what the operator did well and poorly; what to improve.`,

    detailed: `Provide a detailed professional call analysis.
Evaluate: product/service; customer intent; outcome and reasons; objections; consultation quality and needs discovery; handling doubts; upsell/cross-sell; communication tone; operator mistakes; specific recommendations and coaching feedback.`,
  },

  uk_ru: {
    high_level: `Зроби короткий high-level аналіз дзвінка (розмова ведеться українською та/або російською).`,

    medium: `Зроби середній аналіз дзвінка для власника бізнесу (розмова ведеться українською та/або російською).
Оціни: що хотів клієнт; чи відбувся продаж/конверсія; які були заперечення; що оператор зробив добре і погано; що покращити.`,

    detailed: `Зроби детальний професійний аналіз дзвінка (розмова ведеться українською та/або російською).
Оціни: продукт/послугу; намір клієнта; результат і причини; заперечення; якість консультації та виявлення потреби; роботу із сумнівами; upsell/cross-sell; тон комунікації; помилки оператора; конкретні рекомендації та coaching feedback.`,
  },
};

// ── JSON schema (keys are always English) ──────────────────────────────────────

const jsonSchema: Record<ReportType, string> = {
  high_level: `{
  "summary": "brief 1-2 sentence call summary",
  "product": "product or service discussed",
  "saleStatus": "sold | not_sold | potential_sale | junk",
  "customerIntent": "customer intent",
  "nextStep": "recommended next step",
  "score": <number 1-10>,
  "issues": ["1-3 main issues"],
  "positives": ["1-3 positive moments"],
  "recommendations": ["1-3 short recommendations"]
}`,

  medium: `{
  "summary": "call summary",
  "product": "product or service",
  "saleStatus": "sold | not_sold | potential_sale | junk",
  "customerIntent": "customer intent",
  "nextStep": "recommended next step",
  "score": <number 1-10>,
  "issues": ["issues in the conversation"],
  "positives": ["strengths"],
  "recommendations": ["recommendations"],
  "objections": ["customer objections"],
  "managerMistakes": ["manager mistakes"]
}`,

  detailed: `{
  "summary": "detailed call summary",
  "product": "product or service",
  "saleStatus": "sold | not_sold | potential_sale | junk",
  "customerIntent": "customer intent",
  "nextStep": "recommended next step",
  "score": <number 1-10>,
  "issues": ["key issues"],
  "positives": ["strengths"],
  "recommendations": ["specific recommendations"],
  "objections": ["customer objections"],
  "managerMistakes": ["manager mistakes"],
  "detailedReport": {
    "salesOutcomeReason": "why sale happened or didn't",
    "needDiscovery": "how manager discovered the need",
    "objectionHandling": "how manager handled objections",
    "upsellCrossSell": "whether upsell or cross-sell occurred",
    "communicationTone": "conversation tone",
    "customerMood": "customer mood",
    "coachingFeedback": "coaching feedback for the manager"
  }
}`,
};

// ── Public API ─────────────────────────────────────────────────────────────────

export function getAnalysisPrompt(
  reportType: ReportType,
  language: AnalysisLanguage = "uk",
  businessType: BusinessType = "other",
): string {
  const base         = baseRules[language];
  const industry     = getIndustryContext(businessType, language);
  const instructions = reportInstructions[language][reportType];
  const schemaExt    = getIndustrySchemaExtension(businessType);

  // Inject industryData into the base JSON schema when there's an industry extension
  let schema = jsonSchema[reportType];
  if (schemaExt) {
    // Insert industryData as a last field before the closing brace
    schema = schema.replace(/\n\}$/, `,\n${schemaExt}\n}`);
  }

  const parts = [base];
  if (industry) parts.push(industry);
  parts.push(instructions);
  parts.push(`Return JSON:\n${schema}`);

  return parts.join("\n\n");
}
