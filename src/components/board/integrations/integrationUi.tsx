import React from "react";

/** Class names and small pieces shared by the views of the Integrate dialog. */
export const PRIMARY_BUTTON = "h-8 rounded-[7px] bg-boardtree-accent px-3.5 text-[12.5px] font-medium text-white hover:bg-boardtree-accent-hover disabled:opacity-40";
export const SECONDARY_BUTTON = "h-8 rounded-[7px] border border-boardtree-border px-3.5 text-[12.5px] text-boardtree-text hover:bg-boardtree-hover disabled:opacity-40";
export const DANGER_BUTTON = "h-8 rounded-[7px] bg-boardtree-danger px-3.5 text-[12.5px] font-medium text-white hover:opacity-90 disabled:opacity-40";

export const EnvelopeIcon = ({ size = 20 }: { size?: number }) => (
  <svg viewBox="0 0 16 16" width={size} height={size} aria-hidden="true">
    <rect x="1.8" y="3.4" width="12.4" height="9.2" rx="1.6" fill="none" stroke="currentColor" strokeWidth="1.2" />
    <path d="M2.4 4.6 L8 9 L13.6 4.6" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export function StatusPill({ label, is_positive }: { label: string; is_positive: boolean }) {
  return (
    <span className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${is_positive ? "bg-[#00c875]/[0.14] text-[#0a9a5c] dark:text-[#3ddc97]" : "bg-boardtree-track text-boardtree-text-muted"}`}>
      {label}
    </span>
  );
}

/** Success or error message at the top of a view, dismissible. */
export function MessageBanner({ error, notice, onDismiss }: { error: string | null; notice: string | null; onDismiss: () => void }) {
  const message = error ?? notice;
  if (!message) return null;

  return (
    <div
      role={error ? "alert" : "status"}
      className={`mb-4 flex items-start justify-between gap-3 rounded-[8px] border px-3 py-2 text-[12.5px] ${error ? "border-boardtree-danger/30 bg-boardtree-danger-hover text-boardtree-danger" : "border-[#00c875]/30 bg-[#00c875]/[0.1] text-[#0a9a5c] dark:text-[#3ddc97]"}`}
    >
      <span>{message}</span>
      <button type="button" onClick={onDismiss} className="flex-none text-[12px] font-medium opacity-70 hover:opacity-100">Dismiss</button>
    </div>
  );
}
