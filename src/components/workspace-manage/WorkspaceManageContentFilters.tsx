"use client";
import React, { useState } from "react";
import { BoardPopover } from "@/components/board";
import { CreatorAvatar } from "@/components/content";
import {
  BoardGridIcon,
  DashboardIcon,
  FileIcon,
  SearchIcon,
  WorkflowIcon,
  type IconComponent,
} from "@/icons/workspace-icons";
import { gradientForId, initialsFromName } from "./creatorAvatar";
import type {
  WorkspaceContentAssetType,
  WorkspaceContentCreator,
  WorkspaceContentFilters,
  WorkspaceContentLastModifiedBucket,
  WorkspaceContentMembership,
} from "@/types/workspace";

export type WorkspaceManageContentFiltersProps = {
  anchor_el: HTMLElement | null;
  is_open: boolean;
  onClose: () => void;
  filters: WorkspaceContentFilters;
  onChange: (filters: WorkspaceContentFilters) => void;
  /** Every creator behind the current user's accessible content, for the "Created by" list. */
  creators: WorkspaceContentCreator[];
};

const LAST_MODIFIED_OPTIONS: ReadonlyArray<{ value: WorkspaceContentLastModifiedBucket; label: string }> = [
  { value: "1m", label: "1+ months ago" },
  { value: "3m", label: "3+ months ago" },
  { value: "6m", label: "6+ months ago" },
  { value: "1y", label: "1+ years ago" },
  { value: "2y", label: "2+ years ago" },
];

const ASSET_TYPE_OPTIONS: ReadonlyArray<{
  value: WorkspaceContentAssetType;
  label: string;
  Icon: IconComponent;
}> = [
  { value: "board", label: "Board", Icon: BoardGridIcon },
  { value: "dashboard", label: "Dashboard", Icon: DashboardIcon },
  { value: "doc", label: "Doc", Icon: FileIcon },
  { value: "workflow", label: "Workflow", Icon: WorkflowIcon },
];

const MEMBERSHIP_OPTIONS: ReadonlyArray<{ value: WorkspaceContentMembership; label: string }> = [
  { value: "owner", label: "Owner" },
  { value: "member", label: "Member" },
];

const EMPTY_FILTERS: WorkspaceContentFilters = {
  last_modified: [],
  asset_type: [],
  created_by: [],
  membership: [],
};

const toggleValue = <T,>(values: T[], value: T): T[] =>
  values.includes(value) ? values.filter((existing) => existing !== value) : [...values, value];

const chip_class = (is_active: boolean) =>
  `flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-[13px] font-medium transition-colors ${
    is_active
      ? "border-brand-500 bg-brand-25 text-brand-600"
      : "border-shell-border-strong text-shell-text-secondary hover:bg-shell-hover"
  }`;

/**
 * "Filter by" popover for Manage Workspace's Content tab, anchored to
 * {@link ContentToolbar}'s Filters button. Every facet is multi-select and
 * applied server-side by `GET /api/content`, since the table is paginated —
 * filtering only the loaded page (like the search box does) would silently
 * miss matches sitting on other pages.
 *
 * Built specifically for this tab rather than shared with Client Hub's board
 * filters: those filter typed board columns (Status, People, ...), while
 * this filters a fixed set of asset facets (last modified, type, creator,
 * membership) that only make sense for a cross-workspace content list.
 */
