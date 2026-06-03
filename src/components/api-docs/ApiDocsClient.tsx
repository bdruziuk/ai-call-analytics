"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import {
  Copy,
  Check,
  Upload,
  Play,
  RefreshCw,
  ChevronRight,
  Eye,
  EyeOff,
} from "lucide-react";
import type ukDict from "@/dictionaries/uk.json";

type Dictionary   = typeof ukDict;
type ApiDocs      = Dictionary["apiDocs"];
type Props        = { t: Dictionary; lang: string };
type Tab          = "api" | "integrations";
type Integration  = "binotel" | "keycrm" | "ringostat" | "kyivstar" | "voiptime" | "twilio" | "aircall";

const INTEGRATIONS: { id: Integration; label: string }[] = [
  { id: "binotel",  label: "Binotel"          },
  { id: "keycrm",   label: "KeyCRM"            },
  { id: "ringostat",label: "Ringostat"         },
  { id: "kyivstar", label: "Kyivstar Cloud PBX"},
  { id: "voiptime", label: "VoIPTime Cloud"    },
  { id: "twilio",   label: "Twilio"            },
  { id: "aircall",  label: "Aircall"           },
];

/* ── Payload examples ──────────────────────────────────────────────────────── */

const PAYLOAD: Record<Integration, string> = {
  binotel: `{
  "call_id":         "7023456789",
  "external_number": "+380441234567",
  "internal_number": "101",
  "disposition":     "ANSWERED",
  "duration":        312,
  "type":            "incoming",
  "file":            "https://recordings.binotel.com/abc123/call.mp3"
}`,
  keycrm: `{
  "event": "call.completed",
  "data": {
    "id":            "12345",
    "status":        "answered",
    "duration":      185,
    "recording_url": "https://cdn.keycrm.app/recordings/call_12345.mp3",
    "caller_number": "+380501234567",
    "called_number": "+380671234567"
  }
}`,
  ringostat: `{
  "callStatus":  "answered",
  "recordFile":  "https://recordings.ringostat.com/call_789.mp3",
  "callerNum":   "+380501234567",
  "calleeNum":   "+380671234567",
  "duration":    240,
  "callType":    "inbound"
}`,
  kyivstar: `{
  "event":         "call.finished",
  "call_id":       "kyiv_98765",
  "caller":        "+380631234567",
  "callee":        "+380441234567",
  "status":        "answered",
  "duration":      195,
  "recording_url": "https://pbx.kyivstar.ua/records/98765.mp3"
}`,
  voiptime: `{
  "event": "call.ended",
  "call": {
    "id":         "vt_11223",
    "status":     "answered",
    "duration":   310,
    "record_url": "https://cloud.voiptime.net/records/11223.mp3",
    "caller":     "+380501234567",
    "callee":     "+380671234567"
  }
}`,
  twilio: `// application/x-www-form-urlencoded
CallStatus=completed
RecordingUrl=https%3A%2F%2Fapi.twilio.com%2F...%2FRecordings%2FRE...
From=%2B380501234567
To=%2B380671234567
Duration=245
CallSid=CA...`,
  aircall: `{
  "event": "call.ended",
  "data": {
    "id":         5566778,
    "status":     "done",
    "duration":   220,
    "recording":  "https://public-cdn.aircall.io/calls/5566778/recording.mp3",
    "direction":  "inbound",
    "started_at": 1715000000
  }
}`,
};

/* ── Shared display helpers ─────────────────────────────────────────────── */

function CodeBlock({ code, lang = "bash" }: { code: string; lang?: string }) {
  void lang;
  return (
    <pre className="overflow-x-auto rounded-xl bg-slate-900 p-4 text-sm text-slate-100 font-mono leading-relaxed">
      <code>{code}</code>
    </pre>
  );
}

