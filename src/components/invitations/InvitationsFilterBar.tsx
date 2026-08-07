"use client";

import React, { useEffect, useRef } from "react";
import flatpickr from "flatpickr";
import "flatpickr/dist/flatpickr.min.css";
import type { Instance as FlatpickrInstance } from "flatpickr/dist/types/instance";
import type {
  SortDirection,
  WorkspaceInvitationSortField,
  WorkspaceInvitationStatus,
  WorkspaceMembershipRole,
} from "@/types/invitation";

// ── Date picker input ──────────────────────────────────────────────────────

type DatePickerInputProps = {
  value: string;
  placeholder: string;
  max_date?: string;
  min_date?: string;
  on_change: (value: string) => void;
  is_active?: boolean;
};

function DatePickerInput({ value, placeholder, max_date, min_date, on_change, is_active }: DatePickerInputProps) {
  const input_ref = useRef<HTMLInputElement>(null);
  const fp_ref = useRef<FlatpickrInstance | null>(null);
  const on_change_ref = useRef(on_change);
  on_change_ref.current = on_change;

  useEffect(() => {
    if (!input_ref.current) return;
    fp_ref.current = flatpickr(input_ref.current, {
      dateFormat: "Y-m-d",
      appendTo: document.body,
      disableMobile: true,
      maxDate: max_date || undefined,
      minDate: min_date || undefined,
      onChange: (_, date_str) => on_change_ref.current(date_str),
    });
    return () => {
      fp_ref.current?.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!fp_ref.current) return;
    value ? fp_ref.current.setDate(value, false) : fp_ref.current.clear(false);
  }, [value]);

  useEffect(() => {
    fp_ref.current?.set("maxDate", max_date || undefined);
  }, [max_date]);

  useEffect(() => {
    fp_ref.current?.set("minDate", min_date || undefined);
  }, [min_date]);

  return (
    <div className="relative">
      <span className="pointer-events-none absolute inset-y-0 left-2.5 flex items-center text-shell-text-muted">
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 9v7.5"
          />
        </svg>
      </span>
      <input
        ref={input_ref}
        readOnly
        placeholder={placeholder}
        className={`h-9 w-32 cursor-pointer rounded-lg border pl-8 pr-3 text-xs outline-none transition placeholder:text-shell-text-muted ${
          is_active
            ? "border-brand-400 bg-brand-500/10 text-brand-300"
            : "border-shell-border-strong bg-shell-panel-alt text-shell-text-secondary hover:border-shell-border-strong"
        }`}
      />
    </div>
  );
}

// ── Compact select ──────────────────────────────────────────────────────────

type CompactSelectProps = {
  value: string;
  on_change: (value: string) => void;
  options: { value: string; label: string }[];
  is_active?: boolean;
  icon: React.ReactNode;
};

function CompactSelect({ value, on_change, options, is_active, icon }: CompactSelectProps) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute inset-y-0 left-2.5 flex items-center text-shell-text-muted">{icon}</span>
      <select
        value={value}
        onChange={(event) => on_change(event.target.value)}
        className={`h-9 appearance-none rounded-lg border pl-8 pr-6 text-xs font-medium outline-none transition ${
          is_active
            ? "border-brand-400 bg-brand-500/10 text-brand-300"
            : "border-shell-border-strong bg-shell-panel-alt text-shell-text-secondary hover:border-shell-border-strong"
        }`}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-shell-text-muted">
        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </span>
    </div>
  );
}

// ── Static options ──────────────────────────────────────────────────────────

const STATUS_OPTIONS: Array<{ value: WorkspaceInvitationStatus | ""; label: string }> = [
  { value: "", label: "All statuses" },
  { value: "pending", label: "Pending" },
  { value: "accepted", label: "Accepted" },
  { value: "expired", label: "Expired" },
];

const ROLE_OPTIONS: Array<{ value: WorkspaceMembershipRole | ""; label: string }> = [
  { value: "", label: "All roles" },
  { value: "owner", label: "Owner" },
  { value: "member", label: "Member" },
  { value: "viewer", label: "Viewer" },
];

const SORT_FIELD_OPTIONS: Array<{ value: WorkspaceInvitationSortField; label: string }> = [
  { value: "created_at", label: "Invited date" },
  { value: "expires_at", label: "Expiry date" },
  { value: "email", label: "Email" },
  { value: "role", label: "Role" },
  { value: "status", label: "Status" },
];

// ── Props ────────────────────────────────────────────────────────────────────

export type InvitationsFilterBarProps = {
  search_value: string;
  on_search_change: (value: string) => void;
  status_filter: WorkspaceInvitationStatus | "";
  on_status_change: (status: WorkspaceInvitationStatus | "") => void;
  role_filter: WorkspaceMembershipRole | "";
  on_role_change: (role: WorkspaceMembershipRole | "") => void;
  sort_field: WorkspaceInvitationSortField;
  sort_direction: SortDirection;
  on_sort_change: (field: WorkspaceInvitationSortField, direction: SortDirection) => void;
  date_from: string;
  date_to: string;
  on_date_range_change: (date_from: string, date_to: string) => void;
  total: number;
  is_loading: boolean;
  has_active_filters: boolean;
  on_clear_all: () => void;
};

