"use client";
import React, { useEffect, useRef, useState } from "react";
import PortalTooltip from "@/components/ui/tooltip/PortalTooltip";
import { CheckIcon, ChevronDownIcon, ClockIcon, CloseIcon, DuplicateIcon, SearchIcon } from "@/icons/workspace-icons";
import "./invitations.scss";
import InvitationAvatar from "./InvitationAvatar";
import InvitationStatusBadge from "./InvitationStatusBadge";
import {
  describeInvitationExpiry,
  formatInvitationDate,
  formatInvitationDateTime,
  formatRelative,
  type InvitationStatusValue,
} from "./invitationFormat";

/*
 * Small presentational pieces shared by the workspace "Sent invitations" page and
 * Administration > Invitations, so both lists look and behave the same.
 */

// ── Person and inviter cells ───────────────────────────────────────────────

export type InvitationPersonProps = {
  email: string;
  /** "Sent Oct 3, 2026" style line under the email. */
  meta?: React.ReactNode;
};

/** Avatar plus the invited email; the full address shows in a tooltip when it is truncated. */
export const InvitationPerson: React.FC<InvitationPersonProps> = ({ email, meta }) => (
  <div className="inv-person">
    <InvitationAvatar email={email} />
    <span className="min-w-0">
      <PortalTooltip content={email} className="max-w-full">
        <span className="inv-person-email">{email}</span>
      </PortalTooltip>
      {meta ? <span className="inv-person-meta">{meta}</span> : null}
    </span>
  </div>
);

export type InvitationInviterProps = {
  inviter: { id: number; full_name: string; profile_photo_url: string | null } | null | undefined;
};

/** Who sent the invitation, with a small avatar. */
export const InvitationInviter: React.FC<InvitationInviterProps> = ({ inviter }) =>
  inviter ? (
    <PortalTooltip content={`Invited by ${inviter.full_name}`} className="max-w-full">
      <span className="inv-inviter">
        <InvitationAvatar email={`user-${inviter.id}`} full_name={inviter.full_name} photo_url={inviter.profile_photo_url} size={24} />
        <span>{inviter.full_name}</span>
      </span>
    </PortalTooltip>
  ) : (
    <span className="inv-muted">Unknown</span>
  );

/** "Oct 3, 2026" with "3 days ago" underneath and the exact time in a tooltip. */
export const InvitationSentDate: React.FC<{ iso: string | null | undefined }> = ({ iso }) =>
  iso ? (
    <PortalTooltip content={formatInvitationDateTime(iso)}>
      <span>
        <span className="inv-date">{formatInvitationDate(iso)}</span>
        <span className="inv-person-meta">{formatRelative(iso)}</span>
      </span>
    </PortalTooltip>
  ) : (
    <span className="inv-muted">None</span>
  );

// ── Status ─────────────────────────────────────────────────────────────────

export type InvitationStatusCellProps = {
  status: InvitationStatusValue;
  expires_at: string | null | undefined;
  accepted_at: string | null | undefined;
};

/** Status pill plus "Expires in 3 days" / "Expired 2 days ago" / "Joined yesterday". */
export const InvitationStatusCell: React.FC<InvitationStatusCellProps> = ({ status, expires_at, accepted_at }) => {
  const expiry = describeInvitationExpiry(status, expires_at, accepted_at);
  return (
    <div className="inv-status-stack">
      <InvitationStatusBadge status={status} />
      {expiry ? (
        <PortalTooltip content={expiry.tooltip}>
          <span className="inv-expiry" data-tone={expiry.tone}>
            <ClockIcon size={11} />
            {expiry.label}
          </span>
        </PortalTooltip>
      ) : null}
    </div>
  );
};

// ── Actions ────────────────────────────────────────────────────────────────

export type InvitationIconButtonProps = {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
  variant?: "default" | "danger" | "success";
  disabled?: boolean;
  is_busy?: boolean;
};

/** Square icon button with a tooltip; the label doubles as its accessible name. */
export const InvitationIconButton: React.FC<InvitationIconButtonProps> = ({
  label,
  onClick,
  children,
  variant = "default",
  disabled = false,
  is_busy = false,
}) => (
  <PortalTooltip content={label}>
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled || is_busy}
      data-variant={variant}
      className="inv-icon-button"
    >
      {is_busy ? <span className="inv-spinner" aria-hidden /> : children}
    </button>
  </PortalTooltip>
);

/** How long the "Copied" check stays before the button goes back to its copy icon. */
const COPIED_RESET_MS = 1600;

/** Copies the invited email; the tooltip turns into "Copied" for a moment. */
export const InvitationCopyEmailButton: React.FC<{ email: string }> = ({ email }) => {
  const [is_copied, setIsCopied] = useState(false);
  const timeout_ref = useRef<number | null>(null);

  useEffect(() => () => {
    if (timeout_ref.current) window.clearTimeout(timeout_ref.current);
  }, []);

  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(email);
      setIsCopied(true);
      if (timeout_ref.current) window.clearTimeout(timeout_ref.current);
      timeout_ref.current = window.setTimeout(() => setIsCopied(false), COPIED_RESET_MS);
    } catch {
      setIsCopied(false);
    }
  };

  return (
    <InvitationIconButton
      key={is_copied ? "copied" : "copy"}
      label={is_copied ? "Copied" : "Copy email"}
      onClick={() => void copyEmail()}
      variant={is_copied ? "success" : "default"}
    >
      {is_copied ? <CheckIcon size={15} /> : <DuplicateIcon size={15} />}
    </InvitationIconButton>
  );
};

