"use client";

import { useState } from "react";
import Link from "next/link";
import {
  PhoneCall, BarChart3, TrendingUp, Clock,
  CheckCircle2, ChevronDown, ArrowRight, Shield,
  Target, Sparkles, DollarSign, Star, MapPin,
} from "lucide-react";

/* ── Design tokens ─────────────────────────────────────────────────────── */
const BLUE = "#2563EB";
const DARK = "#0F172A";

/* ══════════════════════════════════════════════════════════════════════════
   DASHBOARD MOCKUP
   ══════════════════════════════════════════════════════════════════════════ */
function DashboardMockup() {
  return (
    <div className="relative mx-auto mt-14 w-full max-w-2xl">
      {/* Ambient glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-6 rounded-3xl"
        style={{ background: `radial-gradient(ellipse at center, ${BLUE}22 0%, transparent 70%)` }}
      />
      <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-blue-100/60">
        {/* Window chrome */}
        <div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50 px-4 py-3">
          <div className="flex gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
            <span className="h-2.5 w-2.5 rounded-full bg-yellow-400" />
            <span className="h-2.5 w-2.5 rounded-full bg-green-400" />
          </div>
          <span className="mx-auto text-[11px] font-medium text-slate-400">
            AI Call Analytics — Дашборд
          </span>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 divide-x divide-y divide-slate-100 border-b border-slate-100 md:grid-cols-4 md:divide-y-0">
          {[
            { label: "Середній бал", value: "8.4", trend: "↑ +0.6", good: true },
            { label: "Апсейл",       value: "34%",  trend: "↑ +12%", good: true },
            { label: "Втрачені",     value: "7",    trend: "↓ −3",   good: true },
            { label: "Тривалість",   value: "2:48", trend: "↓ −18с", good: true },
          ].map((s) => (
            <div key={s.label} className="p-3 text-center">
              <p className="text-[9px] uppercase tracking-wide text-slate-400">{s.label}</p>
              <p className="text-lg font-bold text-slate-900">{s.value}</p>
              <p className="text-[10px] font-semibold text-emerald-600">{s.trend}</p>
            </div>
          ))}
        </div>

        {/* Operator rows */}
        <div className="p-4">
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
            Оператори сьогодні
          </p>
          <div className="space-y-2.5">
            {[
              { name: "Марія К.",   score: 9.2, upsell: "67%", pct: "92%" },
              { name: "Дмитро В.", score: 8.7, upsell: "52%", pct: "87%" },
              { name: "Олена М.",  score: 7.1, upsell: "29%", pct: "71%" },
            ].map((op) => (
              <div key={op.name} className="flex items-center gap-3">
                <span className="w-18 shrink-0 text-xs font-medium text-slate-700">{op.name}</span>
                <div className="flex-1 overflow-hidden rounded-full bg-slate-100 h-1.5">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: op.pct, background: BLUE }}
                  />
                </div>
                <span className="w-8 shrink-0 text-right text-xs font-bold text-slate-900">{op.score}</span>
                <span className="w-10 shrink-0 text-right text-[10px] font-semibold text-emerald-600">{op.upsell}</span>
              </div>
            ))}
          </div>
        </div>

        {/* AI insight */}
        <div
          className="mx-4 mb-4 rounded-xl px-4 py-3"
          style={{ background: `${BLUE}0d`, border: `1px solid ${BLUE}22` }}
        >
          <div className="flex items-start gap-2">
            <Sparkles size={13} style={{ color: BLUE }} className="mt-0.5 shrink-0" />
            <p className="text-[11px] leading-relaxed text-slate-700">
              <strong style={{ color: BLUE }}>AI інсайт:</strong> Олена М. не пропонує напої у 71% дзвінків.
              Потенційний додатковий виторг —{" "}
              <strong>4 200 грн/міс.</strong>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   FAQ ACCORDION
   ══════════════════════════════════════════════════════════════════════════ */
