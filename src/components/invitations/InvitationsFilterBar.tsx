"use client";

import React, { useEffect, useRef } from "react";
import flatpickr from "flatpickr";
import "flatpickr/dist/flatpickr.min.css";
import type { Instance as FlatpickrInstance } from "flatpickr/dist/types/instance";
import type { SortDirection, WorkspaceInvitationSortField, WorkspaceMembershipRole } from "@/types/invitation";
import PortalTooltip from "@/components/ui/tooltip/PortalTooltip";
import { CloseIcon, MemberIcon, SortArrowsIcon } from "@/icons/workspace-icons";
import { InvitationResultCount, InvitationSearchInput, InvitationSelect } from "./InvitationParts";

// ── Date picker input ──────────────────────────────────────────────────────

type DatePickerInputProps = {
  value: string;
  placeholder: string;
  tooltip: string;
  max_date?: string;
  min_date?: string;
  on_change: (value: string) => void;
};

const CalendarGlyph = () => (
  <svg width={14} height={14} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 9v7.5"
    />
  </svg>
);

function DatePickerInput({ value, placeholder, tooltip, max_date, min_date, on_change }: DatePickerInputProps) {
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
    if (value) fp_ref.current.setDate(value, false);
    else fp_ref.current.clear(false);
  }, [value]);

  useEffect(() => {
    fp_ref.current?.set("maxDate", max_date || undefined);
  }, [max_date]);

  useEffect(() => {
    fp_ref.current?.set("minDate", min_date || undefined);
  }, [min_date]);

  return (
    <PortalTooltip content={tooltip}>
      <span className="inv-field">
        <span className="inv-field-icon">
          <CalendarGlyph />
        </span>
        <input
          ref={input_ref}
          readOnly
          aria-label={tooltip}
          placeholder={placeholder}
          data-active={value ? "true" : undefined}
          className="inv-input inv-date-input"
        />
      </span>
    </PortalTooltip>
  );
}

// ── Static options ──────────────────────────────────────────────────────────

const ROLE_OPTIONS: ReadonlyArray<{ value: WorkspaceMembershipRole | ""; label: string }> = [
  { value: "", label: "All roles" },
  { value: "owner", label: "Owner" },
  { value: "member", label: "Member" },
  { value: "viewer", label: "Viewer" },
];

const SORT_FIELD_OPTIONS: ReadonlyArray<{ value: WorkspaceInvitationSortField; label: string }> = [
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
 * Toolbar on top of the workspace "Sent invitations" list: email search, role filter, sort
 * field and direction, and an "invited between" date range. The status filter lives in the
 * summary cards above the card.
 */
const InvitationsFilterBar: React.FC<InvitationsFilterBarProps> = ({
  search_value,
  on_search_change,
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
  const direction_label = sort_direction === "asc" ? "Ascending, click to sort descending" : "Descending, click to sort ascending";

  return (
    <div className="inv-toolbar">
      <InvitationSearchInput
        value={search_value}
        onChange={on_search_change}
        placeholder="Search by email address"
        is_searching={is_loading}
      />

      <InvitationSelect
        value={role_filter}
        onChange={on_role_change}
        options={ROLE_OPTIONS}
        label="Filter by role"
        is_active={role_filter !== ""}
        icon={<MemberIcon size={14} />}
      />

      <span className="inv-toolbar-divider" aria-hidden />

      <InvitationSelect
        value={sort_field}
        onChange={(field) => on_sort_change(field, sort_direction)}
        options={SORT_FIELD_OPTIONS}
        label="Sort by"
        icon={<SortArrowsIcon size={14} />}
      />
      <PortalTooltip content={direction_label}>
        <button
          type="button"
          aria-label={direction_label}
          onClick={() => on_sort_change(sort_field, sort_direction === "asc" ? "desc" : "asc")}
          className="inv-icon-button"
        >
          <svg width={15} height={15} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
            {sort_direction === "asc" ? (
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 4.5h14.25M3 9h9.75M3 13.5h5.25m5.25-.75L17.25 9m0 0L21 12.75M17.25 9v12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 4.5h14.25M3 9h9.75M3 13.5h9.75m4.5-4.5v12m0 0l-3.75-3.75M17.25 21l3.75-3.75" />
            )}
          </svg>
        </button>
      </PortalTooltip>

      <span className="inv-toolbar-divider" aria-hidden />

      <span className="flex items-center gap-1.5">
        <DatePickerInput
          value={date_from}
          placeholder="From"
          tooltip="Invited on or after"
          max_date={date_to || undefined}
          on_change={(value) => on_date_range_change(value, date_to)}
        />
        <span className="inv-muted text-[13px]">to</span>
        <DatePickerInput
          value={date_to}
          placeholder="To"
          tooltip="Invited on or before"
          min_date={date_from || undefined}
          on_change={(value) => on_date_range_change(date_from, value)}
        />
        {has_date_range ? (
          <PortalTooltip content="Clear date range">
            <button
              type="button"
              aria-label="Clear date range"
              onClick={() => on_date_range_change("", "")}
              className="inv-icon-button"
            >
              <CloseIcon size={12} />
            </button>
          </PortalTooltip>
        ) : null}
      </span>

      <span className="inv-toolbar-end">
        {has_active_filters ? (
          <button type="button" onClick={on_clear_all} className="inv-button inv-button-ghost">
            Clear filters
          </button>
        ) : null}
        <InvitationResultCount total={total} is_loading={is_loading} />
      </span>
    </div>
  );
};

export default InvitationsFilterBar;
