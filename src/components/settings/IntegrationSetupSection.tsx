"use client";

import { useState } from "react";
import { Copy, Check, ChevronDown, Zap, ExternalLink, Phone, Eye, EyeOff, Save, Loader2 } from "lucide-react";
import type { ApiKeyRecord } from "@/components/settings/ApiKeySection";
import type ukDict from "@/dictionaries/uk.json";

type Dictionary = typeof ukDict;

/* ─────────────────────────────────────────────────────────────────────────────
   Types
───────────────────────────────────────────────────────────────────────────── */

type Integration = "binotel" | "keycrm" | "ringostat" | "kyivstar" | "voiptime" | "twilio" | "aircall";
type ReportType  = "high_level" | "medium" | "detailed";

interface IntegrationMeta {
  label:    string;
  endpoint: string;
  logoChar: string;
  docsUrl:  string;
}

const INTEGRATIONS: Record<Integration, IntegrationMeta> = {
  binotel:  { label: "Binotel",         endpoint: "binotel",  logoChar: "📞", docsUrl: "https://binotel.ua/uk/docs/api" },
  keycrm:   { label: "KeyCRM",          endpoint: "keycrm",   logoChar: "🔑", docsUrl: "https://help.keycrm.app/" },
  ringostat: { label: "Ringostat",      endpoint: "ringostat", logoChar: "📡", docsUrl: "https://ringostat.com/en/base/api-webhooks/" },
  kyivstar: { label: "Kyivstar Cloud PBX", endpoint: "kyivstar", logoChar: "🌐", docsUrl: "https://kyivstar.ua/business/cloud-pbx" },
  voiptime: { label: "VoIPTime Cloud",  endpoint: "voiptime", logoChar: "☁️", docsUrl: "https://voiptime.net/" },
  twilio:   { label: "Twilio",          endpoint: "twilio",   logoChar: "🔴", docsUrl: "https://www.twilio.com/docs/voice/api/call-resource" },
  aircall:  { label: "Aircall",         endpoint: "aircall",  logoChar: "✈️", docsUrl: "https://developer.aircall.io/api-references/#webhook-events" },
};

/* ─────────────────────────────────────────────────────────────────────────────
   Helpers
───────────────────────────────────────────────────────────────────────────── */

function useCopy(text: string, labels: { copy: string; copied: string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }
  return { copied, copy, label: copied ? labels.copied : labels.copy };
}

