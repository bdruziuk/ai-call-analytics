import Link from "next/link";
import { ProfileAvatar } from "@/components/ProfileAvatar";
import { db } from "@/lib/db";
import { CallProcessing } from "@/components/calls/CallProcessing";
import { getDictionary, hasLocale } from "@/lib/dictionaries";
import { notFound } from "next/navigation";

type Props = {
  params: Promise<{
    lang: string;
    id: string;
  }>;
};

function InfoCard({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p>
      <div className="text-base font-semibold text-slate-900">{children}</div>
    </div>
  );
}

function Section({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl border border-slate-200 bg-white p-6 shadow-sm ${className}`}>
      <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-900">
        <span className="h-1 w-4 rounded-full bg-brand-500 inline-block" />
        {title}
      </h2>
      {children}
    </section>
  );
}

export default async function CallDetailsPage({ params }: Props) {
  const { lang, id } = await params;
  if (!hasLocale(lang)) notFound();

  const t = await getDictionary(lang);

  const call = await db.call.findUnique({ where: { id } });
  if (!call) notFound();

  const salesProfile = call.salesProfileId
    ? await db.salesProfile.findUnique({
        where: { id: call.salesProfileId },
        select: { id: true, name: true, description: true, photo: true },
      })
    : null;

  const issues          = Array.isArray(call.issues)          ? call.issues          : [];
  const positives       = Array.isArray(call.positives)       ? call.positives       : [];
  const recommendations = Array.isArray(call.recommendations) ? call.recommendations : [];
  const objections      = Array.isArray(call.objections)      ? call.objections      : [];
  const managerMistakes = Array.isArray(call.managerMistakes) ? call.managerMistakes : [];
  const detailedReport  =
    call.detailedReport &&
    typeof call.detailedReport === "object" &&
    !Array.isArray(call.detailedReport)
      ? call.detailedReport
      : null;

  type IndustryData = {
    insights?: string[];
    warnings?: string[];
    missedOpportunities?: string[];
    kpis?: Record<string, string | boolean | number>;
  };
  const industryData: IndustryData | null =
    call.industryData &&
    typeof call.industryData === "object" &&
    !Array.isArray(call.industryData)
      ? call.industryData as IndustryData
      : null;

  function getStatusLabel(status: string): string {
    const map = t.dashboard.processingStatus;
    switch (status) {
      case "queued":      return map.queued;
      case "transcribing":return map.transcribing;
      case "analyzing":   return map.analyzing;
      case "completed":   return map.completed;
      case "failed":      return map.failed;
      default:            return status;
    }
  }

  function getReportTypeLabel(reportType: string): string {
    const map = t.dashboard.reportTypes;
    switch (reportType) {
      case "high_level": return map.high_level;
      case "medium":     return map.medium;
      case "detailed":   return map.detailed;
      default:           return reportType;
    }
  }

  function getLanguageLabel(lang: string | null): string {
    if (!lang) return "-";
    switch (lang) {
      case "uk":    return t.callLanguage.uk;
      case "ru":    return t.callLanguage.ru;
      case "en":    return t.callLanguage.en;
      case "uk_ru": return t.callLanguage.uk_ru;
      default:      return lang;
    }
  }

  function formatError(msg: string | null): string | null {
    if (!msg) return null;
    if (msg.startsWith("LANG_UNSUPPORTED:")) {
      const lang = msg.slice("LANG_UNSUPPORTED:".length);
      return t.errors.unsupportedLanguage.replace("{language}", lang);
    }
    return msg;
  }

  function getSaleStatusLabel(status?: string | null) {
    switch (status) {
      case "sold":           return t.callDetail.saleStatus.sold;
      case "not_sold":       return t.callDetail.saleStatus.not_sold;
      case "potential_sale": return t.callDetail.saleStatus.potential_sale;
      default:               return "-";
    }
  }

  const statusColors: Record<string, string> = {
    queued:      "bg-slate-100 text-slate-600",
    transcribing:"bg-brand-100 text-brand-700",
    analyzing:   "bg-brand-100 text-brand-700",
    completed:   "bg-emerald-100 text-emerald-700",
    failed:      "bg-red-100 text-red-700",
  };

  return (
    <main className="mx-auto max-w-6xl p-8">
      {/* Page header */}
      <div className="mb-8">
        <Link
          href={`/${lang}/dashboard`}
          className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:text-brand-800 transition-colors"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          {t.callDetail.backToDashboard}
        </Link>
        <h1 className="text-3xl font-bold text-slate-900">{t.callDetail.title}</h1>
        <p className="mt-1 text-sm text-slate-500">{call.fileName}</p>
      </div>

      <CallProcessing callId={call.id} initialStatus={call.status} t={t} />

      {/* Info cards */}
      <div className="mb-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <InfoCard label={t.callDetail.status}>
          <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[call.status] ?? "bg-slate-100 text-slate-600"}`}>
            {getStatusLabel(call.status)}
          </span>
        </InfoCard>

        <InfoCard label={t.callDetail.reportType}>
          {getReportTypeLabel(call.reportType)}
        </InfoCard>

        <InfoCard label={t.callLanguage.label}>
          {getLanguageLabel(call.language)}
        </InfoCard>

        <InfoCard label={t.profiles.manager}>
          {salesProfile ? (
            <div className="flex items-center gap-2.5">
              <ProfileAvatar photo={salesProfile.photo} name={salesProfile.name} className="h-9 w-9 border-2 border-brand-100" />
              <div>
                <p className="font-semibold text-slate-900 text-sm">{salesProfile.name}</p>
                {salesProfile.description && (
                  <p className="text-xs text-slate-500">{salesProfile.description}</p>
                )}
              </div>
            </div>
          ) : (
            <span className="text-slate-400 font-normal text-sm">-</span>
          )}
        </InfoCard>

        {/* Score */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-slate-400">{t.callDetail.score}</p>
          <p className="text-4xl font-bold text-brand-600">
            {call.score ?? "-"}
            <span className="text-lg font-medium text-slate-400">/10</span>
          </p>
        </div>

        <InfoCard label={t.callDetail.saleStatusLabel}>
          <span>{getSaleStatusLabel(call.saleStatus)}</span>
        </InfoCard>

        <InfoCard label={t.callDetail.product}>
          {call.product || "-"}
        </InfoCard>
      </div>

      {/* Error */}
      {call.errorMessage && (
        <div className="mb-8 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-5">
          <svg className="h-5 w-5 shrink-0 text-red-500 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div>
            <p className="font-semibold text-red-800">{t.callDetail.processingError}</p>
            <p className="mt-0.5 text-sm text-red-700">{formatError(call.errorMessage)}</p>
          </div>
        </div>
      )}

      {/* Summary + Intent */}
      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <Section title={t.callDetail.sections.summary}>
          <p className="leading-7 text-slate-600">{call.summary || "-"}</p>
        </Section>

        <Section title={t.callDetail.sections.customerIntent}>
          <p className="mb-5 leading-7 text-slate-600">{call.customerIntent || "-"}</p>
          <h3 className="mb-2 text-sm font-semibold text-slate-900">{t.callDetail.sections.nextStep}</h3>
          <p className="leading-7 text-slate-600">{call.nextStep || "-"}</p>
        </Section>
      </div>

      {/* Issues / Positives / Recommendations */}
      <div className="mb-6 grid gap-6 lg:grid-cols-3">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-slate-900">
            <span className="h-1 w-4 rounded-full bg-red-400 inline-block" />
            {t.callDetail.sections.issues}
          </h2>
          {issues.length > 0 ? (
            <ul className="space-y-2">
              {issues.map((item: unknown, i: number) => (
                <li key={i} className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800 border border-red-100">
                  {String(item)}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-400">{t.callDetail.empty.noIssues}</p>
          )}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-slate-900">
            <span className="h-1 w-4 rounded-full bg-emerald-400 inline-block" />
            {t.callDetail.sections.positives}
          </h2>
          {positives.length > 0 ? (
            <ul className="space-y-2">
              {positives.map((item: unknown, i: number) => (
                <li key={i} className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800 border border-emerald-100">
                  {String(item)}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-400">{t.callDetail.empty.noData}</p>
          )}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-slate-900">
            <span className="h-1 w-4 rounded-full bg-brand-400 inline-block" />
            {t.callDetail.sections.recommendations}
          </h2>
          {recommendations.length > 0 ? (
            <ul className="space-y-2">
              {recommendations.map((item: unknown, i: number) => (
                <li key={i} className="rounded-xl bg-brand-50 px-4 py-3 text-sm text-brand-800 border border-brand-100">
                  {String(item)}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-400">{t.callDetail.empty.noRecommendations}</p>
          )}
        </section>
      </div>

      {/* Objections + Mistakes */}
      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-slate-900">
            <span className="h-1 w-4 rounded-full bg-amber-400 inline-block" />
            {t.callDetail.sections.objections}
          </h2>
          {objections.length > 0 ? (
            <ul className="space-y-2">
              {objections.map((item: unknown, i: number) => (
                <li key={i} className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900 border border-amber-100">
                  {String(item)}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-400">{t.callDetail.empty.noObjections}</p>
          )}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-slate-900">
            <span className="h-1 w-4 rounded-full bg-red-400 inline-block" />
            {t.callDetail.sections.managerMistakes}
          </h2>
          {managerMistakes.length > 0 ? (
            <ul className="space-y-2">
              {managerMistakes.map((item: unknown, i: number) => (
                <li key={i} className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800 border border-red-100">
                  {String(item)}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-400">{t.callDetail.empty.noMistakes}</p>
          )}
        </section>
      </div>

      {/* Detailed report */}
      {detailedReport && (
        <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-900">
            <span className="h-1 w-4 rounded-full bg-brand-500 inline-block" />
            {t.callDetail.sections.detailedReport}
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            {Object.entries(detailedReport).map(([key, value]) => (
              <div key={key} className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                <h3 className="mb-1.5 text-sm font-semibold text-slate-700">{key}</h3>
                <p className="text-sm leading-6 text-slate-600">{String(value || "-")}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Industry-specific insights */}
      {industryData && (
        <section className="mb-6 rounded-2xl border border-brand-100 bg-brand-50/40 p-6 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-900">
            <span className="h-1 w-4 rounded-full bg-brand-500 inline-block" />
            {t.callDetail.sections.industryInsights}
          </h2>

          <div className="space-y-5">
            {/* KPIs grid */}
            {industryData.kpis && Object.keys(industryData.kpis).length > 0 && (
              <div>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{t.callDetail.industry.kpi}</h3>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {Object.entries(industryData.kpis).map(([key, val]) => {
                    const isBool = typeof val === "boolean" || val === "true" || val === "false";
                    const isTrue = val === true || val === "true";
                    return (
                      <div key={key} className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm ${
                        isBool
                          ? isTrue
                            ? "border-emerald-200 bg-emerald-50"
                            : "border-red-200 bg-red-50"
                          : "border-slate-200 bg-white"
                      }`}>
                        {isBool && (
                          <span className={`text-base ${isTrue ? "text-emerald-500" : "text-red-400"}`}>
                            {isTrue ? "✓" : "✗"}
                          </span>
                        )}
                        <span className="font-medium text-slate-700">
                          {(t.callDetail.industry.kpiKeys as Record<string, string>)[key] ?? key}
                        </span>
                        {!isBool && (
                          <span className="ml-auto text-slate-500">{String(val)}</span>
                        )}
                        {isBool && (
                          <span className={`ml-auto text-xs font-semibold ${isTrue ? "text-emerald-600" : "text-red-500"}`}>
                            {isTrue ? t.callDetail.industry.boolTrue : t.callDetail.industry.boolFalse}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Warnings */}
            {(industryData.warnings?.length ?? 0) > 0 && (
              <div>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-amber-600">{t.callDetail.industry.warnings}</h3>
                <ul className="space-y-1.5">
                  {industryData.warnings!.map((w, i) => (
                    <li key={i} className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-2.5 text-sm text-amber-900">
                      ⚠ {w}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Missed opportunities */}
            {(industryData.missedOpportunities?.length ?? 0) > 0 && (
              <div>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-red-500">{t.callDetail.industry.missedOpportunities}</h3>
                <ul className="space-y-1.5">
                  {industryData.missedOpportunities!.map((m, i) => (
                    <li key={i} className="rounded-xl border border-red-100 bg-red-50 px-4 py-2.5 text-sm text-red-800">
                      ✗ {m}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Insights */}
            {(industryData.insights?.length ?? 0) > 0 && (
              <div>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-brand-600">{t.callDetail.industry.insights}</h3>
                <ul className="space-y-1.5">
                  {industryData.insights!.map((ins, i) => (
                    <li key={i} className="rounded-xl border border-brand-100 bg-brand-50 px-4 py-2.5 text-sm text-brand-800">
                      {ins}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Transcript */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-900">
          <span className="h-1 w-4 rounded-full bg-slate-400 inline-block" />
          {t.callDetail.sections.transcript}
        </h2>
        <div className="rounded-xl border border-slate-100 bg-slate-50 p-5">
          <pre className="whitespace-pre-wrap text-sm leading-7 text-slate-600">
            {call.transcript || t.callDetail.empty.noTranscript}
          </pre>
        </div>
      </section>
    </main>
  );
}
