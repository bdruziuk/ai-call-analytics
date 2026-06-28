import type { BusinessType } from "@/lib/businessTypes";
import type { AnalysisLanguage } from "./prompts";

// Industry-specific context injected BEFORE report instructions.
// Written in the output language of the call so the AI doesn't have to translate.
const industryContext: Partial<Record<BusinessType, Record<AnalysisLanguage, string>>> = {
  pizzeria: {
    uk: `Бізнес — піцерія/служба доставки їжі.
Додатково проаналізуй:
- Чи запропонував оператор соуси до піци?
- Чи запропонував оператор напої?
- Чи запропонував оператор десерти або додаткові страви?
- Чи повідомив оператор час доставки?
- Чи підтвердив оператор адресу доставки?
- Чи уточнив оператор спосіб оплати?
- Якщо позиція відсутня — чи запропонував альтернативу?
- Які можливості для upsell були пропущені?`,
    ru: `Бизнес — пиццерия/служба доставки еды.
Дополнительно проанализируй:
- Предложил ли оператор соусы к пицце?
- Предложил ли оператор напитки?
- Предложил ли оператор десерты или дополнительные блюда?
- Сообщил ли оператор время доставки?
- Подтвердил ли оператор адрес доставки?
- Уточнил ли оператор способ оплаты?
- Если позиция отсутствует — предложил ли альтернативу?
- Какие возможности для upsell были упущены?`,
    en: `Business type: pizzeria / food delivery.
Additionally analyze:
- Did the operator offer sauces?
- Did the operator offer drinks?
- Did the operator offer desserts or extra items?
- Was the delivery time communicated?
- Was the delivery address confirmed?
- Was the payment method clarified?
- If an item was unavailable, were alternatives offered?
- What upsell opportunities were missed?`,
    uk_ru: `Бізнес — піцерія/служба доставки їжі.
Додатково проаналізуй:
- Чи запропонував оператор соуси, напої, десерти?
- Чи повідомив час доставки та підтвердив адресу?
- Чи уточнив спосіб оплати?
- Чи запропонував альтернативу при відсутності товару?
- Які upsell можливості були пропущені?`,
  },

  restaurant: {
    uk: `Бізнес — ресторан.
Додатково проаналізуй:
- Чи намагався клієнт забронювати столик?
- Чи відбулося бронювання успішно?
- Чи були запитання про меню або страви?
- Чи запитував клієнт про доставку або самовивіз?
- Чи були особливі побажання (алергії, дієта, декор)?
- Чи запитував клієнт про заходи або банкети?
- Чи відповів оператор чітко та ввічливо?
- Чи потрібен подальший контакт?`,
    ru: `Бизнес — ресторан.
Дополнительно проанализируй:
- Пытался ли клиент забронировать столик?
- Состоялось ли бронирование успешно?
- Были ли вопросы о меню или блюдах?
- Спрашивал ли клиент о доставке или самовывозе?
- Были ли особые пожелания (аллергии, диета, декор)?
- Спрашивал ли клиент о мероприятиях или банкетах?
- Ответил ли оператор чётко и вежливо?
- Нужен ли дальнейший контакт?`,
    en: `Business type: restaurant.
Additionally analyze:
- Was the customer trying to book a table?
- Was the booking completed successfully?
- Were there questions about the menu or dishes?
- Did the customer ask about delivery or takeaway?
- Were there special requests (allergies, diet, decor)?
- Did the customer inquire about events or banquets?
- Did the staff answer clearly and politely?
- Is a follow-up needed?`,
    uk_ru: `Бізнес — ресторан.
Додатково проаналізуй:
- Чи намагався клієнт забронювати столик та чи успішно?
- Запитання про меню, доставку, особливі побажання?
- Запити про заходи або банкети?
- Чи потрібен подальший контакт?`,
  },

  online_store: {
    uk: `Бізнес — інтернет-магазин.
Додатково проаналізуй:
- Чи запитував клієнт про наявність товару?
- Чи були заперечення щодо ціни?
- Чи запитував клієнт про доставку?
- Чи запитував клієнт про оплату?
- Чи запитував клієнт про гарантію або повернення?
- Чи запропонував оператор альтернативні товари?
- Чи скерував оператор клієнта до покупки?
- Які можливості для продажу були пропущені?`,
    ru: `Бизнес — интернет-магазин.
Дополнительно проанализируй:
- Спрашивал ли клиент о наличии товара?
- Были ли возражения по цене?
- Спрашивал ли клиент о доставке?
- Спрашивал ли клиент об оплате?
- Спрашивал ли клиент о гарантии или возврате?
- Предложил ли оператор альтернативные товары?
- Направил ли оператор клиента к покупке?
- Какие возможности для продажи были упущены?`,
    en: `Business type: online store.
Additionally analyze:
- Did the customer ask about product availability?
- Were there price objections?
- Did the customer ask about delivery?
- Did the customer ask about payment?
- Did the customer ask about warranty or returns?
- Did the operator offer alternative products?
- Was the customer guided toward a purchase?
- What sales opportunities were missed?`,
    uk_ru: `Бізнес — інтернет-магазин.
Додатково проаналізуй:
- Запитання про наявність товару, ціну, доставку, гарантію?
- Чи запропонував оператор альтернативи?
- Які можливості продажу були пропущені?`,
  },

  logistics: {
    uk: `Бізнес — логістика та доставка.
Додатково проаналізуй:
- Чи запитував клієнт статус посилки?
- Чи була скарга на затримку доставки?
- Чи була скарга на втрату або пошкодження посилки?
- Чи запитував клієнт корекцію адреси?
- Чи запитував клієнт про тарифи або оплату?
- Чи вирішив оператор проблему клієнта?
- Чи потребувало питання ескалації?
- Чи пояснив оператор подальші кроки?
- Чи залишився клієнт задоволеним?`,
    ru: `Бизнес — логистика и доставка.
Дополнительно проанализируй:
- Спрашивал ли клиент статус посылки?
- Была ли жалоба на задержку доставки?
- Была ли жалоба на потерю или повреждение посылки?
- Запрашивал ли клиент коррекцию адреса?
- Спрашивал ли клиент о тарифах или оплате?
- Решил ли оператор проблему клиента?
- Требовало ли обращение эскалации?
- Объяснил ли оператор дальнейшие шаги?
- Остался ли клиент доволен?`,
    en: `Business type: logistics and delivery.
Additionally analyze:
- Did the customer ask about parcel status?
- Was there a delayed delivery complaint?
- Was there a lost or damaged parcel complaint?
- Did the customer request address correction?
- Did the customer ask about payment or tariffs?
- Did the operator resolve the customer's issue?
- Did the issue require escalation?
- Did the operator explain next steps clearly?
- Was the customer satisfied?`,
    uk_ru: `Бізнес — логістика та доставка.
Додатково проаналізуй:
- Запит статусу, скарга на затримку, втрату чи пошкодження?
- Чи вирішена проблема? Чи потрібна ескалація?
- Чи пояснили подальші кроки? Чи задоволений клієнт?`,
  },

  auto_service: {
    uk: `Бізнес — автосервіс.
Додатково проаналізуй:
- Чи намагався клієнт записатися на сервіс?
- Чи запитував клієнт про вартість ремонту?
- Чи запитував клієнт про діагностику?
- Чи запитував клієнт про наявність запчастин?
- Чи запропонував оператор додаткові послуги?
- Чи були заперечення щодо ціни?
- Чи є терміновість ремонту?
- Чи записали клієнта на візит?`,
    ru: `Бизнес — автосервис.
Дополнительно проанализируй:
- Пытался ли клиент записаться на сервис?
- Спрашивал ли клиент о стоимости ремонта?
- Спрашивал ли клиент о диагностике?
- Спрашивал ли клиент о наличии запчастей?
- Предложил ли оператор дополнительные услуги?
- Были ли возражения по цене?
- Есть ли срочность ремонта?
- Записали ли клиента на визит?`,
    en: `Business type: auto service.
Additionally analyze:
- Did the customer try to book a service appointment?
- Did the customer ask about repair costs?
- Did the customer ask about diagnostics?
- Did the customer ask about spare parts availability?
- Did the operator offer additional services?
- Were there price objections?
- Is the repair urgent?
- Was the customer booked for a visit?`,
    uk_ru: `Бізнес — автосервіс.
Додатково проаналізуй:
- Запис на сервіс, запит вартості, діагностика, запчастини?
- Чи запропоновано додаткові послуги? Чи записали клієнта?`,
  },

  medical_clinic: {
    uk: `Бізнес — медична клініка.
ВАЖЛИВО: Аналізуй лише якість комунікації та бізнес-процес. Не надавай медичних порад.
Додатково проаналізуй:
- Чи намагався клієнт записатися на прийом?
- Чи запитував клієнт про конкретного лікаря?
- Чи запитував клієнт про вид послуги або консультацію?
- Чи запитував клієнт про вартість?
- Чи запитував клієнт про страхування або оплату?
- Чи є терміновість звернення?
- Чи порекомендував оператор наступний крок?
- Чи записали пацієнта успішно?`,
    ru: `Бизнес — медицинская клиника.
ВАЖНО: Анализируй только качество коммуникации и бизнес-процесс. Не давай медицинских советов.
Дополнительно проанализируй:
- Пытался ли клиент записаться на приём?
- Спрашивал ли клиент о конкретном враче?
- Спрашивал ли клиент о виде услуги или консультации?
- Спрашивал ли клиент о стоимости?
- Спрашивал ли клиент о страховании или оплате?
- Есть ли срочность обращения?
- Рекомендовал ли оператор следующий шаг?
- Записали ли пациента успешно?`,
    en: `Business type: medical clinic.
IMPORTANT: Analyze communication quality and business process only. Do not provide medical advice.
Additionally analyze:
- Did the patient try to book an appointment?
- Did the patient ask about a specific doctor?
- Did the patient ask about a service or consultation?
- Did the patient ask about pricing?
- Did the patient ask about insurance or payment?
- Is the medical issue urgent?
- Did the operator recommend a follow-up step?
- Was the patient successfully scheduled?`,
    uk_ru: `Бізнес — медична клініка. Аналізуй лише комунікацію та бізнес-процес, не надавай медичних порад.
Додатково проаналізуй: запис на прийом, вибір лікаря, вартість, терміновість, результат дзвінка.`,
  },

  dental_clinic: {
    uk: `Бізнес — стоматологічна клініка.
ВАЖЛИВО: Аналізуй лише якість комунікації та бізнес-процес. Не надавай медичних порад.
Додатково проаналізуй:
- Чи намагався пацієнт записатися на прийом?
- Чи запитував пацієнт про консультацію?
- Чи запитував пацієнт про вартість лікування?
- Чи є гострий біль або термінове звернення?
- Чи цікавився пацієнт імплантами, протезуванням або ортодонтією?
- Чи запропонував оператор найближчий вільний час?
- Чи записали пацієнта успішно?`,
    ru: `Бизнес — стоматологическая клиника.
ВАЖНО: Анализируй только качество коммуникации и бизнес-процесс. Не давай медицинских советов.
Дополнительно проанализируй:
- Пытался ли пациент записаться на приём?
- Спрашивал ли пациент о консультации?
- Спрашивал ли пациент о стоимости лечения?
- Есть ли острая боль или срочное обращение?
- Интересовался ли пациент имплантами, протезированием или ортодонтией?
- Предложил ли оператор ближайшее свободное время?
- Записали ли пациента успешно?`,
    en: `Business type: dental clinic.
IMPORTANT: Analyze communication quality and business process only. Do not provide medical advice.
Additionally analyze:
- Did the patient try to book an appointment?
- Did the patient ask about a consultation?
- Did the patient ask about treatment costs?
- Is there acute pain or an urgent case?
- Did the patient express interest in implants, prosthetics or orthodontics?
- Did the operator offer the nearest available time slot?
- Was the patient successfully scheduled?`,
    uk_ru: `Бізнес — стоматологічна клініка. Аналізуй лише комунікацію та бізнес-процес, не надавай медичних порад.
Додатково проаналізуй: запис на прийом, консультація, вартість, терміновість, категорія лікування, результат.`,
  },

  beauty_salon: {
    uk: `Бізнес — салон краси.
Додатково проаналізуй:
- Чи намагався клієнт записатися на послугу?
- Чи запитував клієнт про конкретного майстра?
- Чи запитував клієнт про доступний час?
- Чи запитував клієнт про вартість послуги?
- Чи запропонував оператор додаткові послуги?
- Чи є ознаки постійного клієнта?
- Чи відбулося успішне бронювання?`,
    ru: `Бизнес — салон красоты.
Дополнительно проанализируй:
- Пытался ли клиент записаться на услугу?
- Спрашивал ли клиент о конкретном мастере?
- Спрашивал ли клиент о доступном времени?
- Спрашивал ли клиент о стоимости услуги?
- Предложил ли оператор дополнительные услуги?
- Есть ли признаки постоянного клиента?
- Состоялось ли успешное бронирование?`,
    en: `Business type: beauty salon.
Additionally analyze:
- Did the customer try to book a service?
- Did the customer ask for a specific master/specialist?
- Did the customer ask about time availability?
- Did the customer ask about service pricing?
- Did the operator offer additional services?
- Are there signs of a repeat customer?
- Was the booking completed?`,
    uk_ru: `Бізнес — салон краси.
Додатково проаналізуй: запис на послугу, вибір майстра, вартість, додаткові послуги, результат бронювання.`,
  },

  real_estate: {
    uk: `Бізнес — нерухомість.
Додатково проаналізуй:
- Чи цікавився клієнт купівлею чи орендою?
- Який тип об'єкта нерухомості?
- Чи обговорювали бюджет?
- Чи запитував клієнт про конкретний район або локацію?
- Чи домовилися про перегляд об'єкта?
- Чи запитував клієнт про іпотеку або фінансування?
- Які часові рамки прийняття рішення?
- Чи запланований наступний контакт?`,
    ru: `Бизнес — недвижимость.
Дополнительно проанализируй:
- Интересовался ли клиент покупкой или арендой?
- Какой тип недвижимости?
- Обсуждался ли бюджет?
- Спрашивал ли клиент о конкретном районе или локации?
- Договорились ли о просмотре объекта?
- Спрашивал ли клиент об ипотеке или финансировании?
- Каковы временные рамки принятия решения?
- Запланирован ли следующий контакт?`,
    en: `Business type: real estate.
Additionally analyze:
- Is the customer interested in buying or renting?
- What type of property?
- Was budget discussed?
- Did the customer ask about a specific area or location?
- Was a property viewing scheduled?
- Did the customer ask about mortgage or financing?
- What is the decision timeline?
- Was a follow-up scheduled?`,
    uk_ru: `Бізнес — нерухомість.
Додатково проаналізуй: купівля/оренда, тип об'єкта, бюджет, локація, перегляд, іпотека, часові рамки, наступний контакт.`,
  },

  b2b_sales: {
    uk: `Бізнес — B2B продажі.
Додатково проаналізуй:
- Чи відбулася кваліфікація ліда?
- Яка потреба компанії клієнта?
- Чи обговорювали бюджет?
- Чи визначено особу, що приймає рішення (ЛПР)?
- Які часові рамки угоди?
- Чи домовились про наступний крок?
- Чи заплановано зустріч або презентацію?
- Які заперечення висловив клієнт?
- Чи є лід кваліфікованим?`,
    ru: `Бизнес — B2B продажи.
Дополнительно проанализируй:
- Состоялась ли квалификация лида?
- Какая потребность компании клиента?
- Обсуждался ли бюджет?
- Определено ли лицо, принимающее решение (ЛПР)?
- Каковы временные рамки сделки?
- Договорились ли о следующем шаге?
- Запланирована ли встреча или презентация?
- Какие возражения высказал клиент?
- Является ли лид квалифицированным?`,
    en: `Business type: B2B sales.
Additionally analyze:
- Was the lead qualified?
- What is the customer company's need?
- Was budget discussed?
- Was the decision maker identified?
- What is the deal timeline?
- Was a next step agreed upon?
- Was a meeting or presentation scheduled?
- What objections did the customer raise?
- Is this a qualified lead?`,
    uk_ru: `Бізнес — B2B продажі.
Додатково проаналізуй: кваліфікація ліда, потреба клієнта, бюджет, ЛПР, часові рамки, наступний крок, зустріч, заперечення.`,
  },
};

