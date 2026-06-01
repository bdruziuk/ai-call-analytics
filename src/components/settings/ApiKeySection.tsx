"use client";

import { useState } from "react";
import { KeyRound, Trash2, Copy, Check, Plus, X, Lock } from "lucide-react";
import type ukDict from "@/dictionaries/uk.json";

type Dictionary = typeof ukDict;

export type ApiKeyRecord = {
  id: string;
  name: string;
  keyPrefix: string;
  lastUsedAt: string | null;
  createdAt: string;
};

type Props = {
  t: Dictionary;
  initialKeys: ApiKeyRecord[];
  locked?: boolean;   // true for free / starter plans
};

export function ApiKeySection({ t, initialKeys, locked = false }: Props) {
  const ak = t.settings.apiKeys;

  const [keys, setKeys] = useState<ApiKeyRecord[]>(initialKeys);
  const [showForm, setShowForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [generating, setGenerating] = useState(false);
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [revoking, setRevoking] = useState<string | null>(null);

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    setGenerating(true);
    try {
      const res = await fetch("/api/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim() || "Default" }),
      });
      const data = await res.json();
      setRevealedKey(data.key);
      setNewName("");
      setShowForm(false);
      // Refresh key list
      const listRes = await fetch("/api/keys");
      if (listRes.ok) setKeys(await listRes.json());
    } finally {
      setGenerating(false);
    }
  }

  async function handleRevoke(id: string) {
    if (!confirm(ak.revokeConfirm)) return;
    setRevoking(id);
    try {
      await fetch(`/api/keys/${id}`, { method: "DELETE" });
      setKeys((prev) => prev.filter((k) => k.id !== id));
    } finally {
      setRevoking(null);
    }
  }

  function copyKey() {
    if (!revealedKey) return;
    navigator.clipboard.writeText(revealedKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function formatDate(iso: string | null) {
    if (!iso) return ak.never;
    return new Date(iso).toLocaleDateString();
  }

  if (locked) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-brand-600">
          {ak.sectionTitle}
        </h2>
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-6 py-8 text-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100">
            <Lock className="h-5 w-5 text-slate-400" />
          </div>
          <p className="text-sm font-medium text-slate-700">{ak.lockedTitle}</p>
          <p className="max-w-xs text-xs text-slate-500">{ak.lockedDesc}</p>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-brand-600">
            {ak.sectionTitle}
          </h2>
          <p className="mt-1 text-sm text-slate-500">{ak.sectionSubtitle}</p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-brand-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          {ak.generateButton}
        </button>
      </div>

      {/* New key form */}
      {showForm && (
        <form
          onSubmit={handleGenerate}
          className="mb-5 flex items-center gap-2 rounded-xl border border-brand-200 bg-brand-50 px-4 py-3"
        >
          <KeyRound className="h-4 w-4 shrink-0 text-brand-500" />
          <input
            autoFocus
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder={ak.namePlaceholder}
            maxLength={60}
            className="flex-1 bg-transparent text-sm text-slate-800 placeholder-slate-400 outline-none"
          />
          <button
            type="submit"
            disabled={generating}
            className="rounded-lg bg-brand-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50 transition-colors"
          >
            {generating ? ak.generating : ak.generateButton}
          </button>
          <button
            type="button"
            onClick={() => setShowForm(false)}
            className="p-1 text-slate-400 hover:text-slate-600"
          >
            <X className="h-4 w-4" />
          </button>
        </form>
      )}

      {/* Key list */}
      {keys.length === 0 ? (
        <p className="py-6 text-center text-sm text-slate-400">{ak.noKeys}</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {keys.map((k) => (
            <li key={k.id} className="flex items-center gap-3 py-3">
              <KeyRound className="h-4 w-4 shrink-0 text-slate-400" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800">{k.name}</p>
                <p className="text-xs text-slate-400 font-mono">
                  {k.keyPrefix}••••••••••••••••••••••••••••••••••••••
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs text-slate-400">
                  {ak.lastUsed}: {formatDate(k.lastUsedAt)}
                </p>
                <p className="text-xs text-slate-400">
                  {ak.created}: {formatDate(k.createdAt)}
                </p>
              </div>
              <button
                onClick={() => handleRevoke(k.id)}
                disabled={revoking === k.id}
                className="p-1.5 text-slate-400 hover:text-red-500 transition-colors disabled:opacity-40"
                title={ak.revoke}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* New key modal */}
      {revealedKey && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-semibold text-slate-900">{ak.newKeyTitle}</h3>
            <p className="mt-1 text-sm text-amber-600 font-medium">{ak.newKeyWarning}</p>

            <div className="mt-4 flex items-stretch gap-2">
              <code className="flex-1 break-all rounded-lg bg-slate-900 px-4 py-3 text-sm text-emerald-400 font-mono leading-relaxed">
                {revealedKey}
              </code>
              <button
                onClick={copyKey}
                className="flex shrink-0 flex-col items-center justify-center gap-1 rounded-lg border border-slate-200 px-3 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4 text-emerald-500" />
                    {ak.copied}
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    {ak.copy}
                  </>
                )}
              </button>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                onClick={() => { setRevealedKey(null); setCopied(false); }}
                className="rounded-lg bg-brand-600 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-700 transition-colors"
              >
                {ak.done}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