function EndpointRow({
  method,
  path,
  description,
  params,
  d,
}: {
  method: "GET" | "POST";
  path: string;
  description: string;
  params?: { name: string; type: string; desc: string }[];
  d: ApiDocs;
}) {
  const methodCls =
    method === "POST"
      ? "bg-blue-100 text-blue-700"
      : "bg-emerald-100 text-emerald-700";
  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-3 border-b border-slate-100 bg-slate-50">
        <span className={`rounded-md px-2 py-0.5 text-xs font-bold ${methodCls}`}>
          {method}
        </span>
        <code className="text-sm font-mono font-semibold text-slate-800">
          {path}
        </code>
      </div>
      <div className="px-5 py-4 space-y-3">
        <p className="text-sm text-slate-600">{description}</p>
        {params && params.length > 0 && (
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="text-left text-slate-400">
                <th className="pb-1.5 pr-4 font-medium">{d.paramHeader}</th>
                <th className="pb-1.5 pr-4 font-medium">{d.typeHeader}</th>
                <th className="pb-1.5 font-medium">{d.descHeader}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {params.map((p) => (
                <tr key={p.name}>
                  <td className="py-1.5 pr-4 font-mono text-brand-700">{p.name}</td>
                  <td className="py-1.5 pr-4 text-slate-500">{p.type}</td>
                  <td className="py-1.5 text-slate-600">{p.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

/* ── Inline API Tester ───────────────────────────────────────────────────── */

type Endpoint = {
  method: "GET" | "POST";
  label: string;
  url: string;
  needsId?: boolean;
  needsFile?: boolean;
};

const ENDPOINTS: Endpoint[] = [
  { method: "GET",  label: "GET  /api/v1/me",             url: "/api/v1/me" },
  { method: "GET",  label: "GET  /api/v1/calls",           url: "/api/v1/calls" },
  { method: "GET",  label: "GET  /api/v1/calls/:id",       url: "/api/v1/calls/", needsId: true },
  { method: "POST", label: "POST /api/v1/calls  (upload)", url: "/api/v1/calls",  needsFile: true },
];

const REPORT_TYPES = ["high_level", "medium", "detailed"] as const;
type ReportType = (typeof REPORT_TYPES)[number];

function ApiTester({ t }: { t: Dictionary }) {
  const d = t.apiDocs;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [apiKey,       setApiKey]       = useState("");
  const [showKey,      setShowKey]      = useState(false);
  const [epIdx,        setEpIdx]        = useState(0);
  const [callId,       setCallId]       = useState("");
  const [file,         setFile]         = useState<File | null>(null);
  const [reportType,   setReportType]   = useState<ReportType>("medium");
  const [response,     setResponse]     = useState<{ status: number; body: unknown } | null>(null);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState<string | null>(null);
  const [lastUploadId, setLastUploadId] = useState<string | null>(null);

  const ep = ENDPOINTS[epIdx];

  async function runTest() {
    if (!apiKey.trim()) { setError(d.errorNoKey); return; }
    setLoading(true); setError(null); setResponse(null); setLastUploadId(null);

    try {
      if (ep.needsFile) {
        if (!file) { setError(d.errorNoFile); setLoading(false); return; }
        const form = new FormData();
        form.append("file", file);
        form.append("reportType", reportType);
        const res = await fetch(ep.url, {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey.trim()}` },
          body: form,
        });
        const body = await res.json().catch(() => null);
        setResponse({ status: res.status, body });
        if (res.status === 202 && typeof (body as Record<string, unknown>)?.id === "string") {
          setLastUploadId((body as Record<string, string>).id);
        }
      } else {
        const url = ep.needsId ? `${ep.url}${callId.trim()}` : ep.url;
        const res = await fetch(url, { headers: { Authorization: `Bearer ${apiKey.trim()}` } });
        const body = await res.json().catch(() => null);
        setResponse({ status: res.status, body });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : d.networkError);
    } finally {
      setLoading(false);
    }
  }

  function switchToPolling() {
    if (!lastUploadId) return;
    setEpIdx(2); setCallId(lastUploadId); setResponse(null); setLastUploadId(null);
  }

  async function pollStatus() {
    if (!lastUploadId || !apiKey.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/calls/${lastUploadId}`, {
        headers: { Authorization: `Bearer ${apiKey.trim()}` },
      });
      const body = await res.json().catch(() => null);
      setResponse({ status: res.status, body });
      const s = (body as Record<string, unknown>)?.status;
      if (s === "completed" || s === "failed") setLastUploadId(null);
    } finally {
      setLoading(false);
    }
  }

  const statusColor = !response
    ? ""
    : response.status < 300 ? "text-emerald-400"
    : response.status < 500 ? "text-amber-400"
    : "text-red-400";

  const methodColor: Record<string, string> = {
    GET:  "bg-emerald-100 text-emerald-700",
    POST: "bg-blue-100 text-blue-700",
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="border-b border-slate-100 bg-slate-50 px-6 py-4">
        <h2 className="text-base font-semibold text-slate-900">{d.testTitle}</h2>
        <p className="mt-0.5 text-sm text-slate-500">{d.testSubtitle}</p>
      </div>

      <div className="p-6 space-y-5">
        {/* API key */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">{d.testApiKey}</label>
          <div className="relative">
            <input
              type={showKey ? "text" : "password"}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="aca_••••••••••••••••••••••••••••••••"
              className="w-full rounded-lg border border-slate-200 px-4 py-2.5 pr-10 text-sm font-mono text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
            />
            <button
              type="button"
              onClick={() => setShowKey((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Endpoint selector */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">{d.testEndpoint}</label>
          <div className="flex flex-wrap gap-2">
            {ENDPOINTS.map((e, i) => (
              <button
                key={i}
                onClick={() => { setEpIdx(i); setResponse(null); setLastUploadId(null); }}
                className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-mono font-medium transition-colors ${
                  epIdx === i
                    ? "border-brand-500 bg-brand-50 text-brand-700"
                    : "border-slate-200 text-slate-600 hover:border-brand-300"
                }`}
              >
                <span className={`rounded px-1 py-px text-[10px] font-bold ${methodColor[e.method]}`}>
                  {e.method}
                </span>
                {e.label.replace(/^(GET|POST)\s+/, "")}
              </button>
            ))}
          </div>
        </div>

        {/* Call ID field */}
        {ep.needsId && (
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">{d.testCallId}</label>
            <input
              type="text"
              value={callId}
              onChange={(e) => setCallId(e.target.value)}
              placeholder="cmpranw3g00049gvmy1r4tgfv"
              className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-mono text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
            />
          </div>
        )}

        {/* File upload */}
        {ep.needsFile && (
          <div className="space-y-3">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                {d.audioFileLabel}
              </label>
              <div
                onClick={() => fileInputRef.current?.click()}
                className="flex cursor-pointer items-center gap-3 rounded-xl border-2 border-dashed border-slate-200 px-4 py-4 hover:border-brand-300 hover:bg-brand-50/40 transition-colors"
              >
                <Upload className="h-5 w-5 shrink-0 text-slate-400" />
                <div className="min-w-0">
                  {file ? (
                    <>
                      <p className="truncate text-sm font-medium text-slate-800">{file.name}</p>
                      <p className="text-xs text-slate-400">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </>
                  ) : (
                    <p className="text-sm text-slate-400">{d.audioFilePlaceholder}</p>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".mp3,.wav,.m4a,.ogg,.flac,.aac,audio/*"
                  className="hidden"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                {d.reportTypeLabel}
              </label>
              <div className="flex gap-2">
                {REPORT_TYPES.map((rt) => (
                  <button
                    key={rt}
                    onClick={() => setReportType(rt)}
                    className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                      reportType === rt
                        ? "border-brand-500 bg-brand-50 text-brand-700"
                        : "border-slate-200 text-slate-600 hover:border-brand-300"
                    }`}
                  >
                    {rt}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {error && (
          <p className="rounded-lg border border-red-100 bg-red-50 px-4 py-2 text-sm text-red-600">
            {error}
          </p>
        )}

        {/* Run button */}
        <button
          onClick={runTest}
          disabled={loading}
          className="flex items-center gap-2 rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50 transition-colors"
        >
          {ep.needsFile ? <Upload className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          {loading ? d.testRunning : ep.needsFile ? d.uploadAndAnalyze : d.testRun}
        </button>

        {/* After upload: poll helpers */}
        {lastUploadId && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-2">
            <p className="text-sm font-medium text-amber-800">
              ✓ {d.queuedMsg}{" "}
              <code className="font-mono text-amber-900">{lastUploadId}</code>
            </p>
            <p className="text-xs text-amber-700">
              {d.pollingHint}{" "}
              <code className="font-mono">status === &quot;completed&quot;</code>.
            </p>
            <div className="flex gap-2 pt-1">
              <button
                onClick={pollStatus}
                disabled={loading}
                className="flex items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700 disabled:opacity-50 transition-colors"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                {d.checkStatus}
              </button>
              <button
                onClick={switchToPolling}
                className="flex items-center gap-1 rounded-lg border border-amber-300 px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-100 transition-colors"
              >
                {d.switchToGet}
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Response */}
        {response && (
          <div>
            <div className="mb-2 flex items-center gap-2">
              <span className="text-xs font-medium text-slate-500">{d.response}</span>
              <span className={`text-xs font-bold font-mono ${statusColor}`}>
                HTTP {response.status}
              </span>
            </div>
            <pre className="overflow-auto rounded-xl bg-slate-900 p-4 text-xs text-slate-100 font-mono leading-relaxed max-h-96">
              {JSON.stringify(response.body, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Generalized Webhook URL Builder ─────────────────────────────────────── */

function WebhookUrlBuilder({
  d,
  lang,
  endpoint,
}: {
  d: ApiDocs;
  lang: string;
  endpoint: string;
}) {
  const [apiKey,     setApiKey]     = useState("");
  const [reportType, setReportType] = useState("medium");
  const [copied,     setCopied]     = useState(false);

  const origin =
    typeof window !== "undefined" ? window.location.origin : "https://your-domain.com";

  const webhookUrl = apiKey.startsWith("aca_")
    ? `${origin}/api/integrations/${endpoint}?key=${apiKey}&reportType=${reportType}`
    : "";

  function copyUrl() {
    if (!webhookUrl) return;
    navigator.clipboard.writeText(webhookUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
      {/* API key input */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-slate-700">
          {d.bUrlApiKeyLabel}
        </label>
        <input
          type="text"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="aca_••••••••••••••••••••••••••••••••"
          className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-mono text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
        />
        <p className="mt-1 text-xs text-slate-400">
          {d.bUrlApiKeyHintA}{" "}
          <Link
            href={`/${lang}/settings`}
            className="text-brand-600 hover:underline font-medium"
          >
            {d.bUrlApiKeyHintSettings}
          </Link>
          {d.bUrlApiKeyHintB}
        </p>
      </div>

      {/* Report type */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-slate-700">
          {d.reportTypeLabel}
        </label>
        <div className="flex gap-2">
          {(["high_level", "medium", "detailed"] as const).map((rt) => (
            <button
              key={rt}
              onClick={() => setReportType(rt)}
              className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                reportType === rt
                  ? "border-brand-500 bg-brand-50 text-brand-700"
                  : "border-slate-200 text-slate-600 hover:border-brand-300"
              }`}
            >
              {rt}
            </button>
          ))}
        </div>
      </div>

      {/* Generated URL */}
      {webhookUrl ? (
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">
            {d.integrationBUrlLabel}
          </label>
          <div className="flex items-start gap-2">
            <code className="flex-1 rounded-lg bg-slate-100 px-3 py-2 text-xs font-mono text-slate-800 break-all leading-relaxed">
              {webhookUrl}
            </code>
            <button
              onClick={copyUrl}
              className="shrink-0 flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
            >
              {copied ? (
                <Check className="h-3.5 w-3.5 text-emerald-500" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
              {copied ? d.copied : d.copy}
            </button>
          </div>
        </div>
      ) : (
        <div className="rounded-lg bg-slate-50 px-4 py-3">
          <p className="text-xs text-slate-400">{d.bUrlHint}</p>
        </div>
      )}
    </div>
  );
}

/* ── Integration tab content (shared layout) ─────────────────────────────── */

type IntegrationConfig = {
  name: string;
  endpoint: string;
  aboutDesc: string;
  howStep1: string;
  howStep3: string;
  step2Title: string;
  step2Desc: string;
  setupSteps: string[];
  endpointDesc: string;
  payloadDesc: string;
  payloadNote: string;
  extraNote?: string;
};

function IntegrationTabContent({
  cfg,
  d,
  lang,
}: {
  cfg: IntegrationConfig;
  d: ApiDocs;
  lang: string;
}) {
  const payloadCode = PAYLOAD[cfg.endpoint as Integration];

  return (
    <>
      {/* ── About ── */}
      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-brand-600">
          {d.integrationAboutTitle}
        </h2>
        <p className="text-sm text-slate-600">
          <strong>{cfg.name}</strong> — {cfg.aboutDesc}
        </p>
        <div className="rounded-xl border border-brand-200 bg-brand-50 px-5 py-4 text-sm text-brand-800 space-y-1">
          <p className="font-semibold">{d.integrationHowTitle}</p>
          <ol className="list-decimal list-inside space-y-1 text-brand-700">
            {[
              cfg.howStep1,
              d.integrationHowStep2,
              cfg.howStep3,
              d.integrationHowStep4,
              d.integrationHowStep5,
            ].map((step, i) => (
              <li key={i}>{step}</li>
            ))}
          </ol>
        </div>
      </section>

      {/* ── Step 1: URL builder ── */}
      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-brand-600">
          {d.integrationStep1Title}
        </h2>
        <p className="text-sm text-slate-600">{d.integrationStep1Desc}</p>
        <WebhookUrlBuilder d={d} lang={lang} endpoint={cfg.endpoint} />
      </section>

      {/* ── Step 2: Platform setup ── */}
      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-brand-600">
          {cfg.step2Title}
        </h2>
        <p className="text-sm text-slate-600">{cfg.step2Desc}</p>
        <ol className="space-y-3">
          {cfg.setupSteps.map((step, i) => (
            <li key={i} className="flex gap-3 text-sm text-slate-600">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">
                {i + 1}
              </span>
              <span className="pt-0.5">{step}</span>
            </li>
          ))}
        </ol>
      </section>

      {/* ── Query params ── */}
      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-brand-600">
          {d.integrationParamsTitle}
        </h2>
        <EndpointRow
          method="POST"
          path={`/api/integrations/${cfg.endpoint}`}
          description={cfg.endpointDesc}
          params={[
            { name: "key",        type: d.integrationParamKeyType,    desc: d.integrationParamKeyDesc },
            { name: "reportType", type: d.integrationParamReportType, desc: d.paramReportTypeDesc },
          ]}
          d={d}
        />
      </section>

      {/* ── Payload format ── */}
      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-brand-600">
          {d.integrationPayloadTitle}
        </h2>
        <p className="text-sm text-slate-600">{cfg.payloadDesc}</p>
        <CodeBlock lang="json" code={payloadCode} />
        <p className="text-sm text-slate-500">{cfg.payloadNote}</p>
        {cfg.extraNote && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
            <p className="text-xs text-amber-800">{cfg.extraNote}</p>
          </div>
        )}
      </section>

      {/* ── Response ── */}
      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-brand-600">
          {d.integrationResponseTitle}
        </h2>
        <p className="text-sm text-slate-600">
          {d.integrationResponseDescA}{" "}
          <code className="rounded bg-slate-100 px-1 py-0.5 text-xs font-mono text-brand-700">
            GET /api/v1/calls/:id
          </code>{" "}
          {d.integrationResponseDescB}
        </p>
        <CodeBlock
          lang="json"
          code={`// Answered call → queued for analysis
{
  "id":       "cmpranw3g00049gvmy1r4tgfv",
  "status":   "queued",
  "fileName": "call.mp3",
  "pollUrl":  "/api/v1/calls/cmpranw3g00049gvmy1r4tgfv"
}

// Unanswered / no recording → skipped (HTTP 200)
{
  "skipped": true,
  "reason":  "no recording available"
}`}
        />
      </section>
    </>
  );
}

/* ── Build per-integration config from dict ──────────────────────────────── */

function buildConfig(d: ApiDocs, id: Integration): IntegrationConfig {
  const configs: Record<Integration, IntegrationConfig> = {
    binotel: {
      name: "Binotel",
      endpoint: "binotel",
      aboutDesc:  d.binotelAboutDesc,
      howStep1:   d.binotelHowStep1,
      howStep3:   d.binotelHowStep3,
      step2Title: d.binotelStep2Title,
      step2Desc:  d.binotelStep2Desc,
      setupSteps: [d.binotelSetupStep1, d.binotelSetupStep2, d.binotelSetupStep3, d.binotelSetupStep4, d.binotelSetupStep5],
      endpointDesc: d.binotelEndpointDesc,
      payloadDesc:  d.binotelPayloadDesc,
      payloadNote:  d.binotelPayloadNote,
    },
    keycrm: {
      name: "KeyCRM",
      endpoint: "keycrm",
      aboutDesc:  d.keycrmAboutDesc,
      howStep1:   d.keycrmHowStep1,
      howStep3:   d.keycrmHowStep3,
      step2Title: d.keycrmStep2Title,
      step2Desc:  d.keycrmStep2Desc,
      setupSteps: [d.keycrmSetupStep1, d.keycrmSetupStep2, d.keycrmSetupStep3, d.keycrmSetupStep4],
      endpointDesc: d.keycrmEndpointDesc,
      payloadDesc:  d.keycrmPayloadDesc,
      payloadNote:  d.keycrmPayloadNote,
    },
    ringostat: {
      name: "Ringostat",
      endpoint: "ringostat",
      aboutDesc:  d.ringostatAboutDesc,
      howStep1:   d.ringostatHowStep1,
      howStep3:   d.ringostatHowStep3,
      step2Title: d.ringostatStep2Title,
      step2Desc:  d.ringostatStep2Desc,
      setupSteps: [d.ringostatSetupStep1, d.ringostatSetupStep2, d.ringostatSetupStep3, d.ringostatSetupStep4],
      endpointDesc: d.ringostatEndpointDesc,
      payloadDesc:  d.ringostatPayloadDesc,
      payloadNote:  d.ringostatPayloadNote,
    },
    kyivstar: {
      name: "Kyivstar Cloud PBX",
      endpoint: "kyivstar",
      aboutDesc:  d.kyivstarAboutDesc,
      howStep1:   d.kyivstarHowStep1,
      howStep3:   d.kyivstarHowStep3,
      step2Title: d.kyivstarStep2Title,
      step2Desc:  d.kyivstarStep2Desc,
      setupSteps: [d.kyivstarSetupStep1, d.kyivstarSetupStep2, d.kyivstarSetupStep3, d.kyivstarSetupStep4],
      endpointDesc: d.kyivstarEndpointDesc,
      payloadDesc:  d.kyivstarPayloadDesc,
      payloadNote:  d.kyivstarPayloadNote,
    },
    voiptime: {
      name: "VoIPTime Cloud",
      endpoint: "voiptime",
      aboutDesc:  d.voiptimeAboutDesc,
      howStep1:   d.voiptimeHowStep1,
      howStep3:   d.voiptimeHowStep3,
      step2Title: d.voiptimeStep2Title,
      step2Desc:  d.voiptimeStep2Desc,
      setupSteps: [d.voiptimeSetupStep1, d.voiptimeSetupStep2, d.voiptimeSetupStep3, d.voiptimeSetupStep4],
      endpointDesc: d.voiptimeEndpointDesc,
      payloadDesc:  d.voiptimePayloadDesc,
      payloadNote:  d.voiptimePayloadNote,
    },
    twilio: {
      name: "Twilio",
      endpoint: "twilio",
      aboutDesc:  d.twilioAboutDesc,
      howStep1:   d.twilioHowStep1,
      howStep3:   d.twilioHowStep3,
      step2Title: d.twilioStep2Title,
      step2Desc:  d.twilioStep2Desc,
      setupSteps: [d.twilioSetupStep1, d.twilioSetupStep2, d.twilioSetupStep3, d.twilioSetupStep4],
      endpointDesc: d.twilioEndpointDesc,
      payloadDesc:  d.twilioPayloadDesc,
      payloadNote:  d.twilioPayloadNote,
      extraNote:    d.twilioAuthNote,
    },
    aircall: {
      name: "Aircall",
      endpoint: "aircall",
      aboutDesc:  d.aircallAboutDesc,
      howStep1:   d.aircallHowStep1,
      howStep3:   d.aircallHowStep3,
      step2Title: d.aircallStep2Title,
      step2Desc:  d.aircallStep2Desc,
      setupSteps: [d.aircallSetupStep1, d.aircallSetupStep2, d.aircallSetupStep3, d.aircallSetupStep4],
      endpointDesc: d.aircallEndpointDesc,
      payloadDesc:  d.aircallPayloadDesc,
      payloadNote:  d.aircallPayloadNote,
    },
  };
  return configs[id];
}

/* ── Main exported component ────────────────────────────────────────────── */

export function ApiDocsClient({ t, lang }: Props) {
  const d = t.apiDocs;
  const [tab,         setTab]         = useState<Tab>("api");
  const [integration, setIntegration] = useState<Integration>("binotel");

  const baseUrl = "https://your-domain.com";

  return (
    <main className="mx-auto max-w-5xl px-4 py-6 md:px-6 md:py-10 space-y-8 md:space-y-10">
      {/* ── Header ── */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 md:text-3xl">{d.title}</h1>
        <p className="mt-2 text-slate-500">{d.subtitle}</p>
        <Link
          href={`/${lang}/settings`}
          className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600 hover:text-brand-800 transition-colors"
        >
          {d.goToSettings}
        </Link>
      </div>

      {/* ── Top-level tab nav ── */}
      <div className="flex gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1">
        {([["api", d.tabApi], ["integrations", d.tabIntegrations]] as [Tab, string][]).map(
          ([id, label]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                tab === id
                  ? "bg-white shadow-sm text-slate-900"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {label}
            </button>
          ),
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          TAB: API Reference
         ══════════════════════════════════════════════════════════════════════ */}
      {tab === "api" && (
        <>
          {/* ── Base URL ── */}
          <section className="space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-brand-600">
              {d.baseUrl}
            </h2>
            <CodeBlock code={`${baseUrl}/api/v1`} />
          </section>

          {/* ── Authentication ── */}
          <section className="space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-brand-600">
              {d.authTitle}
            </h2>
            <p className="text-sm text-slate-600">{d.authDesc}</p>
            <CodeBlock code={`Authorization: Bearer aca_your_api_key_here`} />
            <p className="text-sm text-slate-500">
              {d.authNoteA}{" "}
              <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-mono text-brand-700">
                aca_
              </code>
              {d.authNoteB}{" "}
              <Link
                href={`/${lang}/settings`}
                className="font-medium text-brand-600 hover:underline"
              >
                {d.authNoteSettings}
              </Link>
              {d.authNoteC}
            </p>
          </section>

          {/* ── Quick start ── */}
          <section className="space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-brand-600">
              {d.quickStartTitle}
            </h2>
            <p className="text-sm text-slate-600">{d.quickStartDesc}</p>
            <CodeBlock
              code={`# 1. Upload an audio file for analysis (returns 202 immediately)
curl -X POST ${baseUrl}/api/v1/calls \\
  -H "Authorization: Bearer aca_your_key_here" \\
  -F "file=@/path/to/call.mp3" \\
  -F "reportType=medium"

# Response → { "id": "cmp...", "status": "queued", "pollUrl": "/api/v1/calls/cmp..." }

# 2. Poll until status === "completed" or "failed"
curl ${baseUrl}/api/v1/calls/cmp... \\
  -H "Authorization: Bearer aca_your_key_here"`}
            />
            <CodeBlock
              lang="js"
              code={`// JavaScript — upload and wait for result
async function analyzeCall(filePath, apiKey) {
  const form = new FormData();
  form.append('file', fs.createReadStream(filePath));
  form.append('reportType', 'medium');

  const upload = await fetch('${baseUrl}/api/v1/calls', {
    method: 'POST',
    headers: { Authorization: \`Bearer \${apiKey}\` },
    body: form,
  });
  const { id } = await upload.json(); // status: 202

  // Poll every 5 seconds until done
  while (true) {
    await new Promise(r => setTimeout(r, 5000));
    const res = await fetch(\`${baseUrl}/api/v1/calls/\${id}\`, {
      headers: { Authorization: \`Bearer \${apiKey}\` },
    });
    const call = await res.json();
    if (call.status === 'completed') return call;
    if (call.status === 'failed')    throw new Error(call.errorMessage);
  }
}`}
            />
          </section>

          {/* ── Endpoints ── */}
          <section className="space-y-4">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-brand-600">
              {d.endpointsTitle}
            </h2>

            <EndpointRow method="GET" path="/api/v1/me" description={d.epMeDesc} d={d} />

            <EndpointRow
              method="POST"
              path="/api/v1/calls"
              description={d.epPostCallsDesc}
              params={[
                { name: "file",       type: d.paramFileType, desc: d.paramFileDesc },
                { name: "reportType", type: "string",        desc: d.paramReportTypeDesc },
              ]}
              d={d}
            />

            <EndpointRow
              method="GET"
              path="/api/v1/calls"
              description={d.epGetCallsDesc}
              params={[
                { name: "limit",  type: "integer", desc: d.paramLimitDesc },
                { name: "offset", type: "integer", desc: d.paramOffsetDesc },
                { name: "status", type: "string",  desc: d.paramStatusDesc },
              ]}
              d={d}
            />

            <EndpointRow method="GET" path="/api/v1/calls/:id" description={d.epGetCallDesc} d={d} />

            {/* Response examples */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                {d.exampleListLabel}
              </p>
              <CodeBlock
                lang="json"
                code={`{
  "calls": [
    {
      "id": "cmpranw3g00049gvmy1r4tgfv",
      "fileName": "call_2024-01-15.mp3",
      "status": "completed",
      "reportType": "medium",
      "language": "uk",
      "product": "CRM Software",
      "saleStatus": "sold",
      "score": 8,
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:31:45.000Z"
    }
  ],
  "total": 42,
  "limit": 50,
  "offset": 0
}`}
              />
            </div>

            <div className="space-y-2">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                {d.exampleDetailLabel}
              </p>
              <CodeBlock
                lang="json"
                code={`{
  "id": "cmpranw3g00049gvmy1r4tgfv",
  "fileName": "call_2024-01-15.mp3",
  "status": "completed",
  "language": "uk",
  "product": "CRM Software",
  "saleStatus": "sold",
  "score": 8,
  "summary": "Manager successfully presented the product...",
  "customerIntent": "Looking to automate sales tracking",
  "nextStep": "Schedule demo for next week",
  "issues": ["Did not ask about budget", "Interrupted customer twice"],
  "positives": ["Strong product knowledge", "Good rapport"],
  "recommendations": ["Ask discovery questions earlier"],
  "objections": ["Price is too high"],
  "managerMistakes": ["Skipped needs analysis"],
  "detailedReport": [...],
  "transcript": "Manager: Hello...",
  "createdAt": "2024-01-15T10:30:00.000Z"
}`}
              />
            </div>
          </section>

          {/* ── Error codes ── */}
          <section className="space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-brand-600">
              {d.errorCodesTitle}
            </h2>
            <div className="overflow-hidden rounded-xl border border-slate-200">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-xs text-slate-500">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">{d.httpStatus}</th>
                    <th className="px-4 py-3 text-left font-medium">{d.meaning}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {[
                    ["200", d.err200],
                    ["202", d.err202],
                    ["401", d.err401],
                    ["404", d.err404],
                    ["500", d.err500],
                  ].map(([code, msg]) => (
                    <tr key={code}>
                      <td className="px-4 py-3 font-mono font-semibold text-slate-800">{code}</td>
                      <td className="px-4 py-3 text-slate-600">{msg}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* ── Interactive tester ── */}
          <section className="space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-brand-600">
              {d.testTitle}
            </h2>
            <ApiTester t={t} />
          </section>
        </>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB: Integrations — two-column layout
         ══════════════════════════════════════════════════════════════════════ */}
      {tab === "integrations" && (
        <div className="flex flex-col gap-6 md:flex-row md:items-start">
          {/* ── Integration selector: horizontal scroll on mobile, sidebar on md+ ── */}
          <aside className="md:w-44 md:shrink-0 md:sticky md:top-6">
            <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-widest text-slate-400 md:px-3">
              {d.integrationSidebarTitle}
            </p>
            {/* Mobile: horizontal pill row */}
            <div className="flex gap-2 overflow-x-auto pb-1 md:hidden">
              {INTEGRATIONS.map(({ id, label }) => (
                <button
                  key={id}
                  onClick={() => setIntegration(id)}
                  className={`shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors whitespace-nowrap ${
                    integration === id
                      ? "bg-brand-600 text-white"
                      : "border border-slate-200 text-slate-600 hover:border-brand-300"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            {/* Desktop: vertical nav */}
            <nav className="hidden md:block space-y-0.5">
              {INTEGRATIONS.map(({ id, label }) => (
                <button
                  key={id}
                  onClick={() => setIntegration(id)}
                  className={`w-full rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors ${
                    integration === id
                      ? "bg-brand-50 text-brand-700"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  {label}
                </button>
              ))}
            </nav>
          </aside>

          {/* ── Right content ── */}
          <div className="min-w-0 flex-1 space-y-10">
            <IntegrationTabContent
              key={integration}
              cfg={buildConfig(d, integration)}
              d={d}
              lang={lang}
            />
          </div>
        </div>
      )}
    </main>
  );
}