// Industry-specific JSON schema extension (appended to base schema)
const industrySchemaExtension: Partial<Record<BusinessType, string>> = {
  pizzeria: `  "industryData": {
    "insights": ["industry-specific observations"],
    "warnings": ["missed opportunities or process violations"],
    "missedOpportunities": ["specific upsell or service opportunities not taken"],
    "kpis": {
      "saucesOffered": true/false,
      "drinksOffered": true/false,
      "dessertsOffered": true/false,
      "deliveryTimeConfirmed": true/false,
      "addressConfirmed": true/false,
      "paymentMethodClarified": true/false,
      "alternativeOfferedIfUnavailable": true/false
    }
  }`,

  restaurant: `  "industryData": {
    "insights": ["industry-specific observations"],
    "warnings": ["process issues"],
    "missedOpportunities": ["missed conversion or service opportunities"],
    "kpis": {
      "reservationAttempted": true/false,
      "reservationCompleted": true/false,
      "menuQuestionsAnswered": true/false,
      "specialRequestHandled": true/false,
      "eventInquiry": true/false,
      "followUpNeeded": true/false
    }
  }`,

  online_store: `  "industryData": {
    "insights": ["industry-specific observations"],
    "warnings": ["missed sales or process issues"],
    "missedOpportunities": ["specific sales opportunities not taken"],
    "kpis": {
      "alternativeOffered": true/false,
      "outOfStockLostSale": true/false,
      "deliveryObjection": true/false,
      "priceObjection": true/false,
      "warrantyQuestion": true/false,
      "guidedToPurchase": true/false
    }
  }`,

  logistics: `  "industryData": {
    "insights": ["industry-specific observations"],
    "warnings": ["unresolved issues or escalation signals"],
    "missedOpportunities": ["process improvements"],
    "kpis": {
      "issueResolved": true/false,
      "escalationRequired": true/false,
      "complaintType": "none|delay|lost|damaged|address|payment|other",
      "customerSatisfied": true/false,
      "nextStepsExplained": true/false,
      "repeatContactRisk": true/false
    }
  }`,

  auto_service: `  "industryData": {
    "insights": ["industry-specific observations"],
    "warnings": ["missed bookings or service offers"],
    "missedOpportunities": ["additional service opportunities"],
    "kpis": {
      "appointmentBooked": true/false,
      "diagnosticsRequested": true/false,
      "additionalServiceOffered": true/false,
      "priceObjection": true/false,
      "urgentRepair": true/false
    }
  }`,

  medical_clinic: `  "industryData": {
    "insights": ["communication and process observations"],
    "warnings": ["missed bookings or unanswered questions"],
    "missedOpportunities": ["booking or follow-up opportunities"],
    "kpis": {
      "appointmentBooked": true/false,
      "doctorSpecified": true/false,
      "priceObjection": true/false,
      "urgentCase": true/false,
      "followUpRecommended": true/false
    }
  }`,

  dental_clinic: `  "industryData": {
    "insights": ["communication and process observations"],
    "warnings": ["missed bookings or process issues"],
    "missedOpportunities": ["booking or treatment interest opportunities"],
    "kpis": {
      "appointmentBooked": true/false,
      "urgentPainCase": true/false,
      "treatmentCategory": "general|implants|orthodontics|prosthetics|whitening|other|none",
      "priceObjection": true/false,
      "nearestSlotOffered": true/false
    }
  }`,

  beauty_salon: `  "industryData": {
    "insights": ["industry-specific observations"],
    "warnings": ["missed bookings or upsell opportunities"],
    "missedOpportunities": ["additional service opportunities"],
    "kpis": {
      "bookingCompleted": true/false,
      "specificMasterRequested": true/false,
      "additionalServiceOffered": true/false,
      "repeatCustomerSignal": true/false,
      "priceObjection": true/false
    }
  }`,

  real_estate: `  "industryData": {
    "insights": ["industry-specific observations"],
    "warnings": ["missed lead qualification or follow-up"],
    "missedOpportunities": ["qualification or viewing opportunities"],
    "kpis": {
      "intent": "buy|rent|unknown",
      "budgetDiscussed": true/false,
      "viewingScheduled": true/false,
      "mortgageQuestion": true/false,
      "decisionTimeline": "immediate|1month|3months|6months+|unknown",
      "followUpScheduled": true/false
    }
  }`,

  b2b_sales: `  "industryData": {
    "insights": ["industry-specific observations"],
    "warnings": ["missed qualification or next-step opportunities"],
    "missedOpportunities": ["specific sales process gaps"],
    "kpis": {
      "leadQualified": true/false,
      "decisionMakerIdentified": true/false,
      "budgetDiscussed": true/false,
      "meetingScheduled": true/false,
      "nextStepAgreed": true/false,
      "objectionType": "price|timing|authority|need|none|other"
    }
  }`,
};

export function getIndustryContext(
  businessType: BusinessType,
  language: AnalysisLanguage,
): string {
  if (businessType === "other") return "";
  return industryContext[businessType]?.[language] ?? industryContext[businessType]?.["uk"] ?? "";
}

export function getIndustrySchemaExtension(businessType: BusinessType): string {
  if (businessType === "other") return "";
  return industrySchemaExtension[businessType] ?? "";
}