const WorkspaceManageContentFilters: React.FC<WorkspaceManageContentFiltersProps> = ({
  anchor_el,
  is_open,
  onClose,
  filters,
  onChange,
  creators,
}) => {
  const [creator_query, setCreatorQuery] = useState("");

  const has_active_filters =
    filters.last_modified.length > 0 ||
    filters.asset_type.length > 0 ||
    filters.created_by.length > 0 ||
    filters.membership.length > 0;

  const trimmed_query = creator_query.trim().toLowerCase();
  const visible_creators = trimmed_query
    ? creators.filter((creator) => creator.full_name.toLowerCase().includes(trimmed_query))
    : creators;

  const toggleLastModified = (value: WorkspaceContentLastModifiedBucket) =>
    onChange({ ...filters, last_modified: toggleValue(filters.last_modified, value) });

  const toggleAssetType = (value: WorkspaceContentAssetType) =>
    onChange({ ...filters, asset_type: toggleValue(filters.asset_type, value) });

  const toggleMembership = (value: WorkspaceContentMembership) =>
    onChange({ ...filters, membership: toggleValue(filters.membership, value) });

  const toggleCreator = (id: number) => onChange({ ...filters, created_by: toggleValue(filters.created_by, id) });

  const clearAll = () => onChange(EMPTY_FILTERS);

  return (
    <BoardPopover anchor_el={anchor_el} is_open={is_open} onClose={onClose} width={620} align="start">
      <div className="p-4">
        <div className="mb-3.5 flex items-center justify-between">
          <span className="text-[14px] font-bold text-shell-text">Filter by</span>
          {has_active_filters && (
            <button
              type="button"
              onClick={clearAll}
              className="text-[12.5px] font-medium text-shell-text-muted hover:text-shell-text"
            >
              Clear all
            </button>
          )}
        </div>

        <div className="grid grid-cols-4 gap-4">
          {/* Last modified */}
          <div className="flex min-w-0 flex-col gap-2">
            <span className="text-[11.5px] font-semibold tracking-[0.02em] text-shell-text-faint">
              Last modified
            </span>
            {LAST_MODIFIED_OPTIONS.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => toggleLastModified(value)}
                className={chip_class(filters.last_modified.includes(value))}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Asset type */}
          <div className="flex min-w-0 flex-col gap-2">
            <span className="text-[11.5px] font-semibold tracking-[0.02em] text-shell-text-faint">Asset type</span>
            {ASSET_TYPE_OPTIONS.map(({ value, label, Icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => toggleAssetType(value)}
                className={chip_class(filters.asset_type.includes(value))}
              >
                <Icon size={14} className="flex-none" />
                {label}
              </button>
            ))}
          </div>

          {/* Created by */}
          <div className="flex min-w-0 flex-col gap-2">
            <span className="text-[11.5px] font-semibold tracking-[0.02em] text-shell-text-faint">Created by</span>
            <label className="flex items-center gap-2 rounded-[9px] border border-shell-border-strong px-2.5 py-2">
              <span className="flex flex-none text-shell-text-faint">
                <SearchIcon size={13} />
              </span>
              <input
                type="text"
                value={creator_query}
                onChange={(event) => setCreatorQuery(event.target.value)}
                placeholder="Search"
                className="w-full min-w-0 border-none bg-transparent p-0 text-[13px] text-shell-text outline-none placeholder:text-shell-text-faint"
              />
            </label>
            <div className="shell-scrollbar flex max-h-[150px] flex-col gap-0.5 overflow-y-auto">
              {visible_creators.length === 0 ? (
                <div className="px-2 py-2 text-[12.5px] text-shell-text-faint">No matching people.</div>
              ) : (
                visible_creators.map((creator) => {
                  const is_active = filters.created_by.includes(creator.id);
                  const [gradient_from, gradient_to] = gradientForId(creator.id);
                  return (
                    <button
                      key={creator.id}
                      type="button"
                      onClick={() => toggleCreator(creator.id)}
                      className={`flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors ${
                        is_active ? "bg-brand-25" : "hover:bg-shell-hover"
                      }`}
                    >
                      <CreatorAvatar
                        initials={initialsFromName(creator.full_name)}
                        gradient_from={gradient_from}
                        gradient_to={gradient_to}
                        photo_url={creator.profile_photo_url}
                        size={26}
                      />
                      <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-shell-text">
                        {creator.full_name}
                      </span>
                      <span className="flex-none text-[11.5px] font-semibold text-shell-text-faint">
                        {creator.content_count}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Membership */}
          <div className="flex min-w-0 flex-col gap-2">
            <span className="text-[11.5px] font-semibold tracking-[0.02em] text-shell-text-faint">Membership</span>
            {MEMBERSHIP_OPTIONS.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => toggleMembership(value)}
                className={chip_class(filters.membership.includes(value))}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </BoardPopover>
  );
};

export default WorkspaceManageContentFilters;
