"use client";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, ChevronRight, CircleUserRound, Clock, History, ListFilter, RefreshCw, Zap } from "lucide-react";
import { boardContentService } from "@/services/board-content.service";
import type { BoardItemActivityDto } from "@/types/board-content";
import { formatRelativeTime } from "../drawer/commentMapping";
import PersonAvatar from "../PersonAvatar";
import AnchoredMenu, { type AnchoredMenuItem } from "@/components/ui/dropdown/AnchoredMenu";
import type { BoardCellOption } from "../cells/BoardValueCell";
import { GroupFieldIcon, KanbanColumnIcon } from "./kanbanColumnIcons";

export type KanbanItemActivityPanelProps = {
  board_id: number;
  item_id: string;
  /** Changes whenever the item itself changes, so the log reloads after an edit made in the card. */
  refresh_key: string;
  /** The board's columns, so a status change can be drawn in its label colors. */
  columns: Array<{ id: string; options?: BoardCellOption[] }>;
  /** Group colors by group name, for "Moved" entries. */
  group_colors: Record<string, string>;
};

const COLORED_COLUMN_TYPES = new Set(["status", "label"]);
const FIELD_TYPE_GROUP = "item_group";
const FIELD_TYPE_NAME = "item_name";
/** Waits for a burst of edits to settle before reloading the log. */
const REFRESH_DEBOUNCE_MS = 600;

const getInitials = (full_name: string): string =>
  full_name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

type ActivityFilter = { kind: "all" } | { kind: "column"; key: string; label: string } | { kind: "person"; id: number; label: string };

/** A column change is filtered by its column, a rename or group move by its field type. */
const columnKeyOf = (entry: BoardItemActivityDto): string => (entry.column_id != null ? `column:${entry.column_id}` : `field:${entry.column_type}`);

/**
 * The item card's "Activity Log" tab, a monday.com style list of every change
 * made to the item: when, who, which field, and the value before and after.
 * Status and label changes are drawn as colored chips in the column's current
 * label colors. Reads `GET /api/boards/{id}/items/{item_id}/activity`.
 */
