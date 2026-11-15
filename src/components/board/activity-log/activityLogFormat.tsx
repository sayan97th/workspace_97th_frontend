import React from "react";
import {
  Archive,
  ArrowRightLeft,
  Bot,
  Columns3,
  Copy,
  LayoutDashboard,
  Layers,
  Lock,
  PenLine,
  PlusCircle,
  Repeat,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { GroupFieldIcon, KanbanColumnIcon } from "../kanban/kanbanColumnIcons";
import type { BoardActivityEntry, BoardActivityEventType, BoardActivityPeriod } from "@/types/board-activity-log";
import type { BoardOptionsPerson } from "@/types/board-options";
import type { BoardPersonOption } from "../toolbar/types";

/** monday's short log time: "now", "5m", "3h", "2d", "1M", "1y". */
export const formatLogTime = (iso: string): string => {
  const time = new Date(iso).getTime();
  if (Number.isNaN(time)) return "";
  const minutes = Math.floor((Date.now() - time) / 60000);
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}M`;
  return `${Math.floor(days / 365)}y`;
};

/** Full date for tooltips, for example "Nov 15, 2026, 3:40 PM". */
export const formatFullDate = (iso: string): string => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
};

/** Day heading of the log: "Today", "Yesterday" or "Monday, Nov 9". */
export const formatDayLabel = (iso: string): string => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const day = new Date(date);
  day.setHours(0, 0, 0, 0);
  const days_ago = Math.round((today.getTime() - day.getTime()) / 86400000);
  if (days_ago === 0) return "Today";
  if (days_ago === 1) return "Yesterday";
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    ...(date.getFullYear() !== today.getFullYear() ? { year: "numeric" } : {}),
  });
};

export const dayKeyOf = (iso: string): string => {
  const date = new Date(iso);
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
};

const getInitials = (full_name: string): string =>
  full_name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

/** The person shape `PersonAvatar` draws. */
export const toAvatarPerson = (person: BoardOptionsPerson | null, fallback_name = "Someone"): BoardPersonOption => ({
  id: String(person?.id ?? 0),
  name: person?.full_name ?? fallback_name,
  initials: person ? getInitials(person.full_name) : "?",
  avatar_seed: person?.id ?? 0,
  avatar_url: person?.profile_photo_url ?? undefined,
  is_deactivated: person?.is_deactivated ?? false,
});

type EventPresentation = { label: string; icon: React.ReactNode };

const ICON_SIZE = 15;

/** Label and icon of the "what" column of a board event. */
const BOARD_EVENTS: Record<string, EventPresentation> = {
  item_created: { label: "Created", icon: <PlusCircle size={ICON_SIZE} /> },
  item_duplicated: { label: "Duplicated", icon: <Copy size={ICON_SIZE} /> },
  item_recurred: { label: "Recurred", icon: <Repeat size={ICON_SIZE} /> },
  item_archived: { label: "Archived", icon: <Archive size={ICON_SIZE} /> },
  item_trashed: { label: "Deleted", icon: <Trash2 size={ICON_SIZE} /> },
  item_deleted: { label: "Deleted forever", icon: <Trash2 size={ICON_SIZE} /> },
  item_restored: { label: "Restored", icon: <RotateCcw size={ICON_SIZE} /> },
  item_moved: { label: "Moved to board", icon: <ArrowRightLeft size={ICON_SIZE} /> },
  group_created: { label: "Group created", icon: <Layers size={ICON_SIZE} /> },
  group_renamed: { label: "Group renamed", icon: <PenLine size={ICON_SIZE} /> },
  group_archived: { label: "Group archived", icon: <Archive size={ICON_SIZE} /> },
  group_restored: { label: "Group restored", icon: <RotateCcw size={ICON_SIZE} /> },
  group_deleted: { label: "Group deleted", icon: <Trash2 size={ICON_SIZE} /> },
  group_duplicated: { label: "Group duplicated", icon: <Copy size={ICON_SIZE} /> },
  column_created: { label: "Column added", icon: <Columns3 size={ICON_SIZE} /> },
  column_renamed: { label: "Column renamed", icon: <PenLine size={ICON_SIZE} /> },
  column_deleted: { label: "Column deleted", icon: <Trash2 size={ICON_SIZE} /> },
  column_duplicated: { label: "Column duplicated", icon: <Copy size={ICON_SIZE} /> },
  automation_ran: { label: "Automation", icon: <Bot size={ICON_SIZE} /> },
  permissions_changed: { label: "Board permissions", icon: <Lock size={ICON_SIZE} /> },
  created: { label: "Board created", icon: <LayoutDashboard size={ICON_SIZE} /> },
  renamed: { label: "Board renamed", icon: <PenLine size={ICON_SIZE} /> },
  type_changed: { label: "Board type", icon: <LayoutDashboard size={ICON_SIZE} /> },
  duplicated: { label: "Board duplicated", icon: <Copy size={ICON_SIZE} /> },
  archived: { label: "Board archived", icon: <Archive size={ICON_SIZE} /> },
  unarchived: { label: "Board restored", icon: <RotateCcw size={ICON_SIZE} /> },
  deleted: { label: "Board deleted", icon: <Trash2 size={ICON_SIZE} /> },
};

/** Label and icon of the "what" column: the column of a cell change, or the kind of board event. */
export const presentEvent = (entry: BoardActivityEntry): EventPresentation => {
  if (entry.action === "item_group_changed") return { label: "Moved", icon: <GroupFieldIcon size={ICON_SIZE} /> };
  if (entry.action === "item_renamed") return { label: "Name", icon: <PenLine size={ICON_SIZE} /> };
  if (entry.action === "value_changed") {
    return {
      label: entry.column?.label ?? "Column",
      icon: <KanbanColumnIcon kind={entry.column?.type ?? "text"} size={ICON_SIZE} />,
    };
  }
  return BOARD_EVENTS[entry.action] ?? { label: "Updated", icon: <LayoutDashboard size={ICON_SIZE} /> };
};

/** What the entry is about, shown in the name column: the item, otherwise the group, column or board. */
export const subjectOf = (entry: BoardActivityEntry): { name: string; color?: string | null; is_item: boolean } => {
  if (entry.item) return { name: entry.item.name, is_item: true };
  if (entry.action.startsWith("group_") && entry.group?.name) return { name: entry.group.name, color: entry.group.color, is_item: false };
  if (entry.action.startsWith("column_") && entry.column) return { name: entry.column.label, is_item: false };
  return { name: entry.board_name ?? "Board", is_item: false };
};

export const EVENT_TYPE_OPTIONS: Array<{ value: BoardActivityEventType; label: string }> = [
  { value: "column_values", label: "Column values" },
  { value: "item_name", label: "Item renamed" },
  { value: "item_moved", label: "Item moved" },
  { value: "item_created", label: "Item created" },
  { value: "item_archived", label: "Item archived" },
  { value: "item_deleted", label: "Item deleted" },
  { value: "item_restored", label: "Item restored" },
  { value: "groups", label: "Groups" },
  { value: "columns", label: "Columns" },
  { value: "board", label: "Board settings" },
  { value: "automations", label: "Automations" },
];

export const PERIOD_OPTIONS: Array<{ value: BoardActivityPeriod; label: string }> = [
  { value: "all", label: "All time" },
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "last_7_days", label: "Last 7 days" },
  { value: "last_30_days", label: "Last 30 days" },
];
