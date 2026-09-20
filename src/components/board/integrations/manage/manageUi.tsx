import React from "react";
import type { BoardAutomationRunStatus } from "@/types/board-automation";
import { RUN_STATUS_LABELS } from "./manageFormat";

/** Class names and small pieces shared by the tabs of the Manage view. */
export const TOOLBAR_BUTTON =
  "flex h-9 items-center gap-1.5 rounded-[6px] px-3 text-[13px] text-boardtree-text-secondary transition-colors hover:bg-boardtree-hover disabled:opacity-40";
export const ICON_BUTTON =
  "flex h-9 w-9 flex-none items-center justify-center rounded-[6px] text-boardtree-text-muted transition-colors hover:bg-boardtree-hover hover:text-boardtree-text disabled:opacity-40";
export const FIELD =
  "h-9 rounded-[6px] border border-boardtree-border bg-boardtree-surface px-2.5 text-[13px] text-boardtree-text outline-none focus:border-boardtree-accent";
export const MENU_PANEL = "absolute z-20 mt-1 rounded-[8px] border border-boardtree-border bg-boardtree-surface py-1 shadow-[0_10px_28px_rgba(30,34,55,0.18)] dark:shadow-[0_10px_28px_rgba(0,0,0,0.55)]";
export const MENU_ITEM = "flex h-8 w-full items-center gap-2.5 px-3 text-left text-[13px] text-boardtree-text hover:bg-boardtree-hover";

const STATUS_STYLES: Record<BoardAutomationRunStatus, string> = {
  success: "bg-[#00c875]/[0.14] text-[#0a9a5c] dark:text-[#3ddc97]",
  skipped: "bg-boardtree-track text-boardtree-text-muted",
  failed: "bg-boardtree-danger-hover text-boardtree-danger",
};

export function RunStatusBadge({ status }: { status: BoardAutomationRunStatus }) {
  return <span className={`inline-flex rounded-md px-2 py-0.5 text-[11.5px] font-semibold ${STATUS_STYLES[status]}`}>{RUN_STATUS_LABELS[status]}</span>;
}

/** A small robot on a card, the mascot of both empty states. `is_sleeping` closes its eyes and adds the "z" marks. */
function RobotIllustration({ is_sleeping }: { is_sleeping: boolean }) {
  return (
    <svg viewBox="0 0 160 130" width="160" height="130" aria-hidden="true">
      <rect x="18" y="86" width="124" height="34" rx="4" fill="currentColor" className="text-boardtree-accent-surface" />
      <rect x="18" y="86" width="6" height="34" rx="2" fill="currentColor" className="text-boardtree-accent-soft" />
      <rect x="34" y="98" width="26" height="3" rx="1.5" fill="#fff" />
      <rect x="34" y="106" width="20" height="3" rx="1.5" fill="#fff" />
      <rect x="98" y="97" width="34" height="14" rx="7" fill="#00c875" />
      <circle cx="125" cy="104" r="5" fill="#fff" />
      <line x1="80" y1="14" x2="80" y2="24" stroke="currentColor" strokeWidth="2" className="text-boardtree-accent" />
      <circle cx="80" cy="12" r="3.5" fill="currentColor" className="text-boardtree-accent" />
      <rect x="52" y="24" width="56" height="44" rx="10" fill="currentColor" className="text-boardtree-accent-soft" />
      <rect x="46" y="38" width="6" height="14" rx="3" fill="currentColor" className="text-boardtree-accent" />
      <rect x="108" y="38" width="6" height="14" rx="3" fill="currentColor" className="text-boardtree-accent" />
      {is_sleeping ? (
        <>
          <path d="M63 46 Q68 50 73 46" fill="none" stroke="#1e2237" strokeWidth="2" strokeLinecap="round" />
          <path d="M87 46 Q92 50 97 46" fill="none" stroke="#1e2237" strokeWidth="2" strokeLinecap="round" />
          <text x="112" y="24" fontSize="14" fill="currentColor" className="text-boardtree-text-muted">z</text>
          <text x="122" y="12" fontSize="18" fill="currentColor" className="text-boardtree-text-muted">Z</text>
        </>
      ) : (
        <>
          <circle cx="68" cy="45" r="3" fill="#1e2237" />
          <circle cx="92" cy="45" r="3" fill="#1e2237" />
          <path d="M70 56 Q80 63 90 56" fill="none" stroke="#1e2237" strokeWidth="2" strokeLinecap="round" />
          <circle cx="132" cy="30" r="7" fill="none" stroke="currentColor" strokeWidth="4" className="text-boardtree-accent" />
          <circle cx="140" cy="66" r="5" fill="#fdab3d" />
        </>
      )}
    </svg>
  );
}

export type ManageEmptyStateProps = {
  title: string;
  description: string;
  is_sleeping?: boolean;
  /** The call to action under the text, usually a button. */
  children?: React.ReactNode;
};

/** The centered illustration, headline and call to action shown when a Manage tab has nothing to list. */
export function ManageEmptyState({ title, description, is_sleeping = false, children }: ManageEmptyStateProps) {
  return (
    <div className="flex flex-col items-center px-4 py-14 text-center">
      <RobotIllustration is_sleeping={is_sleeping} />
      <h3 className="mt-5 max-w-[360px] text-[22px] font-bold leading-tight text-boardtree-text">{title}</h3>
      <p className="mt-3 max-w-[380px] text-[14px] leading-relaxed text-boardtree-text-secondary">{description}</p>
      {children && <div className="mt-5">{children}</div>}
    </div>
  );
}

/** Error message at the top of a tab, with a dismiss (or retry) button. */
export function InlineAlert({ message, onDismiss, action_label = "Dismiss" }: { message: string; onDismiss: () => void; action_label?: string }) {
  return (
    <div role="alert" className="mb-3 flex items-start justify-between gap-3 rounded-[8px] border border-boardtree-danger/30 bg-boardtree-danger-hover px-3 py-2 text-[12.5px] text-boardtree-danger">
      <span>{message}</span>
      <button type="button" onClick={onDismiss} className="flex-none text-[12px] font-medium opacity-70 hover:opacity-100">{action_label}</button>
    </div>
  );
}
