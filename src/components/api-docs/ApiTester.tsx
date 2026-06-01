"use client";

import { useRef, useState } from "react";
import { Play, Eye, EyeOff, Upload, RefreshCw, ChevronRight } from "lucide-react";
import type ukDict from "@/dictionaries/uk.json";

type Dictionary = typeof ukDict;

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
type ReportType = typeof REPORT_TYPES[number];

type Props = { t: Dictionary };

export function ApiTester({ t }: Props) {
  const d = t.apiDocs;

  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [epIdx, setEpIdx] = useState(0);
  const [callId, setCallId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [reportType, setReportType] = useState<ReportType>("medium");
  const [response, setResponse] = useState<{ status: number; body: unknown } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUploadId, setLastUploadId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const ep = ENDPOINTS[epIdx];

  async function runTest() {
    if (!apiKey.trim()) { setError(d.errorNoKey); return; }
    setLoading(true);
    setError(null);
    setResponse(null);
    setLastUploadId(null);

    try {
      if (ep.needsFile) {
        if (!file) { setError("Please select an audio file first."); setLoading(false); return; }
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
        if (res.status === 202 && typeof (body as Record<string,unknown>)?.id === "string") {
          setLastUploadId((body as Record<string,string>).id);
        }
      } else {
        const url = ep.needsId
          ? `${ep.url}${callId.trim()}`
          : ep.url;
        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${apiKey.trim()}` },
        });
        const body = await res.json().catch(() => null);
        setResponse({ status: res.status, body });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
    } finally {
      setLoading(false);
    }
  }

  function switchToPolling() {
    if (!lastUploadId) return;
    setEpIdx(2);               // GET /api/v1/calls/:id
    setCallId(lastUploadId);
    setResponse(null);
    setLastUploadId(null);
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
      // If still processing, keep lastUploadId so user can keep polling
      const s = (body as Record<string,unknown>)?.status;
      if (s === "completed" || s === "failed") setLastUploadId(null);
    } finally {
      setLoading(false);
    }
  }

  const statusColor =
    !response         ? ""
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

        {/* Call ID field (GET /calls/:id) */}
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

        {/* File upload (POST /calls) */}
        {ep.needsFile && (
          <div className="space-y-3">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Audio file</label>
              <div
                onClick={() => fileInputRef.current?.click()}
                className="flex cursor-pointer items-center gap-3 rounded-xl border-2 border-dashed border-slate-200 px-4 py-4 hover:border-brand-300 hover:bg-brand-50/40 transition-colors"
              >
                <Upload className="h-5 w-5 shrink-0 text-slate-400" />
                <div className="min-w-0">
                  {file ? (
                    <>
                      <p className="truncate text-sm font-medium text-slate-800">{file.name}</p>
                      <p className="text-xs text-slate-400">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                    </>
                  ) : (
                    <p className="text-sm text-slate-400">Click to select MP3, WAV, M4A…</p>
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
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Report type</label>
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
          {loading ? d.testRunning : ep.needsFile ? "Upload & analyze" : d.testRun}
        </button>

        {/* After upload: poll helpers */}
        {lastUploadId && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-2">
            <p className="text-sm font-medium text-amber-800">
              ✓ Queued — ID: <code className="font-mono text-amber-900">{lastUploadId}</code>
            </p>
            <p className="text-xs text-amber-700">
              Analysis is running. Poll until <code className="font-mono">status === &quot;completed&quot;</code>.
            </p>
            <div className="flex gap-2 pt-1">
              <button
                onClick={pollStatus}
                disabled={loading}
                className="flex items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700 disabled:opacity-50 transition-colors"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Check status
              </button>
              <button
                onClick={switchToPolling}
                className="flex items-center gap-1 rounded-lg border border-amber-300 px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-100 transition-colors"
              >
                Switch to GET endpoint
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
