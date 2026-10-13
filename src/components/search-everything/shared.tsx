"use client";

import React from "react";
import { formatDistanceToNow } from "date-fns";
import { BOARD_ROUTE_BASE, buildBoardPath } from "@/components/workspace-nav/helpers";
import WorkspaceBadge from "@/layout/WorkspaceBadge";
import { BoardGridIcon, ClockIcon, DashboardIcon, FileIcon, LockIcon, ShareNodesIcon, WorkflowIcon, type IconComponent } from "@/icons/workspace-icons";
import type { SearchAssetType } from "@/types/search";
import type {
  FileKind,
  SearchEverythingBoard,
  SearchEverythingCountedTab,
  SearchEverythingItem,
  SearchEverythingTab,
  SearchEverythingWorkspace,
} from "@/types/search-everything";

export const TAB_LABELS: Record<SearchEverythingTab, string> = {
  all: "All",
  boards: "Cross Boards",
  updates: "Updates",
  files: "Files",
  people: "People",
  tags: "Tags",
  docs: "Docs",
};

export const TAB_ORDER: SearchEverythingTab[] = ["all", "boards", "updates", "files", "people", "tags", "docs"];

export const COUNTED_TABS: SearchEverythingCountedTab[] = ["boards", "updates", "files", "people", "tags", "docs"];

/** Where a click on a result goes, the dialog closes and the app navigates there. */
export type NavigateTo = (href: string) => void;

export const boardHref = (board: Pick<SearchEverythingBoard, "id">): string => buildBoardPath(board.id);

/** Opens the item's drawer on the tab it lives on, like the top bar search does. */
export const itemHref = (board: Pick<SearchEverythingBoard, "id">, item: SearchEverythingItem): string =>
  `${BOARD_ROUTE_BASE}/${board.id}/pulses/${item.id}${item.view_id ? `?view_id=${item.view_id}` : ""}`;

/** "about 15 hours ago", the relative time monday prints on every card. */
export const timeAgo = (iso: string | null): string => (iso ? formatDistanceToNow(new Date(iso), { addSuffix: true }) : "");

export const fullDate = (iso: string | null): string => (iso ? new Date(iso).toLocaleString() : "");

export function TimeAgo({ iso }: { iso: string | null }) {
  if (!iso) return null;
  return (
    <span className="inline-flex items-center gap-[3px]" title={fullDate(iso)}>
      <ClockIcon size={12} />
      {timeAgo(iso)}
    </span>
  );
}

/** Bolds every case-insensitive occurrence of `term` in `text`, a leading "#" in the term is ignored. */
export function Highlight({ text, term }: { text: string; term: string }) {
  const needle = term.replace(/^#/, "").trim().toLowerCase();
  if (needle.length < 2) return <>{text}</>;

  const parts: React.ReactNode[] = [];
  const haystack = text.toLowerCase();
  let cursor = 0;
  let index = haystack.indexOf(needle);
  while (index !== -1) {
    if (index > cursor) parts.push(text.slice(cursor, index));
    parts.push(
      <mark key={index} className="search-everything__mark">
        {text.slice(index, index + needle.length)}
      </mark>
    );
    cursor = index + needle.length;
    index = haystack.indexOf(needle, cursor);
  }
  if (cursor < text.length) parts.push(text.slice(cursor));

  return <>{parts}</>;
}

const ASSET_ICONS: Record<SearchAssetType, IconComponent> = {
  board: BoardGridIcon,
  doc: FileIcon,
  dashboard: DashboardIcon,
  workflow: WorkflowIcon,
};

/** The board (or doc) icon with the lock or share corner badge private and shareable boards get in the sidebar. */
export function BoardGlyph({ board, size = 20 }: { board: Pick<SearchEverythingBoard, "asset_type" | "board_type">; size?: number }) {
  const Icon = ASSET_ICONS[board.asset_type] ?? BoardGridIcon;
  const badge_size = Math.max(8, Math.round(size * 0.5));

  return (
    <span className="search-everything__board-icon" aria-hidden="true">
      <Icon size={size} />
      {board.board_type === "private" && (
        <span className="search-everything__board-lock">
          <LockIcon size={badge_size} />
        </span>
      )}
      {board.board_type === "shareable" && (
        <span className="search-everything__board-lock">
          <ShareNodesIcon size={badge_size} />
        </span>
      )}
    </span>
  );
}

/** "| [badge] Workspace", the breadcrumb after a board name. */
export function WorkspaceCrumb({ workspace }: { workspace: SearchEverythingWorkspace | null }) {
  if (!workspace) return null;
  return (
    <>
      <span className="search-everything__crumb-separator" aria-hidden="true">
        |
      </span>
      <span className="search-everything__crumb">
        <WorkspaceBadge
          workspace={{ mono: workspace.mono, color: workspace.color, avatar_url: workspace.avatar_url ?? undefined, is_home: false }}
          size={16}
          notchColor="var(--se-surface)"
        />
        {workspace.name}
      </span>
    </>
  );
}

/** Preview colors of the Files cards, the brand color of each file type. */
export const FILE_KIND_TINTS: Record<FileKind, string> = {
  image: "#5c5c5c",
  word: "#2b579a",
  powerpoint: "#c43e1c",
  excel: "#1d6f42",
  pdf: "#b30b00",
  zip: "#6d5f8a",
  music: "#9d50dd",
  video: "#323338",
  other: "#5c5c5c",
};

const FILE_KIND_MARKS: Record<FileKind, string> = {
  image: "IMG",
  word: "W",
  powerpoint: "P",
  excel: "X",
  pdf: "PDF",
  zip: "ZIP",
  music: "MP3",
  video: "MOV",
  other: "FILE",
};

/** White page outline with the file type initials, drawn on the colored preview of a Files card. */
export function FileKindGlyph({ kind, size = 52 }: { kind: FileKind; size?: number }) {
  const mark = FILE_KIND_MARKS[kind];
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <path d="M12 5 H29 L38 14 V41 A2 2 0 0 1 36 43 H12 A2 2 0 0 1 10 41 V7 A2 2 0 0 1 12 5 Z" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" />
      <path d="M29 5 V14 H38" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" />
      <text x="24" y="33" textAnchor="middle" fill="currentColor" fontSize={mark.length > 2 ? 9 : 14} fontWeight="700" fontFamily="inherit">
        {mark}
      </text>
    </svg>
  );
}
