"use client";

import { useState } from "react";
import { Copy, Check, ChevronDown, Zap, ExternalLink } from "lucide-react";
import type { ApiKeyRecord } from "@/components/settings/ApiKeySection";

/* ─────────────────────────────────────────────────────────────────────────────
   Types
───────────────────────────────────────────────────────────────────────────── */

type Integration = "binotel" | "keycrm" | "ringostat" | "kyivstar" | "voiptime" | "twilio" | "aircall";
type ReportType  = "high_level" | "medium" | "detailed";

/* ─────────────────────────────────────────────────────────────────────────────
   Integration metadata
───────────────────────────────────────────────────────────────────────────── */

interface IntegrationMeta {
  label:     string;
  endpoint:  string;
  logoChar:  string;   // simple emoji / text avatar
  docsUrl:   string;   // link to vendor docs
  steps:     Step[];   // platform-specific paste instructions
}

interface Step {
  title: string;
  body:  string;
}

const INTEGRATIONS: Record<Integration, IntegrationMeta> = {
  binotel: {
    label:    "Binotel",
    endpoint: "binotel",
    logoChar: "📞",
    docsUrl:  "https://binotel.ua/uk/docs/api",
    steps: [
      { title: "Open Binotel admin panel", body: 'Log in to my.binotel.ua → go to "Settings" → "Notifications & Webhooks".' },
      { title: "Add webhook URL", body: 'Click "Add webhook", choose event "Call completed" (Дзвінок завершено), paste the generated URL.' },
      { title: "Save and test", body: 'Hit "Save". Make a test call and check that a new entry appears in your AI Call Analytics dashboard.' },
    ],
  },
  keycrm: {
    label:    "KeyCRM",
    endpoint: "keycrm",
    logoChar: "🔑",
    docsUrl:  "https://help.keycrm.app/",
    steps: [
      { title: "Open KeyCRM integration settings", body: 'Go to KeyCRM → "Settings" → "Integrations" → "Webhooks".' },
      { title: "Create a new webhook", body: 'Click "+ Add webhook", select event "call.completed", paste the generated URL into the "URL" field.' },
      { title: "Configure filters (optional)", body: 'Optionally restrict to specific pipelines or users. Leave blank to process all calls.' },
      { title: "Save", body: 'Press "Save webhook". New answered calls will now be automatically analysed.' },
    ],
  },
  ringostat: {
    label:    "Ringostat",
    endpoint: "ringostat",
    logoChar: "📡",
    docsUrl:  "https://ringostat.com/en/base/api-webhooks/",
    steps: [
      { title: "Open Ringostat project settings", body: 'Log in → select your project → go to "Settings" → "Callback / Webhooks".' },
      { title: 'Paste URL into "After call" field', body: 'In the "After call" (Після дзвінка) row, paste the generated URL. Make sure it fires only for answered calls if that option is available.' },
      { title: "Save", body: 'Click "Save settings". Ringostat will POST call data as soon as each call ends.' },
    ],
  },
  kyivstar: {
    label:    "Kyivstar Cloud PBX",
    endpoint: "kyivstar",
    logoChar: "🌐",
    docsUrl:  "https://kyivstar.ua/business/cloud-pbx",
    steps: [
      { title: "Go to Kyivstar Business cabinet", body: 'Log in at cabinet.kyivstar.ua → select "Cloud PBX" → "Settings".' },
      { title: 'Open "Notifications" / webhook settings', body: 'Navigate to "Webhooks" or "Event notifications". Select event "call.finished".' },
      { title: "Paste the URL", body: 'Enter the generated URL as the callback endpoint. Set method to POST.' },
      { title: "Save and verify", body: 'Save, then make a test call. The recording should appear in your dashboard within a minute.' },
    ],
  },
  voiptime: {
    label:    "VoIPTime Cloud",
    endpoint: "voiptime",
    logoChar: "☁️",
    docsUrl:  "https://voiptime.net/",
    steps: [
      { title: "Open VoIPTime Cloud admin", body: 'Log in → go to "Settings" → "API & Integrations" → "Webhooks".' },
      { title: "Add a new webhook", body: 'Click "Add", choose trigger "call.ended". Paste the generated URL as the endpoint.' },
      { title: "Set Content-Type to JSON", body: 'Ensure "Content-Type" is set to "application/json" in the webhook settings.' },
      { title: "Activate and test", body: 'Enable the webhook and complete a test call to verify data arrives correctly.' },
    ],
  },
  twilio: {
    label:    "Twilio",
    endpoint: "twilio",
    logoChar: "🔴",
    docsUrl:  "https://www.twilio.com/docs/voice/api/call-resource#create-a-call-resource",
    steps: [
      { title: "Set StatusCallback on outgoing calls", body: 'In your Twilio call-initiating code, add the parameter:\nStatusCallback: <YOUR_WEBHOOK_URL>\nStatusCallbackMethod: POST' },
      { title: "Or configure in Twilio Console", body: 'Go to Phone Numbers → Active Numbers → select number → "Voice & Fax" tab → set "Call Status Changes" webhook URL.' },
      { title: "Ensure recordings are enabled", body: 'Add record: "record-from-answer" to your call parameters so Twilio includes RecordingUrl in the status callback.' },
      { title: "Test with a real call", body: 'Place a call. Once it ends, Twilio POSTs form data with CallStatus=completed and RecordingUrl to your endpoint.' },
    ],
  },
  aircall: {
    label:    "Aircall",
    endpoint: "aircall",
    logoChar: "✈️",
    docsUrl:  "https://developer.aircall.io/api-references/#webhook-events",
    steps: [
      { title: "Open Aircall Dashboard", body: 'Log in at dashboard.aircall.io → go to "Integrations" → "Webhooks".' },
      { title: "Create a new webhook", body: 'Click "Add a webhook". Paste the generated URL in the "URL" field. Select event "call.ended".' },
      { title: "Enable call recordings", body: 'Make sure call recording is turned on in your Aircall number settings so the recording URL is included.' },
      { title: "Save and test", body: 'Hit "Save". Complete a test call and confirm the entry appears in your AI Call Analytics dashboard.' },
    ],
  },
};