// ── Toolbar inputs ─────────────────────────────────────────────────────────

export type InvitationSearchInputProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  is_searching?: boolean;
};

/** Search box with a spinner while a debounced search is loading and a clear button. */
export const InvitationSearchInput: React.FC<InvitationSearchInputProps> = ({ value, onChange, placeholder, is_searching }) => (
  <label className="inv-field inv-search">
    <span className="inv-field-icon">
      {is_searching && value ? <span className="inv-spinner" aria-hidden /> : <SearchIcon size={15} />}
    </span>
    <input
      type="search"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      aria-label={placeholder}
      className="inv-input"
    />
    {value ? (
      <PortalTooltip content="Clear search" className="inv-search-clear-wrap">
        <button type="button" onClick={() => onChange("")} aria-label="Clear search" className="inv-search-clear">
          <CloseIcon size={12} />
        </button>
      </PortalTooltip>
    ) : null}
  </label>
);

export type InvitationSelectProps<Value extends string> = {
  value: Value;
  onChange: (value: Value) => void;
  options: ReadonlyArray<{ value: Value; label: string }>;
  icon: React.ReactNode;
  /** Accessible name and tooltip. */
  label: string;
  /** Highlights the control when it narrows the list. */
  is_active?: boolean;
};

/** Native select (keyboard and screen reader friendly) dressed in the toolbar style. */
export function InvitationSelect<Value extends string>({
  value,
  onChange,
  options,
  icon,
  label,
  is_active,
}: InvitationSelectProps<Value>) {
  return (
    <PortalTooltip content={label}>
      <span className="inv-field">
        <span className="inv-field-icon">{icon}</span>
        <select
          value={value}
          aria-label={label}
          onChange={(event) => onChange(event.target.value as Value)}
          data-active={is_active ? "true" : undefined}
          className="inv-select"
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <span className="inv-field-trailing">
          <ChevronDownIcon size={12} />
        </span>
      </span>
    </PortalTooltip>
  );
}

/** "12 results" next to the search box, a shimmer while loading. */
export const InvitationResultCount: React.FC<{ total: number; is_loading: boolean }> = ({ total, is_loading }) =>
  is_loading ? (
    <span className="inv-skeleton" style={{ width: 72 }} />
  ) : (
    <span className="inv-result-count" aria-live="polite">
      <strong>{total}</strong> {total === 1 ? "invitation" : "invitations"}
    </span>
  );

// ── List states ────────────────────────────────────────────────────────────

/** Placeholder rows matching the list's grid while the first page loads. */
export const InvitationSkeletonRows: React.FC<{ columns: number; rows?: number }> = ({ columns, rows = 5 }) => (
  <>
    {Array.from({ length: rows }).map((_, row_index) => (
      <div key={row_index} className="inv-row" aria-hidden>
        <div className="inv-person">
          <span className="inv-skeleton inv-skeleton-circle" />
          <span className="flex-1 space-y-1.5">
            <span className="inv-skeleton" style={{ width: "70%" }} />
            <span className="inv-skeleton" style={{ width: "40%", height: 10 }} />
          </span>
        </div>
        {Array.from({ length: columns - 1 }).map((__, column_index) => (
          <span key={column_index} className="inv-skeleton" style={{ width: `${50 + ((row_index + column_index) % 3) * 15}%` }} />
        ))}
      </div>
    ))}
  </>
);

export type InvitationsEmptyStateProps = {
  title: string;
  detail: string;
  icon: React.ReactNode;
  actions?: React.ReactNode;
};

/** Centered icon, title, explanation and optional buttons for an empty or filtered out list. */
export const InvitationsEmptyState: React.FC<InvitationsEmptyStateProps> = ({ title, detail, icon, actions }) => (
  <div className="inv-empty">
    <span className="inv-empty-icon">{icon}</span>
    <p className="inv-empty-title">{title}</p>
    <p className="inv-empty-detail">{detail}</p>
    {actions ? <div className="inv-empty-actions">{actions}</div> : null}
  </div>
);

export type InvitationsPagerProps = {
  page: number;
  last_page: number;
  total: number;
  per_page: number;
  onPageChange: (page: number) => void;
};

/** "21 to 40 of 57" with previous and next buttons, hidden when everything fits on one page. */
export const InvitationsPager: React.FC<InvitationsPagerProps> = ({ page, last_page, total, per_page, onPageChange }) => {
  if (last_page <= 1) return null;
  const range_start = (page - 1) * per_page + 1;
  const range_end = Math.min(page * per_page, total);

  return (
    <div className="inv-pager">
      <span>
        {range_start} to {range_end} of {total}
      </span>
      <div className="inv-pager-buttons">
        <PortalTooltip content="Previous page">
          <button
            type="button"
            aria-label="Previous page"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            className="inv-icon-button"
          >
            <ChevronDownIcon size={14} className="rotate-90" />
          </button>
        </PortalTooltip>
        <span className="inv-pager-page">
          Page {page} of {last_page}
        </span>
        <PortalTooltip content="Next page">
          <button
            type="button"
            aria-label="Next page"
            disabled={page >= last_page}
            onClick={() => onPageChange(page + 1)}
            className="inv-icon-button"
          >
            <ChevronDownIcon size={14} className="-rotate-90" />
          </button>
        </PortalTooltip>
      </div>
    </div>
  );
};