const FAQS = [
  {
    q: "Скільки часу займає підключення?",
    a: "Від 10 до 30 хвилин. Ми підтримуємо Binotel, Ringostat, Kyivstar Cloud PBX, VoIPTime та інші IP-телефонії через вебхук. Ніякого додаткового обладнання не потрібно.",
  },
  {
    q: "Чи потрібне навчання персоналу?",
    a: "Ні. Система повністю автоматична — оператори продовжують приймати дзвінки як завжди. Менеджер отримує готові звіти та рекомендації у дашборді.",
  },
  {
    q: "Які телефонії підтримуються?",
    a: "Binotel, Ringostat, Kyivstar Cloud PBX, VoIPTime Cloud, KeyCRM, Twilio, Aircall та будь-яка IP-АТС, що підтримує запис дзвінків і webhook.",
  },
  {
    q: "Чи безпечні дані?",
    a: "Так. Всі записи та транскрипти зберігаються у зашифрованому вигляді. Доступ лише для авторизованих менеджерів. Дані не передаються третім особам.",
  },
  {
    q: "Чи можна протестувати безкоштовно?",
    a: "Так! Ми пропонуємо безкоштовний аудит перших 50 дзвінків вашого ресторану. Ви отримаєте повний звіт без жодних зобов'язань.",
  },
];

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-slate-200 last:border-0">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between py-5 text-left"
      >
        <span className="pr-4 text-base font-semibold text-slate-900">{q}</span>
        <ChevronDown
          size={18}
          className="shrink-0 text-slate-400 transition-transform duration-200"
          style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
        />
      </button>
      {open && <p className="pb-5 text-sm leading-relaxed text-slate-600">{a}</p>}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   LEAD CAPTURE FORM
   ══════════════════════════════════════════════════════════════════════════ */
function LeadForm() {
  const [form, setForm] = useState({ name: "", restaurant: "", phone: "", email: "" });
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      setStatus(res.ok ? "success" : "error");
    } catch {
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <div className="rounded-2xl bg-white p-10 text-center shadow-xl">
        <CheckCircle2 size={52} className="mx-auto mb-4" style={{ color: BLUE }} />
        <h3 className="text-xl font-extrabold text-slate-900">Дякуємо!</h3>
        <p className="mt-2 text-slate-600">
          Ми зв'яжемося з вами протягом 24 годин та надішлемо ваш безкоштовний аудит.
        </p>
      </div>
    );
  }

  const fields = [
    { id: "name",       label: "Ім'я",          type: "text",  placeholder: "Іван Петренко"            },
    { id: "restaurant", label: "Назва закладу",  type: "text",  placeholder: "Піцерія «Мамма Міа»"     },
    { id: "phone",      label: "Телефон",        type: "tel",   placeholder: "+380 XX XXX XX XX"        },
    { id: "email",      label: "Email",          type: "email", placeholder: "ivan@restaurant.ua"       },
  ] as const;

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl bg-white p-6 shadow-xl md:p-8">
      <div className="grid gap-4 sm:grid-cols-2">
        {fields.map((f) => (
          <div key={f.id}>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">{f.label}</label>
            <input
              type={f.type}
              required
              value={form[f.id]}
              onChange={(e) => setForm((prev) => ({ ...prev, [f.id]: e.target.value }))}
              placeholder={f.placeholder}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
          </div>
        ))}
      </div>

      {status === "error" && (
        <p className="mt-3 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600">
          Щось пішло не так. Спробуйте ще раз або напишіть нам напряму.
        </p>
      )}

      <button
        type="submit"
        disabled={status === "loading"}
        className="mt-5 w-full rounded-xl py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-200 transition hover:opacity-90 disabled:opacity-60"
        style={{ background: BLUE }}
      >
        {status === "loading" ? "Надсилаємо…" : "Отримати безкоштовний аудит →"}
      </button>
      <p className="mt-3 text-center text-xs text-slate-400">
        Без спаму. Без зобов'язань. Тільки результати.
      </p>
    </form>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ══════════════════════════════════════════════════════════════════════════ */
type Props = { lang: string; isLoggedIn: boolean };

