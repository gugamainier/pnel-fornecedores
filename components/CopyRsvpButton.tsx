"use client";

import { useState } from "react";

export default function CopyRsvpButton({ token }: { token: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(
      `${window.location.origin}/confirmar/${token}`
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <button
      onClick={copy}
      title="Copiar link de confirmação (RSVP)"
      className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
    >
      {copied ? "Copiado!" : "Link RSVP"}
    </button>
  );
}
