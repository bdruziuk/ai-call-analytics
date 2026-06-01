"use client";

import { useEffect, useRef, useState } from "react";
import type ukDict from "@/dictionaries/uk.json";

type Dictionary = typeof ukDict;

type Props = {
  callId: string;
  initialStatus: string;
  t: Dictionary;
};

export function CallProcessing({ callId, initialStatus, t }: Props) {
  const [status, setStatus] = useState(initialStatus);
  const [error, setError] = useState<string | null>(null);

  const hasStartedProcessing = useRef(false);
  const { failedToStart, failedWithError, inProgress, currentStatus } =
    t.processing;

  useEffect(() => {
    if (
      hasStartedProcessing.current ||
      status === "completed" ||
      status === "failed"
    ) {
      return;
    }

    hasStartedProcessing.current = true;

    fetch(`/api/calls/${callId}/process`, {
      method: "POST",
    }).catch(() => {
      setError(failedToStart);
    });
  }, [callId, status, failedToStart]);

  useEffect(() => {
    if (status === "completed" || status === "failed") {
      return;
    }

    const intervalId = window.setInterval(async () => {
      const response = await fetch(`/api/calls/${callId}`);

      if (!response.ok) return;

      const data = await response.json();

      setStatus(data.status);

      if (data.status === "completed") {
        window.location.reload();
      }

      if (data.status === "failed") {
        setError(data.errorMessage || failedWithError);
      }
    }, 3000);

    return () => window.clearInterval(intervalId);
  }, [callId, status, failedWithError]);

  if (status === "completed") {
    return null;
  }

  return (
    <div className="mb-8 flex items-start gap-4 rounded-2xl border border-brand-200 bg-brand-50 p-5">
      {/* Animated spinner */}
      <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center">
        <svg className="h-5 w-5 animate-spin text-brand-600" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
      <div>
        <p className="font-semibold text-brand-900">{inProgress}</p>
        <p className="mt-0.5 text-sm text-brand-700">
          {currentStatus} {status}
        </p>
        {error && <p className="mt-2 text-sm text-red-700">{error}</p>}
      </div>
    </div>
  );
}