function CopyButton({ text, size = "sm", labels }: {
  text: string;
  size?: "sm" | "xs";
  labels: { copy: string; copied: string };
}) {
  const { copied, copy, label } = useCopy(text, labels);
  const base = size === "xs"
    ? "flex items-center gap-1 rounded px-2 py-1 text-[11px] font-medium border"
    : "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium border";
  return (
    <button
      onClick={copy}
      className={`${base} transition-colors ${
        copied
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
      }`}
    >
      {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
      {label}
    </button>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Main component
───────────────────────────────────────────────────────────────────────────── */

type Props = {
  apiKeys: ApiKeyRecord[];
  binotelKey: string | null;
  binotelSecret: string | null;
  t: Dictionary;
};

export function IntegrationSetupSection({ apiKeys, binotelKey: initialBinotelKey, binotelSecret: initialBinotelSecret, t }: Props) {
  const i = t.settings.integration;
  const d = t.apiDocs;

  const [keyValue,    setKeyValue]    = useState("");
  const [integration, setIntegration] = useState<Integration>("binotel");
  const [reportType,  setReportType]  = useState<ReportType>("medium");
  const [keyDropOpen, setKeyDropOpen] = useState(false);

  // Binotel credentials
  const [bKey,        setBKey]        = useState(initialBinotelKey ?? "");
  const [bSecret,     setBSecret]     = useState(initialBinotelSecret ?? "");
  const [showBSecret, setShowBSecret] = useState(false);
  const [credSaving,  setCredSaving]  = useState(false);
  const [credSaved,   setCredSaved]   = useState(false);
  const [credError,   setCredError]   = useState<string | null>(null);

  async function saveBinotelCredentials() {
    setCredSaving(true);
    setCredError(null);
    try {
      const res = await fetch("/api/user", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ binotelKey: bKey || null, binotelSecret: bSecret || null }),
      });
      if (!res.ok) throw new Error();
      setCredSaved(true);
      setTimeout(() => setCredSaved(false), 3000);
    } catch {
      setCredError(i.binotelCredsError);
    } finally {
      setCredSaving(false);
    }
  }

  const meta = INTEGRATIONS[integration];

  const origin =
    typeof window !== "undefined" ? window.location.origin : "https://your-domain.com";

  const webhookUrl = keyValue.startsWith("aca_")
    ? `${origin}/api/integrations/${meta.endpoint}?key=${keyValue}&reportType=${reportType}`
    : "";

  const isReady = !!webhookUrl;

  function applyKeyHint(prefix: string) {
    if (!keyValue.startsWith("aca_")) {
      setKeyValue(prefix + "…paste-full-key-here");
    }
    setKeyDropOpen(false);
  }

  // Build platform setup steps from the dictionary
  const platformKey = integration as string;
  const setupSteps: string[] = [];
  for (let n = 1; n <= 6; n++) {
    const key = `${platformKey}SetupStep${n}` as keyof typeof d;
    if (key in d && d[key]) setupSteps.push(d[key] as string);
    else break;
  }

  const step2Title = d[`${platformKey}Step2Title` as keyof typeof d] as string | undefined;
  const step2Desc  = d[`${platformKey}Step2Desc`  as keyof typeof d] as string | undefined;

  const reportTypeLabels: Record<ReportType, { label: string; desc: string }> = {
    high_level: { label: t.dashboard.reportTypes.high_level, desc: "Summary, score, sale status" },
    medium:     { label: t.dashboard.reportTypes.medium,     desc: "Above + issues, positives, next step" },
    detailed:   { label: t.dashboard.reportTypes.detailed,   desc: "Full analysis with transcript" },
  };

  const copyLabels = { copy: i.copyButton, copied: i.copiedButton };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">

      {/* Header */}
      <div className="border-b border-slate-100 bg-slate-50 px-6 py-4 flex items-center gap-3">
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-100 text-brand-600">
          <Zap size={16} />
        </span>
        <div>
          <h2 className="text-base font-bold text-slate-900">{i.sectionTitle}</h2>
          <p className="text-xs text-slate-500">{i.sectionSubtitle}</p>
        </div>
      </div>

      <div className="p-6 space-y-6">

        {/* ── Step 1: API Key ── */}
        <div>
          <div className="mb-1.5 flex items-center gap-2">
            <StepBadge n={1} />
            <label className="text-sm font-semibold text-slate-800">{i.step1Label}</label>
          </div>
          <p className="mb-3 text-xs text-slate-500 ml-7">
            {i.step1Hint.split("aca_…")[0]}
            <code className="rounded bg-slate-100 px-1 font-mono">aca_…</code>
            {i.step1Hint.split("aca_…")[1]}
          </p>

          <div className="ml-7 space-y-2">
            <div className="relative">
              <input
                type="text"
                value={keyValue}
                onChange={(e) => setKeyValue(e.target.value)}
                placeholder={i.step1Placeholder}
                spellCheck={false}
                className="w-full rounded-lg border border-slate-200 px-4 py-2.5 font-mono text-sm text-slate-900 placeholder-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
              />
            </div>

            {apiKeys.length > 0 && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setKeyDropOpen((v) => !v)}
                  className="flex items-center gap-1.5 text-xs font-medium text-brand-600 hover:text-brand-800"
                >
                  <ChevronDown size={12} className={`transition-transform ${keyDropOpen ? "rotate-180" : ""}`} />
                  {i.step1SeeKeys}
                </button>
                {keyDropOpen && (
                  <div className="absolute left-0 top-6 z-10 w-72 rounded-xl border border-slate-200 bg-white shadow-lg overflow-hidden">
                    <p className="border-b border-slate-100 bg-slate-50 px-3 py-2 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                      {i.step1YourKeys}
                    </p>
                    {apiKeys.map((k) => (
                      <button
                        key={k.id}
                        onClick={() => applyKeyHint(k.keyPrefix)}
                        className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left text-xs hover:bg-brand-50 transition-colors"
                      >
                        <span className="font-semibold text-slate-800 truncate">{k.name}</span>
                        <code className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 font-mono text-slate-600">
                          {k.keyPrefix}…
                        </code>
                      </button>
                    ))}
                    <p className="border-t border-slate-100 px-3 py-2 text-[10px] text-slate-400">
                      {i.step1KeyNote}
                    </p>
                  </div>
                )}
              </div>
            )}

            {keyValue && !keyValue.startsWith("aca_") && (
              <p className="text-xs text-red-500">
                {i.step1KeyError.split("aca_")[0]}
                <code className="font-mono">aca_</code>
              </p>
            )}
          </div>
        </div>

        {/* ── Step 2: Integration type ── */}
        <div>
          <div className="mb-1.5 flex items-center gap-2">
            <StepBadge n={2} />
            <label className="text-sm font-semibold text-slate-800">{i.step2Label}</label>
          </div>
          <div className="ml-7 flex flex-wrap gap-2">
            {(Object.entries(INTEGRATIONS) as [Integration, IntegrationMeta][]).map(([id, m]) => (
              <button
                key={id}
                onClick={() => setIntegration(id)}
                className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                  integration === id
                    ? "border-brand-500 bg-brand-50 text-brand-700"
                    : "border-slate-200 text-slate-600 hover:border-brand-300 hover:bg-slate-50"
                }`}
              >
                <span className="text-base leading-none">{m.logoChar}</span>
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Step 3: Report type ── */}
        <div>
          <div className="mb-1.5 flex items-center gap-2">
            <StepBadge n={3} />
            <label className="text-sm font-semibold text-slate-800">{i.step3Label}</label>
          </div>
          <div className="ml-7 flex flex-wrap gap-2">
            {(Object.keys(reportTypeLabels) as ReportType[]).map((rt) => (
              <button
                key={rt}
                onClick={() => setReportType(rt)}
                className={`rounded-lg border px-3 py-1.5 text-left transition-colors ${
                  reportType === rt
                    ? "border-brand-500 bg-brand-50"
                    : "border-slate-200 hover:border-brand-300 hover:bg-slate-50"
                }`}
              >
                <p className={`text-xs font-semibold ${reportType === rt ? "text-brand-700" : "text-slate-700"}`}>
                  {reportTypeLabels[rt].label}
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">{reportTypeLabels[rt].desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* ── Binotel API credentials ── */}
        {integration === "binotel" && (
          <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Phone size={14} className="text-[#1C78AE]" />
              <p className="text-sm font-semibold text-slate-800">{i.binotelCredsTitle}</p>
              <span className="rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                {i.binotelCredsRequired}
              </span>
            </div>
            <p className="text-xs text-slate-500">{i.binotelCredsDesc}</p>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">{i.binotelCredsKeyLabel}</label>
                <input
                  type="text"
                  value={bKey}
                  onChange={(e) => setBKey(e.target.value)}
                  placeholder={i.binotelCredsKeyPlaceholder}
                  spellCheck={false}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-xs text-slate-900 placeholder-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">{i.binotelCredsSecretLabel}</label>
                <div className="relative">
                  <input
                    type={showBSecret ? "text" : "password"}
                    value={bSecret}
                    onChange={(e) => setBSecret(e.target.value)}
                    placeholder={i.binotelCredsSecretPlaceholder}
                    spellCheck={false}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 pr-9 font-mono text-xs text-slate-900 placeholder-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
                  />
                  <button
                    type="button"
                    onClick={() => setShowBSecret((v) => !v)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showBSecret ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={saveBinotelCredentials}
                disabled={credSaving}
                className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-xs font-semibold text-white hover:bg-brand-700 transition-colors disabled:opacity-50"
              >
                {credSaving
                  ? <><Loader2 size={12} className="animate-spin" /> {i.binotelCredsSaving}</>
                  : credSaved
                  ? <><Check size={12} /> {i.binotelCredsSaved}</>
                  : <><Save size={12} /> {i.binotelCredsSave}</>
                }
              </button>
              {credError && <p className="text-xs text-red-500">{credError}</p>}
              {credSaved && <p className="text-xs text-emerald-600">{i.binotelCredsSavedMsg}</p>}
            </div>
          </div>
        )}

        {/* ── Generated webhook URL ── */}
        <div className={`rounded-xl border p-4 transition-colors ${isReady ? "border-brand-200 bg-brand-50" : "border-slate-200 bg-slate-50"}`}>
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{i.webhookUrlLabel}</p>
            {isReady && <CopyButton text={webhookUrl} labels={copyLabels} />}
          </div>

          {isReady ? (
            <code className="block break-all rounded-lg bg-white border border-brand-100 px-3 py-2.5 font-mono text-xs text-slate-800 leading-relaxed">
              {webhookUrl}
            </code>
          ) : (
            <p className="text-xs text-slate-400">{i.webhookUrlEmpty}</p>
          )}
        </div>

        {/* ── Platform setup guide ── */}
        {(step2Title || setupSteps.length > 0) && (
          <div>
            <div className="mb-3 flex items-center justify-between gap-2">
              <p className="text-sm font-bold text-slate-900">
                {meta.logoChar}&nbsp; {step2Title ?? `Setup ${meta.label}`}
              </p>
              <a
                href={meta.docsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-800"
              >
                {i.officialDocs} <ExternalLink size={11} />
              </a>
            </div>

            {step2Desc && <p className="mb-3 text-xs text-slate-500">{step2Desc}</p>}

            <ol className="space-y-3">
              {setupSteps.map((body, idx) => (
                <li key={idx} className="flex gap-3">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-100 text-[11px] font-bold text-brand-700">
                    {idx + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs leading-relaxed text-slate-600 whitespace-pre-line">{body}</p>
                    {isReady && body.toLowerCase().includes("paste") && (
                      <div className="mt-2 flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
                        <code className="min-w-0 flex-1 rounded bg-slate-100 px-2 py-1.5 font-mono text-[10px] text-slate-700 break-all">
                          {webhookUrl}
                        </code>
                        <CopyButton text={webhookUrl} size="xs" labels={copyLabels} />
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* ── Advanced: curl reference ── */}
        <details className="group rounded-xl border border-slate-200 overflow-hidden">
          <summary className="flex cursor-pointer items-center justify-between bg-slate-50 px-4 py-3 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors [&::-webkit-details-marker]:hidden list-none">
            <span>{i.advancedTitle}</span>
            <ChevronDown size={14} className="transition-transform group-open:rotate-180" />
          </summary>
          <div className="border-t border-slate-100 px-4 py-4 space-y-3">
            <p className="text-xs text-slate-500">{i.advancedDesc}</p>
            <pre className="overflow-x-auto rounded-xl bg-slate-900 p-4 text-xs text-slate-100 font-mono leading-relaxed whitespace-pre">
              <code>{isReady
? `POST ${origin}/api/integrations/${meta.endpoint}?key=${keyValue}&reportType=${reportType}
Content-Type: application/json

# (${meta.label} sends this payload automatically)`
: `POST ${origin}/api/integrations/${meta.endpoint}?key=aca_YOUR_KEY&reportType=medium`
              }</code>
            </pre>
            {isReady && (
              <CopyButton
                text={`curl -X POST "${webhookUrl}" \\\n  -H "Content-Type: application/json" \\\n  -d '{}'`}
                labels={copyLabels}
              />
            )}
          </div>
        </details>

      </div>
    </section>
  );
}

/* ── Small helpers ─────────────────────────────────────────────────────────── */

function StepBadge({ n }: { n: number }) {
  return (
    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-600 text-[11px] font-bold text-white">
      {n}
    </span>
  );
}