export function RestaurantLandingPage({ lang, isLoggedIn }: Props) {
  return (
    <div className="overflow-x-hidden bg-white">

      {/* ══ SECTION 1 — HERO ══════════════════════════════════════════════ */}
      <section className="relative bg-white pt-16 pb-4 md:pt-24">
        {/* Background radial glow */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 80% 55% at 50% -5%, rgba(37,99,235,0.10) 0%, transparent 70%)",
          }}
        />

        <div className="relative mx-auto max-w-5xl px-4 text-center md:px-6">
          {/* Badge */}
          <div
            className="mb-6 inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-semibold"
            style={{ borderColor: `${BLUE}30`, background: `${BLUE}0d`, color: BLUE }}
          >
            <span className="h-1.5 w-1.5 animate-pulse rounded-full" style={{ background: BLUE }} />
            AI-аналітика для ресторанів та доставки їжі
          </div>

          {/* Headline */}
          <h1 className="mx-auto max-w-3xl text-4xl font-extrabold leading-tight tracking-tight text-slate-900 md:text-5xl lg:text-6xl">
            Скільки грошей ваш ресторан{" "}
            <span style={{ color: BLUE }}>втрачає на дзвінках</span>{" "}
            прямо зараз?
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-slate-500 md:text-xl">
            AI автоматично аналізує{" "}
            <strong className="text-slate-700">100% дзвінків</strong>, знаходить втрачені замовлення,
            контролює апсейл та допомагає збільшувати прибуток без додаткового персоналу.
          </p>

          {/* CTAs */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <a
              href="#audit"
              className="inline-flex items-center gap-2 rounded-xl px-7 py-3.5 text-base font-bold text-white shadow-lg shadow-blue-200/60 transition hover:opacity-90"
              style={{ background: BLUE }}
            >
              Отримати безкоштовний аудит
              <ArrowRight size={18} />
            </a>
            <a
              href="#how"
              className="inline-flex items-center gap-2 rounded-xl border-2 border-slate-200 bg-white px-7 py-3.5 text-base font-semibold text-slate-700 transition hover:border-blue-300 hover:text-blue-700"
            >
              Як це працює
            </a>
          </div>

          {/* Trust signals */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-xs text-slate-400">
            {[
              "✓ Безкоштовний аудит 50 дзвінків",
              "✓ Підключення за 10 хвилин",
              "✓ Без прихованих платежів",
            ].map((t) => (
              <span key={t}>{t}</span>
            ))}
          </div>

          {/* Dashboard mockup */}
          <DashboardMockup />
        </div>
      </section>

      {/* ══ SECTION 2 — PROBLEM ═══════════════════════════════════════════ */}
      <section className="bg-slate-50 py-20 md:py-28">
        <div className="mx-auto max-w-5xl px-4 md:px-6">
          <p className="mb-3 text-center text-sm font-semibold uppercase tracking-widest text-blue-600">
            Прихована ціна кожного дзвінка
          </p>
          <h2 className="mb-4 text-center text-3xl font-extrabold tracking-tight text-slate-900 md:text-4xl">
            Кожен дзвінок — це можливість або втрата
          </h2>
          <p className="mx-auto mb-12 max-w-xl text-center text-slate-500">
            Без аналітики ви не знаєте, що саме відбувається. Ось найбільш поширені проблеми.
          </p>

          <div className="grid gap-5 md:grid-cols-3">
            {[
              {
                Icon: Clock,
                iconCls: "bg-amber-100 text-amber-600",
                problem: "Оператор шукає позицію в меню 2 хвилини",
                impact: "Клієнт кладе слухавку та замовляє у конкурентів",
                stat: "≈23% дзвінків завершуються без замовлення",
              },
              {
                Icon: DollarSign,
                iconCls: "bg-red-100 text-red-600",
                problem: "Не запропонували напій або десерт",
                impact: "Втрачений додатковий прибуток на кожному замовленні",
                stat: "Середній апсейл — від 40 до 120 грн на чек",
              },
              {
                Icon: MapPin,
                iconCls: "bg-purple-100 text-purple-600",
                problem: "Помилка в адресі доставки",
                impact: "Повернення замовлення та негативний відгук",
                stat: "1 помилка = збиток до 400 грн + репутація",
              },
            ].map(({ Icon, iconCls, problem, impact, stat }) => (
              <div
                key={problem}
                className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100 transition hover:shadow-md hover:ring-blue-100"
              >
                <div className={`mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl ${iconCls}`}>
                  <Icon size={20} />
                </div>
                <p className="mb-2 text-base font-bold text-slate-900">{problem}</p>
                <p className="mb-4 text-sm text-red-600">→ {impact}</p>
                <div className="rounded-lg bg-slate-50 px-3 py-2">
                  <p className="text-xs text-slate-500">{stat}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Highlighted stat */}
          <div
            className="mt-10 rounded-2xl p-6 text-center md:p-8"
            style={{ background: `${BLUE}0d`, border: `1px solid ${BLUE}22` }}
          >
            <p className="text-lg font-bold text-slate-900 md:text-xl">
              💡 Навіть{" "}
              <span style={{ color: BLUE }}>10 пропущених апсейлів на день</span>{" "}
              можуть коштувати ресторану{" "}
              <span style={{ color: BLUE }}>десятки тисяч гривень щомісяця.</span>
            </p>
            <p className="mt-2 text-sm text-slate-500">
              При середньому апсейлі 50 грн: 10 × 50 × 30 = 15 000 грн/міс.
              А якщо пропущено 20 дзвінків?
            </p>
          </div>
        </div>
      </section>

      {/* ══ SECTION 3 — HOW IT WORKS ══════════════════════════════════════ */}
      <section id="how" className="bg-white py-20 md:py-28">
        <div className="mx-auto max-w-5xl px-4 md:px-6">
          <p className="mb-3 text-center text-sm font-semibold uppercase tracking-widest text-blue-600">
            Як це працює
          </p>
          <h2 className="mb-14 text-center text-3xl font-extrabold tracking-tight text-slate-900 md:text-4xl">
            Від дзвінка до інсайту за хвилину
          </h2>

          <div className="relative grid gap-10 md:grid-cols-4">
            {/* Connector */}
            <div
              aria-hidden
              className="absolute top-8 left-0 right-0 hidden h-px md:block"
              style={{
                background: `linear-gradient(90deg, transparent 0%, ${BLUE}30 15%, ${BLUE}30 85%, transparent 100%)`,
                margin: "0 11%",
              }}
            />

            {[
              {
                Icon: PhoneCall,
                num: 1,
                title: "Дзвінок надходить",
                desc: "Запис автоматично передається через webhook з вашої телефонії",
              },
              {
                Icon: Sparkles,
                num: 2,
                title: "AI транскрибує",
                desc: "Розмова перетворюється у текст із розпізнаванням ролей оператор / клієнт",
              },
              {
                Icon: BarChart3,
                num: 3,
                title: "AI аналізує",
                desc: "Оцінює якість обслуговування, апсейл, помилки та причини відмов",
              },
              {
                Icon: TrendingUp,
                num: 4,
                title: "Дашборд показує",
                desc: "Готові інсайти та конкретні рекомендації для кожного оператора",
              },
            ].map(({ Icon, num, title, desc }) => (
              <div key={num} className="relative flex flex-col items-center text-center">
                <div
                  className="relative z-10 mb-4 flex h-16 w-16 items-center justify-center rounded-2xl shadow-lg shadow-blue-100"
                  style={{ background: `linear-gradient(135deg, ${BLUE} 0%, #1d4ed8 100%)` }}
                >
                  <Icon size={24} className="text-white" />
                  <span
                    className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-white text-[9px] font-bold shadow"
                    style={{ color: BLUE }}
                  >
                    {num}
                  </span>
                </div>
                <h3 className="mb-2 text-base font-bold text-slate-900">{title}</h3>
                <p className="text-sm leading-relaxed text-slate-500">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ SECTION 4 — BENEFITS ══════════════════════════════════════════ */}
      <section className="bg-slate-50 py-20 md:py-28">
        <div className="mx-auto max-w-5xl px-4 md:px-6">
          <p className="mb-3 text-center text-sm font-semibold uppercase tracking-widest text-blue-600">
            Що ви отримуєте
          </p>
          <h2 className="mb-14 text-center text-3xl font-extrabold tracking-tight text-slate-900 md:text-4xl">
            Контроль над кожним аспектом дзвінка
          </h2>

          <div className="grid gap-6 md:grid-cols-2">
            {[
              {
                Icon: Shield,
                iconCls: "bg-blue-50 text-blue-600",
                title: "100% контроль якості",
                desc: "AI оцінює кожен дзвінок за чітким чеклистом — вітання, уточнення замовлення, пропозиція апсейлу, підтвердження адреси.",
                outcome: "Ви завжди знаєте, що відбувається на кожному дзвінку.",
                badges: ["+100% охоплення", "0 пропущених"],
              },
              {
                Icon: Target,
                iconCls: "bg-red-50 text-red-600",
                title: "Аналіз втрачених замовлень",
                desc: "Дізнайтесь точно, чому клієнти не роблять замовлення: довге очікування, відсутність позиції в меню, незадоволення ціною.",
                outcome: "Скоротіть втрати та поверніть клієнтів.",
                badges: ["−20% відмов", "+15% конверсія"],
              },
              {
                Icon: DollarSign,
                iconCls: "bg-emerald-50 text-emerald-600",
                title: "Моніторинг апсейлу",
                desc: "Відстежуйте, хто з операторів пропонує напої, десерти та соуси. Порівнюйте показники між змінами та операторами.",
                outcome: "Збільшіть середній чек без зміни меню.",
                badges: ["+18-35% апсейл", "+40-120 грн/чек"],
              },
              {
                Icon: Clock,
                iconCls: "bg-purple-50 text-purple-600",
                title: "Аналітика ефективності",
                desc: "Відстежуйте тривалість дзвінків, причини повторних дзвінків та завантаженість операторів у реальному часі.",
                outcome: "Збільшіть пропускну здатність без додаткового персоналу.",
                badges: ["−22% тривалість", "+30% ємність"],
              },
            ].map(({ Icon, iconCls, title, desc, outcome, badges }) => (
              <div
                key={title}
                className="flex flex-col rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100 transition hover:shadow-md hover:ring-blue-100"
              >
                <div className={`mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl ${iconCls}`}>
                  <Icon size={20} />
                </div>
                <h3 className="mb-2 text-lg font-bold text-slate-900">{title}</h3>
                <p className="mb-4 flex-1 text-sm leading-relaxed text-slate-500">{desc}</p>
                <div className="mb-4 rounded-lg bg-slate-50 px-4 py-2.5">
                  <p className="text-xs font-semibold text-slate-700">→ {outcome}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {badges.map((b) => (
                    <span
                      key={b}
                      className="rounded-full px-3 py-1 text-xs font-semibold"
                      style={{ background: `${BLUE}0d`, color: BLUE }}
                    >
                      {b}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ SECTION 5 — DASHBOARD PREVIEW ════════════════════════════════ */}
      <section style={{ background: DARK }} className="py-20 md:py-28">
        <div className="mx-auto max-w-5xl px-4 md:px-6">
          <p className="mb-3 text-center text-sm font-semibold uppercase tracking-widest text-blue-400">
            Продукт
          </p>
          <h2 className="mb-4 text-center text-3xl font-extrabold tracking-tight text-white md:text-4xl">
            Один дашборд — повна картина
          </h2>
          <p className="mx-auto mb-12 max-w-xl text-center text-slate-400">
            Всі метрики в одному місці. Зрозуміло для менеджера, точно для власника.
          </p>

          <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-900 shadow-2xl">
            {/* Chrome */}
            <div className="flex items-center gap-2 border-b border-white/10 px-5 py-3">
              <div className="flex gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-red-500/70" />
                <span className="h-2.5 w-2.5 rounded-full bg-yellow-500/70" />
                <span className="h-2.5 w-2.5 rounded-full bg-green-500/70" />
              </div>
              <span className="mx-auto text-[11px] font-medium text-white/30">
                AI Call Analytics — Дашборд
              </span>
            </div>

            <div className="space-y-4 p-4 md:p-5">
              {/* Top KPIs */}
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {[
                  { label: "Топ оператор",      value: "Марія К.",  sub: "8.9/10 сьогодні",  accent: "text-emerald-400" },
                  { label: "Апсейл ставка",      value: "38%",       sub: "+11% за тиждень",  accent: "text-emerald-400" },
                  { label: "Втрачені замовл.",   value: "5",         sub: "–4 vs вчора",      accent: "text-emerald-400" },
                  { label: "Сер. тривалість",    value: "2:41",      sub: "–7с vs норма",     accent: "text-emerald-400" },
                ].map((s) => (
                  <div key={s.label} className="rounded-xl bg-white/5 p-4">
                    <p className="mb-1 text-[10px] text-white/40">{s.label}</p>
                    <p className="text-xl font-bold text-white">{s.value}</p>
                    <p className={`mt-0.5 text-[10px] font-semibold ${s.accent}`}>{s.sub}</p>
                  </div>
                ))}
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                {/* Upsell leaderboard */}
                <div className="rounded-xl bg-white/5 p-4">
                  <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-white/40">
                    Апсейл лідери
                  </p>
                  {[
                    { name: "Марія К.",   pct: "67%", w: "67%" },
                    { name: "Іван Д.",    pct: "58%", w: "58%" },
                    { name: "Олена М.",   pct: "31%", w: "31%" },
                    { name: "Андрій Р.", pct: "24%", w: "24%" },
                  ].map((op) => (
                    <div key={op.name} className="mb-2.5 last:mb-0">
                      <div className="mb-1 flex justify-between">
                        <span className="text-[11px] text-white/60">{op.name}</span>
                        <span className="text-[11px] font-bold text-white">{op.pct}</span>
                      </div>
                      <div className="h-1 overflow-hidden rounded-full bg-white/10">
                        <div className="h-full rounded-full bg-emerald-400" style={{ width: op.w }} />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Lost order reasons */}
                <div className="rounded-xl bg-white/5 p-4">
                  <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-white/40">
                    Причини відмов
                  </p>
                  {[
                    { reason: "Довге очікування",     count: 8, cls: "bg-red-400"    },
                    { reason: "Немає позиції в меню", count: 5, cls: "bg-amber-400"  },
                    { reason: "Висока ціна",           count: 4, cls: "bg-orange-400" },
                    { reason: "Помилка оператора",    count: 2, cls: "bg-purple-400" },
                  ].map((r) => (
                    <div key={r.reason} className="mb-2.5 flex items-center gap-2 last:mb-0">
                      <span className={`h-2 w-2 shrink-0 rounded-full ${r.cls}`} />
                      <span className="flex-1 text-[11px] text-white/60">{r.reason}</span>
                      <span className="text-[11px] font-bold text-white">{r.count}</span>
                    </div>
                  ))}
                </div>

                {/* Sentiment + AI insight */}
                <div className="flex flex-col gap-3">
                  <div className="rounded-xl bg-white/5 p-4">
                    <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-white/40">
                      Настрій клієнтів
                    </p>
                    <div className="flex gap-3">
                      {[
                        { label: "Позит.", pct: "72%", cls: "bg-emerald-400" },
                        { label: "Нейтр.", pct: "19%", cls: "bg-slate-500"   },
                        { label: "Негат.", pct: "9%",  cls: "bg-red-400"     },
                      ].map((s) => (
                        <div key={s.label} className="flex-1 text-center">
                          <p className="mb-1 text-base font-bold text-white">{s.pct}</p>
                          <div className={`h-1.5 w-full rounded-full ${s.cls}`} />
                          <p className="mt-1 text-[9px] text-white/30">{s.label}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div
                    className="flex-1 rounded-xl p-4"
                    style={{ background: "rgba(16,185,129,0.10)", border: "1px solid rgba(16,185,129,0.20)" }}
                  >
                    <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-emerald-400">
                      AI інсайт дня
                    </p>
                    <p className="text-[11px] leading-relaxed text-white/70">
                      Дзвінки між 12:00–14:00 мають на 34% нижчий апсейл. Рекомендовано — бриф для обідньої зміни.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══ SECTION 6 — INTEGRATIONS ══════════════════════════════════════ */}
      <section className="bg-white py-20 md:py-28">
        <div className="mx-auto max-w-5xl px-4 md:px-6">
          <p className="mb-3 text-center text-sm font-semibold uppercase tracking-widest text-blue-600">
            Інтеграції
          </p>
          <h2 className="mb-4 text-center text-3xl font-extrabold tracking-tight text-slate-900 md:text-4xl">
            Працює з вашою інфраструктурою
          </h2>
          <p className="mx-auto mb-12 max-w-lg text-center text-slate-500">
            Підключення займає менше 10 хвилин. Ніякого додаткового обладнання або IT-відділу.
          </p>

          <div className="mb-12 flex flex-wrap items-center justify-center gap-3">
            {["Binotel", "Ringostat", "KeyCRM", "Kyivstar PBX", "VoIPTime", "Poster POS", "iiko", "Aircall", "Twilio"].map(
              (name) => (
                <div
                  key={name}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-5 py-3 text-sm font-semibold text-slate-600 shadow-sm"
                >
                  {name}
                </div>
              ),
            )}
          </div>

          {/* Flow */}
          <div className="flex flex-wrap items-center justify-center gap-3 text-sm font-semibold">
            {[
              { label: "📞 Дзвінок",  style: { background: `${BLUE}0d`, color: BLUE,        border: `1px solid ${BLUE}25`        } },
              { label: "→",           style: { color: "#CBD5E1", border: "none", background: "none" }, plain: true },
              { label: "🤖 AI аналіз", style: { background: "#7c3aed11", color: "#7c3aed", border: "1px solid #7c3aed22" } },
              { label: "→",           style: { color: "#CBD5E1", border: "none", background: "none" }, plain: true },
              { label: "📊 Дашборд",  style: { background: "#059669111", color: "#059669",  border: "1px solid #05966922"         } },
              { label: "→",           style: { color: "#CBD5E1", border: "none", background: "none" }, plain: true },
              { label: "💡 Рішення",  style: { background: "#d9770611", color: "#d97706",   border: "1px solid #d9770622"         } },
            ].map(({ label, style, plain }, i) =>
              plain ? (
                <span key={i} className="text-lg font-bold text-slate-300">{label}</span>
              ) : (
                <span key={label} className="rounded-xl px-4 py-2" style={style}>
                  {label}
                </span>
              ),
            )}
          </div>
        </div>
      </section>

      {/* ══ SECTION 7 — ROI ═══════════════════════════════════════════════ */}
      <section
        className="py-20 md:py-28"
        style={{ background: `linear-gradient(135deg, ${BLUE} 0%, #1d4ed8 100%)` }}
      >
        <div className="mx-auto max-w-4xl px-4 md:px-6">
          <p className="mb-3 text-center text-sm font-semibold uppercase tracking-widest text-blue-200">
            Розрахунок ROI
          </p>
          <h2 className="mb-12 text-center text-3xl font-extrabold tracking-tight text-white md:text-4xl">
            Порахуй потенційний прибуток
          </h2>

          <div className="grid gap-6 md:grid-cols-2 md:items-center">
            {/* Calculation */}
            <div className="space-y-3">
              {[
                { label: "Дзвінків на день",                    value: "100" },
                { label: "× Додатковий апсейл на дзвінок",     value: "50 грн" },
                { label: "× Кількість днів",                    value: "30" },
              ].map(({ label, value }) => (
                <div
                  key={label}
                  className="flex items-center justify-between rounded-xl px-5 py-4"
                  style={{ background: "rgba(255,255,255,0.12)" }}
                >
                  <span className="text-sm text-blue-100">{label}</span>
                  <span className="text-lg font-bold text-white">{value}</span>
                </div>
              ))}
              <div className="h-px bg-white/20" />
              <div
                className="flex items-center justify-between rounded-xl px-5 py-4"
                style={{ background: "rgba(255,255,255,0.22)", outline: "2px solid rgba(255,255,255,0.30)" }}
              >
                <span className="text-sm font-bold text-blue-100">= Додатковий виторг щомісяця</span>
                <span className="text-2xl font-extrabold text-white">150 000 грн</span>
              </div>
            </div>

            {/* Mini calculator */}
            <div className="rounded-2xl bg-white p-6 shadow-xl md:p-8">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
                Навіть +20 апсейлів/день
              </p>
              <p className="mb-6 text-2xl font-extrabold text-slate-900">
                Для вашого ресторану це:
              </p>
              <div className="mb-6 space-y-3">
                {[
                  { period: "На день",   value: "+1 000 грн"   },
                  { period: "На місяць", value: "+30 000 грн"  },
                  { period: "На рік",    value: "+360 000 грн" },
                ].map(({ period, value }) => (
                  <div key={period} className="flex justify-between border-b border-slate-100 pb-3 last:border-0">
                    <span className="text-sm text-slate-500">{period}</span>
                    <span className="text-sm font-bold text-slate-900">{value}</span>
                  </div>
                ))}
              </div>
              <a
                href="#audit"
                className="block w-full rounded-xl py-3 text-center text-sm font-bold text-white transition hover:opacity-90"
                style={{ background: BLUE }}
              >
                Розрахувати для мого ресторану →
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ══ SECTION 8 — CASE STUDY ════════════════════════════════════════ */}
      <section className="bg-slate-50 py-20 md:py-28">
        <div className="mx-auto max-w-4xl px-4 md:px-6">
          <p className="mb-3 text-center text-sm font-semibold uppercase tracking-widest text-blue-600">
            Кейс
          </p>
          <h2 className="mb-12 text-center text-3xl font-extrabold tracking-tight text-slate-900 md:text-4xl">
            Як доставка суші збільшила середній чек на 18%
          </h2>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Metrics */}
            <div className="grid grid-cols-2 gap-4">
              {[
                { value: "+18%",    label: "Середній чек",        clr: "text-emerald-600", bg: "bg-emerald-50" },
                { value: "+31%",    label: "Ставка апсейлу",      clr: "text-blue-600",    bg: "bg-blue-50"    },
                { value: "−22%",    label: "Тривалість дзвінка",  clr: "text-purple-600",  bg: "bg-purple-50"  },
                { value: "2 тижні", label: "Впровадження",        clr: "text-amber-600",   bg: "bg-amber-50"   },
              ].map(({ value, label, clr, bg }) => (
                <div key={label} className={`rounded-2xl ${bg} p-5 text-center`}>
                  <p className={`text-3xl font-extrabold ${clr}`}>{value}</p>
                  <p className="mt-1 text-xs font-medium text-slate-600">{label}</p>
                </div>
              ))}
            </div>

            {/* Testimonial */}
            <div className="flex flex-col justify-center rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
              <div className="mb-4 flex gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} size={16} className="fill-amber-400 text-amber-400" />
                ))}
              </div>
              <blockquote className="mb-4 text-base italic leading-relaxed text-slate-700">
                "Ми навіть не підозрювали, що наші оператори пропонують доповнення лише у 20% дзвінків.
                AI показав нам реальну картину. За перший місяць — плюс 38 000 грн виторгу."
              </blockquote>
              <div>
                <p className="font-semibold text-slate-900">Олексій Шевченко</p>
                <p className="text-sm text-slate-500">Власник, доставка суші "Wasabi Express", Київ</p>
              </div>
            </div>
          </div>

          {/* Story breakdown */}
          <div className="mt-6 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
            <h3 className="mb-4 text-base font-bold text-slate-900">Що відбулося:</h3>
            <div className="grid gap-6 md:grid-cols-3">
              {[
                { emoji: "😔", step: "До",        desc: "Оператори пропонували апсейл у 22% дзвінків. Менеджер не знав про цю проблему." },
                { emoji: "🤖", step: "Процес",    desc: "AI проаналізував 100% дзвінків і виявив конкретні причини та конкретних операторів." },
                { emoji: "🚀", step: "Результат", desc: "Після коригуючого брифінгу апсейл виріс до 53%. Середній чек +18% за перший місяць." },
              ].map(({ emoji, step, desc }) => (
                <div key={step}>
                  <p className="mb-2 text-3xl">{emoji}</p>
                  <p className="mb-1 text-sm font-bold text-slate-900">{step}</p>
                  <p className="text-sm leading-relaxed text-slate-500">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══ SECTION 9 — FAQ ═══════════════════════════════════════════════ */}
      <section className="bg-white py-20 md:py-28">
        <div className="mx-auto max-w-2xl px-4 md:px-6">
          <p className="mb-3 text-center text-sm font-semibold uppercase tracking-widest text-blue-600">
            FAQ
          </p>
          <h2 className="mb-12 text-center text-3xl font-extrabold tracking-tight text-slate-900 md:text-4xl">
            Часті запитання
          </h2>
          <div className="rounded-2xl bg-slate-50 px-6 md:px-8">
            {FAQS.map((faq) => (
              <FAQItem key={faq.q} {...faq} />
            ))}
          </div>
        </div>
      </section>

      {/* ══ SECTION 10 — FINAL CTA ════════════════════════════════════════ */}
      <section id="audit" style={{ background: DARK }} className="py-20 md:py-28">
        <div className="mx-auto max-w-2xl px-4 md:px-6">
          <p className="mb-3 text-center text-sm font-semibold uppercase tracking-widest text-blue-400">
            Безкоштовний аудит
          </p>
          <h2 className="mb-4 text-center text-3xl font-extrabold tracking-tight text-white md:text-4xl">
            Дізнайтесь, скільки грошей приховано у ваших дзвінках
          </h2>
          <p className="mx-auto mb-10 max-w-md text-center text-slate-400">
            Отримайте безкоштовний аудит перших 50 дзвінків та конкретні рекомендації для вашого закладу.
          </p>

          <LeadForm />

          {/* Or sign up */}
          {!isLoggedIn && (
            <p className="mt-8 text-center text-sm text-slate-500">
              Вже є акаунт?{" "}
              <Link href={`/${lang}/auth/signin`} className="font-semibold text-blue-400 hover:text-blue-300 transition-colors">
                Увійти
              </Link>
              {" · "}
              <Link href={`/${lang}/auth/register`} className="font-semibold text-blue-400 hover:text-blue-300 transition-colors">
                Зареєструватись
              </Link>
            </p>
          )}
        </div>
      </section>

      {/* ══ FOOTER ════════════════════════════════════════════════════════ */}
      <footer className="border-t border-white/10 py-8" style={{ background: DARK }}>
        <div className="mx-auto max-w-5xl px-4 md:px-6">
          <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:justify-between sm:text-left">
            <p className="text-sm text-slate-500">
              © {new Date().getFullYear()} AI Call Analytics. Всі права захищені.
            </p>
            <div className="flex gap-6 text-sm text-slate-500">
              <Link href={`/${lang}/auth/signin`}   className="transition-colors hover:text-white">Увійти</Link>
              <Link href={`/${lang}/auth/register`} className="transition-colors hover:text-white">Реєстрація</Link>
              <Link href={`/${lang}/api-docs`}      className="transition-colors hover:text-white">API</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
