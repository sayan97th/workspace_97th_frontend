"use client";
import React from "react";
import { AlertCircle, Check, Loader2 } from "lucide-react";
import type { DocSaveStatus } from "./useDocAutosave";

/** "Saving…", "Saved" or a retry link, shown in the doc toolbar. */
const DocSaveIndicator: React.FC<{ status: DocSaveStatus; onRetry: () => void }> = ({ status, onRetry }) => {
  if (status === "idle") return null;
  if (status === "saving") {
    return (
      <span className="flex items-center gap-1.5 text-[13px] text-[var(--doc-text-faint)]">
        <Loader2 size={13} className="animate-spin" /> Saving…
      </span>
    );
  }
  if (status === "error") {
    return (
      <button type="button" onClick={onRetry} className="flex items-center gap-1.5 text-[13px] text-[var(--doc-danger)] hover:underline">
        <AlertCircle size={13} /> Couldn&apos;t save, retry
      </button>
    );
  }
  return (
    <span className="flex items-center gap-1.5 text-[13px] text-[var(--doc-text-faint)]">
      <Check size={13} /> Saved
    </span>
  );
};

export default DocSaveIndicator;
