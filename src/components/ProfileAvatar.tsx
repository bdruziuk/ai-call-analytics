"use client";

import { useState } from "react";

type Props = {
  photo?: string | null;
  name: string;
  className?: string;
  textClassName?: string;
};

/**
 * Renders a circular profile photo.
 * Falls back to the first-letter avatar when the photo is absent,
 * is a stale filesystem path, or fails to load for any other reason.
 */
export function ProfileAvatar({ photo, name, className = "h-8 w-8", textClassName }: Props) {
  const [broken, setBroken] = useState(false);
  const initial = (name || "?").charAt(0).toUpperCase();

  if (!photo || broken) {
    return (
      <div
        className={`${className} rounded-full bg-brand-100 flex items-center justify-center shrink-0 font-semibold text-brand-600 ${textClassName ?? "text-sm"}`}
      >
        {initial}
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={photo}
      alt={name}
      className={`${className} rounded-full object-cover shrink-0`}
      onError={() => setBroken(true)}
    />
  );
}