/**
 * Search + status/role/sort/date-range filter bar for the "Sent invitations"
 * table — ported structurally from `base_portal`'s
 * `InvitationFiltersBar`, restyled onto this app's `shell-*` design tokens
 * so it stays consistent (and theme-aware) with the rest of the workspace shell.
 */
const InvitationsFilterBar: React.FC<InvitationsFilterBarProps> = ({
  search_value,
  on_search_change,
  status_filter,
  on_status_change,
  role_filter,
  on_role_change,
  sort_field,
  sort_direction,
  on_sort_change,
  date_from,
  date_to,
  on_date_range_change,
  total,
  is_loading,
  has_active_filters,
  on_clear_all,
}) => {
  const has_date_range = date_from !== "" || date_to !== "";

  function toggleSortDirection() {
    on_sort_change(sort_field, sort_direction === "asc" ? "desc" : "asc");
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-shell-border bg-shell-panel">
      {/* Row 1 — Search */}
      <div className="flex items-center gap-3 border-b border-shell-border px-4 py-3">
        <div className="relative flex-1">
          <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center">
            {is_loading && search_value.length > 0 ? (
              <svg className="h-4 w-4 animate-spin text-brand-500" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              <svg className="h-4 w-4 text-shell-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
              </svg>
            )}
          </div>
          <input
            type="text"
            value={search_value}
            onChange={(event) => on_search_change(event.target.value)}
            placeholder="Search by email address…"
            className="w-full rounded-xl border border-shell-border-strong bg-shell-bg py-2.5 pl-9 pr-9 text-sm text-shell-text placeholder-shell-text-muted outline-none transition focus:border-brand-400"
          />
          {search_value.length > 0 && (
            <button
              type="button"
              onClick={() => on_search_change("")}
              className="absolute inset-y-0 right-3 flex items-center text-shell-text-muted transition hover:text-shell-text-secondary"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        <div className="hidden shrink-0 sm:block">
          {is_loading ? (
            <span className="inline-block h-3 w-20 animate-pulse rounded bg-shell-hover" />
          ) : (
            <span className="text-xs text-shell-text-faint">
              <span className="font-semibold text-shell-text-secondary">{total}</span> result{total !== 1 ? "s" : ""}
            </span>
          )}
        </div>
      </div>

      {/* Row 2 — Compact filters */}
      <div className="flex flex-wrap items-center gap-2 px-4 py-2.5">
        <CompactSelect
          value={status_filter}
          on_change={(value) => on_status_change(value as WorkspaceInvitationStatus | "")}
          options={STATUS_OPTIONS}
          is_active={status_filter !== ""}
          icon={
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />

        <CompactSelect
          value={role_filter}
          on_change={(value) => on_role_change(value as WorkspaceMembershipRole | "")}
          options={ROLE_OPTIONS}
          is_active={role_filter !== ""}
          icon={
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
              />
            </svg>
          }
        />

        <div className="h-5 w-px bg-shell-border-strong" />

        <div className="flex items-center gap-1.5">
          <CompactSelect
            value={sort_field}
            on_change={(value) => on_sort_change(value as WorkspaceInvitationSortField, sort_direction)}
            options={SORT_FIELD_OPTIONS}
            icon={
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 7h18M7 12h10M11 17h4" />
              </svg>
            }
          />
          <button
            type="button"
            onClick={toggleSortDirection}
            title={
              sort_direction === "asc"
                ? "Ascending — click to sort descending"
                : "Descending — click to sort ascending"
            }
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-shell-border-strong bg-shell-panel-alt text-shell-text-muted transition hover:text-shell-text-secondary"
          >
            {sort_direction === "asc" ? (
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 4.5h14.25M3 9h9.75M3 13.5h5.25m5.25-.75L17.25 9m0 0L21 12.75M17.25 9v12" />
              </svg>
            ) : (
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 4.5h14.25M3 9h9.75M3 13.5h9.75m4.5-4.5v12m0 0l-3.75-3.75M17.25 21l3.75-3.75" />
              </svg>
            )}
          </button>
        </div>

        <div className="h-5 w-px bg-shell-border-strong" />

        <div className="flex items-center gap-2">
          <DatePickerInput
            value={date_from}
            placeholder="From"
            max_date={date_to || undefined}
            on_change={(value) => on_date_range_change(value, date_to)}
            is_active={date_from !== ""}
          />
          <span className="text-xs text-shell-text-faint">→</span>
          <DatePickerInput
            value={date_to}
            placeholder="To"
            min_date={date_from || undefined}
            on_change={(value) => on_date_range_change(date_from, value)}
            is_active={date_to !== ""}
          />
          {has_date_range && (
            <button
              type="button"
              onClick={() => on_date_range_change("", "")}
              title="Clear date range"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-shell-border-strong text-shell-text-muted transition hover:text-shell-text-secondary"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {has_active_filters && (
          <>
            <div className="ml-auto" />
            <button
              type="button"
              onClick={on_clear_all}
              className="flex items-center gap-1.5 rounded-lg border border-shell-border-strong px-3 py-2 text-xs font-medium text-shell-text-muted transition hover:text-shell-text-secondary"
            >
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
              Clear
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default InvitationsFilterBar;
