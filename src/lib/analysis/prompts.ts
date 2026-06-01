export type ReportType = "high_level" | "medium" | "detailed";
export type AnalysisLanguage = "uk" | "ru" | "en" | "uk_ru";

export const REPORT_TYPES: ReportType[] = ["high_level", "medium", "detailed"];

// ── Base rules ────────────────────────────────────────────────────────────────
// Sets the output language and JSON constraints for each call language.

const baseRules: Record<AnalysisLanguage, string> = {
  uk: `Ти аналізуєш дзвінки інтернет-магазинів.
Усі значення JSON пиши виключно українською мовою.
Поверни ТІЛЬКИ валідний JSON. Без markdown. Без пояснень поза JSON.
saleStatus може бути лише: "sold", "not_sold", "potential_sale".
Якщо даних недостатньо — пиши "невідомо".`,

  ru: `Ты анализируешь звонки интернет-магазинов.
Все значения JSON пиши исключительно на русском языке.
Верни ТОЛЬКО валидный JSON. Без markdown. Без объяснений вне JSON.
saleStatus может быть только: "sold", "not_sold", "potential_sale".
Если данных недостаточно — пиши "неизвестно".`,

  en: `You analyze e-commerce store calls.
Write all JSON values in English.
Return ONLY valid JSON. No markdown. No explanations outside JSON.
saleStatus must be one of: "sold", "not_sold", "potential_sale".
If data is insufficient — write "unknown".`,

  uk_ru: `Ти аналізуєш дзвінки інтернет-магазинів, в яких спілкування ведеться українською та/або російською мовою.
Усі значення JSON пиши українською мовою.
Поверни ТІЛЬКИ валідний JSON. Без markdown. Без пояснень поза JSON.
saleStatus може бути лише: "sold", "not_sold", "potential_sale".
Якщо даних недостатньо — пиши "невідомо".`,
};

// ── Report-type instructions per language ─────────────────────────────────────

const reportInstructions: Record<AnalysisLanguage, Record<ReportType, string>> =
  {
    uk: {
      high_level: `Зроби короткий high-level аналіз дзвінка.`,

      medium: `Зроби середній аналіз дзвінка для власника інтернет-магазину.
Оціни: що хотів купити клієнт; чи відбувся продаж; які були заперечення; що менеджер зробив добре і погано; що покращити.`,

      detailed: `Зроби детальний професійний аналіз sales call для e-commerce.
Оціни: продукт; намір клієнта; результат і причини продажу; заперечення; якість консультації та виявлення потреби; роботу із сумнівами; upsell/cross-sell; тон комунікації; помилки менеджера; конкретні рекомендації та coaching feedback для менеджера.`,
    },

    ru: {
      high_level: `Сделай краткий high-level анализ звонка.`,

      medium: `Сделай средний анализ звонка для владельца интернет-магазина.
Оцени: что хотел купить клиент; состоялась ли продажа; какие были возражения; что менеджер сделал хорошо и плохо; что улучшить.`,

      detailed: `Сделай детальный профессиональный анализ sales call для e-commerce.
Оцени: продукт; намерение клиента; результат и причины продажи; возражения; качество консультации и выявления потребности; работу с сомнениями; upsell/cross-sell; тон коммуникации; ошибки менеджера; конкретные рекомендации и coaching feedback для менеджера.`,
    },

    en: {
      high_level: `Provide a concise high-level analysis of the call.`,

      medium: `Provide a medium-depth analysis of the call for an e-commerce store owner.
Evaluate: what the customer wanted to buy; whether a sale occurred; objections raised; what the manager did well and poorly; what to improve.`,

      detailed: `Provide a detailed professional sales call analysis for e-commerce.
Evaluate: product; customer intent; sale outcome and reasons; objections; consultation quality and needs discovery; handling doubts; upsell/cross-sell; communication tone; manager mistakes; specific recommendations and coaching feedback for the manager.`,
    },

    uk_ru: {
      high_level: `Зроби короткий high-level аналіз дзвінка (розмова ведеться українською та/або російською).`,

      medium: `Зроби середній аналіз дзвінка для власника інтернет-магазину (розмова ведеться українською та/або російською).
Оціни: що хотів купити клієнт; чи відбувся продаж; які були заперечення; що менеджер зробив добре і погано; що покращити.`,

      detailed: `Зроби детальний професійний аналіз sales call (розмова ведеться українською та/або російською).
Оціни: продукт; намір клієнта; результат і причини продажу; заперечення; якість консультації та виявлення потреби; роботу із сумнівами; upsell/cross-sell; тон комунікації; помилки менеджера; конкретні рекомендації та coaching feedback для менеджера.`,
    },
  };

// ── JSON schema (keys are always English) ─────────────────────────────────────

const jsonSchema: Record<ReportType, string> = {
  high_level: `{
  "summary": "brief 1-2 sentence call summary",
  "product": "product or service discussed",
  "saleStatus": "sold | not_sold | potential_sale",
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
  "saleStatus": "sold | not_sold | potential_sale",
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
  "saleStatus": "sold | not_sold | potential_sale",
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

// ── Public API ────────────────────────────────────────────────────────────────

export function getAnalysisPrompt(
  reportType: ReportType,
  language: AnalysisLanguage = "uk",
): string {
  const base = baseRules[language];
  const instructions = reportInstructions[language][reportType];
  const schema = jsonSchema[reportType];
  return `${base}\n\n${instructions}\n\nReturn JSON:\n${schema}`;
}