const REPORT_TYPES: { value: ReportType; label: string; desc: string }[] = [
  { value: "high_level", label: "High-level",  desc: "Summary, score, sale status"          },
  { value: "medium",     label: "Medium",       desc: "Above + issues, positives, next step" },
  { value: "detailed",   label: "Detailed",     desc: "Full analysis with transcript"        },
];

/* ─────────────────────────────────────────────────────────────────────────────
   Helpers
───────────────────────────────────────────────────────────────────────────── */

function useCopy(text: string) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }
  return { copied, copy };
}

function CopyButton({ text, size = "sm" }: { text: string; size?: "sm" | "xs" }) {
  const { copied, copy } = useCopy(text);
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
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Main component
───────────────────────────────────────────────────────────────────────────── */

type Props = {
  apiKeys: ApiKeyRecord[];
};

export function IntegrationSetupSection({ apiKeys }: Props) {
  const [keyValue,     setKeyValue]     = useState("");
  const [integration,  setIntegration]  = useState<Integration>("binotel");
  const [reportType,   setReportType]   = useState<ReportType>("medium");
  const [keyDropOpen,  setKeyDropOpen]  = useState(false);
  const [intDropOpen,  setIntDropOpen]  = useState(false);

  const meta = INTEGRATIONS[integration];

  const origin =
    typeof window !== "undefined" ? window.location.origin : "https://your-domain.com";

  const webhookUrl = keyValue.startsWith("aca_")
    ? `${origin}/api/integrations/${meta.endpoint}?key=${keyValue}&reportType=${reportType}`
    : "";

  const isReady = !!webhookUrl;

  /* ── Paste API key from the dropdown hint ── */
  function applyKeyHint(prefix: string) {
    if (!keyValue.startsWith("aca_")) {
      setKeyValue(prefix + "…paste-full-key-here");
    }
    setKeyDropOpen(false);
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">

      {/* Header */}
      <div className="border-b border-slate-100 bg-slate-50 px-6 py-4 flex items-center gap-3">
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-100 text-brand-600">
          <Zap size={16} />
        </span>
        <div>
          <h2 className="text-base font-bold text-slate-900">Integration Setup</h2>
          <p className="text-xs text-slate-500">Generate a ready-to-paste webhook URL for your telephony platform</p>
        </div>
      </div>

      <div className="p-6 space-y-6">

        {/* ── Step 1: API Key ── */}
        <div>
          <div className="mb-1.5 flex items-center gap-2">
            <StepBadge n={1} />
            <label className="text-sm font-semibold text-slate-800">API Key</label>
          </div>
          <p className="mb-3 text-xs text-slate-500 ml-7">
            Paste the full API key value (<code className="rounded bg-slate-100 px-1 font-mono">aca_…</code>).
            You received it when the key was created.
          </p>

          <div className="ml-7 space-y-2">
            {/* Key value input */}
            <div className="relative">
              <input
                type="text"
                value={keyValue}
                onChange={(e) => setKeyValue(e.target.value)}
                placeholder="aca_••••••••••••••••••••••••••••••••"
                spellCheck={false}
                className="w-full rounded-lg border border-slate-200 px-4 py-2.5 font-mono text-sm text-slate-900 placeholder-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
              />
            </div>

            {/* Key hint dropdown (shows key names + prefixes) */}
            {apiKeys.length > 0 && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setKeyDropOpen((v) => !v)}
                  className="flex items-center gap-1.5 text-xs font-medium text-brand-600 hover:text-brand-800"
                >
                  <ChevronDown size={12} className={`transition-transform ${keyDropOpen ? "rotate-180" : ""}`} />
                  Not sure which key? See your saved keys
                </button>
                {keyDropOpen && (
                  <div className="absolute left-0 top-6 z-10 w-72 rounded-xl border border-slate-200 bg-white shadow-lg overflow-hidden">
                    <p className="border-b border-slate-100 bg-slate-50 px-3 py-2 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                      Your API Keys
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
                      The full key was shown only once at creation time.
                    </p>
                  </div>
                )}
              </div>
            )}

            {keyValue && !keyValue.startsWith("aca_") && (
              <p className="text-xs text-red-500">Key must start with <code className="font-mono">aca_</code></p>
            )}
          </div>
        </div>

        {/* ── Step 2: Integration type ── */}
        <div>
          <div className="mb-1.5 flex items-center gap-2">
            <StepBadge n={2} />
            <label className="text-sm font-semibold text-slate-800">Telephony Platform</label>
          </div>

          {/* Mobile: select; Desktop: pill row */}
          <div className="ml-7">
            {/* Pill row (wraps on mobile) */}
            <div className="flex flex-wrap gap-2">
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
        </div>

        {/* ── Step 3: Report type ── */}
        <div>
          <div className="mb-1.5 flex items-center gap-2">
            <StepBadge n={3} />
            <label className="text-sm font-semibold text-slate-800">Report depth</label>
          </div>
          <div className="ml-7 flex flex-wrap gap-2">
            {REPORT_TYPES.map((rt) => (
              <button
                key={rt.value}
                onClick={() => setReportType(rt.value)}
                className={`rounded-lg border px-3 py-1.5 text-left transition-colors ${
                  reportType === rt.value
                    ? "border-brand-500 bg-brand-50"
                    : "border-slate-200 hover:border-brand-300 hover:bg-slate-50"
                }`}
              >
                <p className={`text-xs font-semibold ${reportType === rt.value ? "text-brand-700" : "text-slate-700"}`}>
                  {rt.label}
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">{rt.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* ── Generated webhook URL ── */}
        <div className={`rounded-xl border p-4 transition-colors ${isReady ? "border-brand-200 bg-brand-50" : "border-slate-200 bg-slate-50"}`}>
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Webhook URL</p>
            {isReady && <CopyButton text={webhookUrl} />}
          </div>

          {isReady ? (
            <code className="block break-all rounded-lg bg-white border border-brand-100 px-3 py-2.5 font-mono text-xs text-slate-800 leading-relaxed">
              {webhookUrl}
            </code>
          ) : (
            <p className="text-xs text-slate-400">
              Enter a valid API key above to generate the webhook URL.
            </p>
          )}
        </div>

        {/* ── Platform setup guide ── */}
        <div>
          <div className="mb-3 flex items-center justify-between gap-2">
            <p className="text-sm font-bold text-slate-900">
              {meta.logoChar}&nbsp; How to set up {meta.label}
            </p>
            <a
              href={meta.docsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-800"
            >
              Official docs <ExternalLink size={11} />
            </a>
          </div>

          <ol className="space-y-3">
            {meta.steps.map((step, i) => (
              <li key={i} className="flex gap-3">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-100 text-[11px] font-bold text-brand-700">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-800">{step.title}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-slate-500 whitespace-pre-line">{step.body}</p>
                  {/* If this step mentions pasting the URL and the URL is ready, inline the URL + copy */}
                  {isReady && step.body.toLowerCase().includes("paste") && (
                    <div className="mt-2 flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
                      <code className="min-w-0 flex-1 rounded bg-slate-100 px-2 py-1.5 font-mono text-[10px] text-slate-700 break-all">
                        {webhookUrl}
                      </code>
                      <CopyButton text={webhookUrl} size="xs" />
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </div>

        {/* ── Quick reference: integration endpoint ── */}
        <details className="group rounded-xl border border-slate-200 overflow-hidden">
          <summary className="flex cursor-pointer items-center justify-between bg-slate-50 px-4 py-3 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors [&::-webkit-details-marker]:hidden list-none">
            <span>Advanced: endpoint &amp; curl reference</span>
            <ChevronDown size={14} className="transition-transform group-open:rotate-180" />
          </summary>
          <div className="border-t border-slate-100 px-4 py-4 space-y-3">
            <p className="text-xs text-slate-500">
              Webhook endpoint — your telephony platform POSTs to this URL automatically.
              You can also test it manually with curl:
            </p>
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