function KanbanItemActivityPanel({ board_id, item_id, refresh_key, columns, group_colors }: KanbanItemActivityPanelProps) {
  const [entries, setEntries] = useState<BoardItemActivityDto[]>([]);
  const [page, setPage] = useState(1);
  const [last_page, setLastPage] = useState(1);
  const [is_loading, setIsLoading] = useState(true);
  const [load_error, setLoadError] = useState<string | null>(null);
  const [filter, setFilter] = useState<ActivityFilter>({ kind: "all" });
  const [filter_anchor_el, setFilterAnchorEl] = useState<HTMLElement | null>(null);
  const request_id_ref = useRef(0);

  const loadPage = useCallback(
    async (next_page: number) => {
      const request_id = ++request_id_ref.current;
      setIsLoading(true);
      setLoadError(null);
      try {
        const response = await boardContentService.getItemActivity(board_id, Number(item_id), next_page);
        if (request_id !== request_id_ref.current) return;
        setEntries((current) => (next_page === 1 ? response.data : [...current, ...response.data]));
        setPage(response.meta.current_page);
        setLastPage(response.meta.last_page);
      } catch {
        if (request_id === request_id_ref.current) setLoadError("Couldn't load the activity log. Please try again.");
      } finally {
        if (request_id === request_id_ref.current) setIsLoading(false);
      }
    },
    [board_id, item_id]
  );

  // A different item starts from a clean slate.
  useEffect(() => {
    setEntries([]);
    setFilter({ kind: "all" });
    void loadPage(1);
  }, [loadPage]);

  // Reloads once the item settles after an edit made in the card.
  const is_first_refresh_ref = useRef(true);
  useEffect(() => {
    if (is_first_refresh_ref.current) {
      is_first_refresh_ref.current = false;
      return;
    }
    const timeout_id = setTimeout(() => void loadPage(1), REFRESH_DEBOUNCE_MS);
    return () => clearTimeout(timeout_id);
  }, [refresh_key, loadPage]);

  const options_by_column = useMemo(() => {
    const map = new Map<string, BoardCellOption[]>();
    for (const column of columns) if (column.options) map.set(column.id, column.options);
    return map;
  }, [columns]);

  const filter_choices = useMemo(() => {
    const column_choices = new Map<string, { label: string; type: string }>();
    const person_choices = new Map<number, string>();
    for (const entry of entries) {
      column_choices.set(columnKeyOf(entry), { label: entry.column_label, type: entry.column_type });
      if (entry.user && !entry.automation) person_choices.set(entry.user.id, entry.user.full_name);
    }
    return {
      columns: Array.from(column_choices, ([key, choice]) => ({ key, ...choice })),
      people: Array.from(person_choices, ([id, label]) => ({ id, label })),
    };
  }, [entries]);

  const visible_entries = entries.filter((entry) => {
    if (filter.kind === "column") return columnKeyOf(entry) === filter.key;
    if (filter.kind === "person") return entry.user?.id === filter.id && !entry.automation;
    return true;
  });

  const chipColorFor = (entry: BoardItemActivityDto, display: string | null): string | null => {
    if (!display) return null;
    if (entry.column_type === FIELD_TYPE_GROUP) return null;
    if (!COLORED_COLUMN_TYPES.has(entry.column_type) || entry.column_id == null) return null;
    return options_by_column.get(String(entry.column_id))?.find((option) => option.label === display)?.color ?? "#c4c4c4";
  };

  const renderChip = (entry: BoardItemActivityDto, display: string | null) => {
    if (!display) {
      return (
        <span className="kanban-item-modal__activity-chip" data-empty>
          Empty
        </span>
      );
    }
    const color = chipColorFor(entry, display);
    if (entry.column_type === FIELD_TYPE_GROUP) {
      return (
        <span className="kanban-item-modal__activity-chip" title={display} style={{ color: group_colors[display] ?? undefined }}>
          {display}
        </span>
      );
    }
    return (
      <span
        className="kanban-item-modal__activity-chip"
        data-filled={color ? true : undefined}
        title={display}
        style={color ? { background: color } : undefined}
      >
        {display}
      </span>
    );
  };

  const is_filtering = filter.kind !== "all";

  const filter_menu_items: AnchoredMenuItem[] = [
    { key: "all", label: "All activity", icon: <History size={14} />, onClick: () => setFilter({ kind: "all" }) },
    ...(filter_choices.columns.length > 0
      ? [
          {
            key: "column",
            label: "Column",
            icon: <ListFilter size={14} />,
            onClick: () => {},
            trailing: <ChevronRight size={12} />,
            submenu: filter_choices.columns.map((choice) => ({
              key: choice.key,
              label: choice.label,
              icon: choice.type === FIELD_TYPE_GROUP ? <GroupFieldIcon size={14} /> : <KanbanColumnIcon kind={choice.type === FIELD_TYPE_NAME ? "text" : choice.type} size={14} />,
              onClick: () => setFilter({ kind: "column", key: choice.key, label: choice.label }),
            })),
          },
        ]
      : []),
    ...(filter_choices.people.length > 0
      ? [
          {
            key: "person",
            label: "Person",
            icon: <CircleUserRound size={14} />,
            onClick: () => {},
            trailing: <ChevronRight size={12} />,
            submenu: filter_choices.people.map((choice) => ({
              key: `person-${choice.id}`,
              label: choice.label,
              icon: <CircleUserRound size={14} />,
              onClick: () => setFilter({ kind: "person", id: choice.id, label: choice.label }),
            })),
          },
        ]
      : []),
  ];

  return (
    <div className="kanban-item-modal__activity">
      <div className="kanban-item-modal__activity-toolbar">
        <button
          type="button"
          className="kanban-item-modal__activity-filter"
          data-active={is_filtering || undefined}
          aria-haspopup="menu"
          aria-expanded={filter_anchor_el !== null}
          onClick={(event) => setFilterAnchorEl(event.currentTarget)}
        >
          {filter.kind === "all" ? "Filter log" : filter.label}
        </button>
        {is_filtering && (
          <button type="button" className="kanban-item-modal__activity-filter" onClick={() => setFilter({ kind: "all" })}>
            Clear filter
          </button>
        )}
        <button
          type="button"
          onClick={() => void loadPage(1)}
          className="kanban-item-modal__icon-button ml-auto"
          aria-label="Refresh activity log"
          title="Refresh"
        >
          <RefreshCw size={15} strokeWidth={1.75} className={is_loading ? "animate-spin" : undefined} />
        </button>

        <AnchoredMenu
          anchor_el={filter_anchor_el}
          is_open={filter_anchor_el !== null}
          onClose={() => setFilterAnchorEl(null)}
          align="start"
          width={220}
          items={filter_menu_items}
        />
      </div>

      {load_error && (
        <div className="kanban-item-modal__feedback" data-tone="error" role="alert">
          {load_error}
        </div>
      )}

      {!is_loading && !load_error && visible_entries.length === 0 ? (
        <div className="kanban-item-modal__empty">
          <span className="kanban-item-modal__empty-title">{is_filtering ? "Nothing matches this filter" : "No activity yet"}</span>
          <span>{is_filtering ? "Try another column or person." : "Changes to this item's fields will show up here."}</span>
        </div>
      ) : (
        <div className="kanban-item-modal__activity-list shell-scrollbar">
          {visible_entries.map((entry) => {
            const actor_name = entry.automation ? `Automation: ${entry.automation.name}` : entry.user?.full_name ?? "Someone";
            return (
              <div key={entry.id} className="kanban-item-modal__activity-row">
                <span className="kanban-item-modal__activity-time" title={new Date(entry.created_at).toLocaleString("en-US")}>
                  <Clock size={13} strokeWidth={1.75} aria-hidden="true" />
                  {formatRelativeTime(entry.created_at)}
                </span>
                <span title={actor_name}>
                  {entry.automation ? (
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#fdab3d] text-white">
                      <Zap size={13} aria-hidden="true" />
                    </span>
                  ) : (
                    <PersonAvatar
                      person={{
                        id: String(entry.user?.id ?? 0),
                        name: actor_name,
                        initials: getInitials(actor_name),
                        avatar_seed: entry.user?.id ?? 0,
                        avatar_url: entry.user?.profile_photo_url ?? undefined,
                        is_deactivated: entry.user?.is_deactivated,
                      }}
                      size={24}
                    />
                  )}
                </span>
                <span className="kanban-item-modal__activity-what">
                  {entry.column_type === FIELD_TYPE_GROUP ? (
                    <GroupFieldIcon size={15} strokeWidth={1.75} aria-hidden="true" />
                  ) : (
                    <KanbanColumnIcon kind={entry.column_type === FIELD_TYPE_NAME ? "text" : entry.column_type} size={15} />
                  )}
                  <span title={entry.column_label}>{entry.column_type === FIELD_TYPE_GROUP ? "Moved" : entry.column_label}</span>
                </span>
                <span className="kanban-item-modal__activity-change">
                  {renderChip(entry, entry.old_display)}
                  <ArrowRight size={14} className="kanban-item-modal__activity-arrow" aria-hidden="true" />
                  {renderChip(entry, entry.new_display)}
                </span>
              </div>
            );
          })}
          {page < last_page && !is_filtering && (
            <button type="button" className="kanban-item-modal__load-more" disabled={is_loading} onClick={() => void loadPage(page + 1)}>
              {is_loading ? "Loading..." : "Load older activity"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default KanbanItemActivityPanel;
