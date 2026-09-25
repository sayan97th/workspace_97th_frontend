"use client";
import React, { useEffect, useRef, useState } from "react";
import { BoardLoadingSpinner, CenteredMessage } from "@/app/(admin)/boards/_components/BoardRouteStates";
import { WorkloadViewIcon } from "@/icons/board-icons";
import { COLUMN_KIND_SWATCH, type BoardColumnKind } from "../columnTypes";
import ColumnSwatchBadge from "../toolbar/ColumnSwatchBadge";
import InlineFieldMenu from "../toolbar/InlineFieldMenu";
import PersonAvatar from "../PersonAvatar";
import useBoardWorkload from "./useBoardWorkload";
import type { WorkloadBucketDto, WorkloadDataDto, WorkloadItem, WorkloadPickerOption, WorkloadRow } from "./types";
import { formatLoad, LOAD_LEVEL_STYLE, loadLevel, toPersonOption } from "./workloadUtils";

export type BoardWorkloadViewProps = {
  board_id: number;
  view_id: number;
  /** Whether the viewer may change settings and reassign items. */
  can_edit: boolean;
  /** Opens an item. It lives on the tab this view reads (`view_id`), not on the Workload tab itself. */
  onOpenItem?: (item_id: number, view_id: number | null) => void;
};

const PERSON_COLUMN_WIDTH = 240;
const ROW_HEIGHT = 48;
const ITEM_ROW_HEIGHT = 30;

type HoverCard = { row: WorkloadRow; bucket: WorkloadBucketDto; x: number; y: number };

const rowKey = (row: WorkloadRow) => String(row.person.id ?? "none");

/**
 * The "Workload" board view, monday.com style: one row per person in the
 * chosen People column and one column per day or week, each cell showing
 * how much work that person has then against their capacity. A row expands
 * to the items behind the numbers, and an item can be dragged onto another
 * person to reassign it. Reads another tab of the board, like a Chart tab.
 */
const BoardWorkloadView: React.FC<BoardWorkloadViewProps> = ({ board_id, view_id, can_edit, onOpenItem }) => {
  const workload = useBoardWorkload({ board_id, view_id });
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [hover_card, setHoverCard] = useState<HoverCard | null>(null);
  const [drop_row_key, setDropRowKey] = useState<string | null>(null);
  const drag_ref = useRef<{ item: WorkloadItem; from_person_id: number | null } | null>(null);

  if (workload.is_loading && !workload.data) return <BoardLoadingSpinner />;
  if (!workload.data) return <CenteredMessage title="Something went wrong" detail={workload.error ?? "Couldn't load the workload."} />;

  const { data } = workload;
  const rows = data.unassigned ? [...data.people, data.unassigned] : data.people;
  const effort_label = data.config.effort_column_id
    ? data.effort_columns.find((column) => column.id === data.config.effort_column_id)?.label ?? "Effort"
    : "Items";
  const grid_template = `${PERSON_COLUMN_WIDTH}px repeat(${data.buckets.length}, minmax(64px, 1fr))`;

  const handleDrop = (row: WorkloadRow) => {
    const dragged = drag_ref.current;
    drag_ref.current = null;
    setDropRowKey(null);
    if (!dragged || dragged.from_person_id === row.person.id) return;
    void workload.reassignItem(dragged.item, dragged.from_person_id, row.person.id);
  };

  return (
    <div className="flex flex-col gap-3" onMouseLeave={() => setHoverCard(null)}>
      {workload.error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-[12.5px] text-red-500">{workload.error}</div>
      )}

      <WorkloadSettings data={data} can_edit={can_edit} onChange={workload.updateConfig} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5">
          <button type="button" onClick={() => workload.showPrevious()} aria-label="Previous period" className="flex h-8 w-8 items-center justify-center rounded-md border border-shell-border text-shell-text-muted hover:bg-shell-hover">
            ‹
          </button>
          <button type="button" onClick={workload.showToday} className="h-8 rounded-md border border-shell-border px-3 text-[13px] text-shell-text hover:bg-shell-hover">
            Today
          </button>
          <button type="button" onClick={() => workload.showNext()} aria-label="Next period" className="flex h-8 w-8 items-center justify-center rounded-md border border-shell-border text-shell-text-muted hover:bg-shell-hover">
            ›
          </button>
          <span className="ml-2 text-[13px] font-medium text-shell-text">{formatRange(data.range.start, data.range.end)}</span>
          {(workload.is_saving || workload.is_loading) && <span className="ml-2 text-[12px] text-shell-text-faint">Updating…</span>}
        </div>
        <LoadLegend />
      </div>

      {!data.config.people_column_id || !data.config.date_column_id ? (
        <EmptyState
          title="Workload needs a People and a date column"
          detail="Add a People column and a Date or Timeline column to the table this view reads, then pick them above."
        />
      ) : rows.length === 0 ? (
        <EmptyState title="No scheduled work in this period" detail="Assign people and dates to items, or move to another period with the arrows above." />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-shell-border bg-shell-panel">
          <div role="grid" aria-label="Workload per person" className="min-w-max" style={{ display: "grid", gridTemplateColumns: grid_template }}>
            {/* Header row */}
            <div role="columnheader" className="sticky left-0 z-20 flex items-center border-b border-shell-border bg-shell-panel px-4 text-[12px] font-semibold uppercase tracking-wide text-shell-text-muted" style={{ height: 40 }}>
              Person · {effort_label}
            </div>
            {data.buckets.map((bucket) => (
              <div
                key={bucket.key}
                role="columnheader"
                className={`flex items-center justify-center border-b border-l border-shell-border text-[12px] ${
                  bucket.is_current ? "font-semibold text-shell-text" : "text-shell-text-muted"
                } ${bucket.is_weekend ? "bg-shell-hover/40" : ""}`}
                style={{ height: 40 }}
              >
                {bucket.label}
              </div>
            ))}

            {rows.map((row) => {
              const key = rowKey(row);
              const is_open = !!expanded[key];
              const is_drop_target = drop_row_key === key;
              const drop_props = can_edit
                ? {
                    onDragOver: (event: React.DragEvent) => {
                      if (!drag_ref.current) return;
                      event.preventDefault();
                      if (drop_row_key !== key) setDropRowKey(key);
                    },
                    onDrop: (event: React.DragEvent) => {
                      event.preventDefault();
                      handleDrop(row);
                    },
                  }
                : {};

              return (
                <React.Fragment key={key}>
                  <div
                    role="rowheader"
                    {...drop_props}
                    className={`sticky left-0 z-10 flex items-center gap-2.5 border-b border-shell-border px-3 ${is_drop_target ? "bg-shell-hover" : "bg-shell-panel"}`}
                    style={{ height: ROW_HEIGHT }}
                  >
                    <button
                      type="button"
                      onClick={() => setExpanded((current) => ({ ...current, [key]: !current[key] }))}
                      aria-expanded={is_open}
                      aria-label={`${is_open ? "Hide" : "Show"} items of ${row.person.name}`}
                      className="flex h-6 w-6 flex-none items-center justify-center rounded text-shell-text-muted hover:bg-shell-hover"
                      style={{ transform: is_open ? "none" : "rotate(-90deg)" }}
                    >
                      <svg viewBox="0 0 12 12" width="11" height="11" aria-hidden><path d="M3 4.5 L6 8 L9 4.5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg>
                    </button>
                    {row.person.id === null ? (
                      <span className="flex h-7 w-7 flex-none items-center justify-center rounded-full border border-dashed border-shell-border text-[11px] text-shell-text-faint">?</span>
                    ) : (
                      <PersonAvatar person={toPersonOption(row.person)} size={28} />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13.5px] font-medium text-shell-text">{row.person.name}</div>
                      <div className="truncate text-[11.5px] text-shell-text-faint">
                        {formatLoad(row.total)} {effort_label.toLowerCase()} in view
                        {row.unscheduled_count > 0 ? ` · ${row.unscheduled_count} without date` : ""}
                      </div>
                    </div>
                    {row.capacity !== null && row.person.id !== null && (
                      <CapacityChip
                        value={row.capacity}
                        can_edit={can_edit}
                        onSave={(capacity) =>
                          workload.updateConfig({
                            capacity_overrides: { ...(data.config.capacity_overrides ?? {}), [String(row.person.id)]: capacity },
                          })
                        }
                      />
                    )}
                  </div>

                  {row.cells.map((cell, index) => {
                    const bucket = data.buckets[index];
                    const level = loadLevel(cell.load, row.capacity);
                    const style = level === "empty" ? null : LOAD_LEVEL_STYLE[level];
                    const fill_percent = row.capacity && row.capacity > 0 ? Math.min(100, (cell.load / row.capacity) * 100) : cell.load > 0 ? 100 : 0;
                    return (
                      <div
                        key={cell.key}
                        role="gridcell"
                        {...drop_props}
                        aria-label={`${row.person.name}, ${bucket.label}: ${formatLoad(cell.load)}${row.capacity !== null ? ` of ${formatLoad(row.capacity)}` : ""}${style ? `, ${style.label.toLowerCase()}` : ""}`}
                        onMouseEnter={(event) => {
                          if (cell.load <= 0) return setHoverCard(null);
                          const rect = event.currentTarget.getBoundingClientRect();
                          setHoverCard({ row, bucket, x: rect.left + rect.width / 2, y: rect.bottom + 6 });
                        }}
                        onMouseLeave={() => setHoverCard(null)}
                        className={`flex items-center justify-center border-b border-l border-shell-border px-1.5 ${is_drop_target ? "bg-shell-hover" : bucket.is_weekend ? "bg-shell-hover/40" : ""}`}
                        style={{ height: ROW_HEIGHT }}
                      >
                        {style && (
                          <div className="relative h-7 w-full overflow-hidden rounded-md bg-shell-hover">
                            {/* The fill shows the share of capacity, the number carries the exact value. */}
                            <div className="absolute inset-y-0 left-0 rounded-md" style={{ width: `${Math.max(fill_percent, 12)}%`, background: style.background }} />
                            <span className="relative flex h-full items-center justify-center text-[12px] font-semibold" style={{ color: fill_percent >= 55 ? style.text : "var(--color-shell-text)" }}>
                              {formatLoad(cell.load)}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {is_open &&
                    (row.items.length === 0 ? (
                      <div className="border-b border-shell-border px-12 py-2 text-[12.5px] text-shell-text-faint" style={{ gridColumn: "1 / -1" }}>
                        No scheduled items in this period.
                      </div>
                    ) : (
                      row.items.map((item) => (
                        <WorkloadItemBar
                          key={`${key}-${item.id}`}
                          item={item}
                          buckets={data.buckets}
                          can_drag={can_edit}
                          effort_label={data.config.effort_column_id ? effort_label : null}
                          onOpen={onOpenItem ? () => onOpenItem(item.id, data.config.source_view_id) : undefined}
                          onDragStart={() => {
                            drag_ref.current = { item, from_person_id: row.person.id };
                            setHoverCard(null);
                          }}
                          onDragEnd={() => {
                            drag_ref.current = null;
                            setDropRowKey(null);
                          }}
                        />
                      ))
                    ))}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      )}

      {can_edit && rows.length > 0 && (
        <p className="text-[12px] text-shell-text-faint">Open a person to see their items, then drag an item onto someone else to reassign it.</p>
      )}

      {hover_card && <WorkloadHoverCard card={hover_card} effort_label={effort_label} />}
    </div>
  );
};

/** The settings row: which tab, columns, days or weeks, and default capacity. */
function WorkloadSettings({ data, can_edit, onChange }: { data: WorkloadDataDto; can_edit: boolean; onChange: (partial: Partial<WorkloadDataDto["config"]>) => void }) {
  const { config } = data;
  const effort_options: WorkloadPickerOption[] = [{ id: "", label: "Count items", type: "none" }, ...data.effort_columns];
  const selected_source = data.source_views.find((view) => view.id === config.source_view_id);

  const columnMenu = (heading: string, options: WorkloadPickerOption[], selected_id: string | null, onPick: (id: string | null) => void, empty_text: string) => {
    const selected = options.find((option) => option.id === (selected_id ?? ""));
    return (
      <InlineFieldMenu
        width={200}
        menu_heading={heading}
        options={options}
        getOptionId={(option) => option.id}
        isSelected={(option) => option.id === (selected_id ?? "")}
        onSelect={(option) => onPick(option.id || null)}
        renderValue={() => (
          <>
            {selected && selected.type !== "none" && <ColumnSwatchBadge swatch={COLUMN_KIND_SWATCH[selected.type as BoardColumnKind] ?? COLUMN_KIND_SWATCH.text} size={20} />}
            <span className="truncate text-[13.5px] text-shell-text">{selected ? `${heading}: ${selected.label}` : empty_text}</span>
          </>
        )}
        renderOption={(option) => (
          <>
            {option.type !== "none" && <ColumnSwatchBadge swatch={COLUMN_KIND_SWATCH[option.type as BoardColumnKind] ?? COLUMN_KIND_SWATCH.text} size={20} />}
            <span>{option.label}</span>
          </>
        )}
      />
    );
  };

  return (
    <fieldset disabled={!can_edit} className="flex flex-wrap items-center gap-2.5 disabled:opacity-80">
      <legend className="sr-only">Workload settings</legend>
      {data.source_views.length > 1 && (
        <InlineFieldMenu
          width={190}
          menu_heading="Data from"
          options={data.source_views}
          getOptionId={(option) => String(option.id)}
          isSelected={(option) => option.id === config.source_view_id}
          onSelect={(option) => onChange({ source_view_id: option.id, people_column_id: null, date_column_id: null, effort_column_id: null })}
          renderValue={() => <span className="truncate text-[13.5px] text-shell-text">{selected_source ? `From: ${selected_source.label}` : "Select a tab"}</span>}
          renderOption={(option) => <span className="truncate">{option.label}</span>}
        />
      )}
      {columnMenu("People", data.people_columns, config.people_column_id, (id) => onChange({ people_column_id: id }), "No People column")}
      {columnMenu("Dates", data.date_columns, config.date_column_id, (id) => onChange({ date_column_id: id }), "No date column")}
      {columnMenu("Effort", effort_options, config.effort_column_id, (id) => onChange({ effort_column_id: id }), "Count items")}

      <div role="radiogroup" aria-label="Show by" className="flex h-9 overflow-hidden rounded-lg border border-shell-border">
        {(["day", "week"] as const).map((bucket) => (
          <button
            key={bucket}
            type="button"
            role="radio"
            aria-checked={config.bucket === bucket}
            onClick={() => config.bucket !== bucket && onChange({ bucket })}
            className={`px-3 text-[13px] ${config.bucket === bucket ? "bg-shell-hover font-semibold text-shell-text" : "text-shell-text-muted hover:bg-shell-hover"}`}
          >
            {bucket === "day" ? "Days" : "Weeks"}
          </button>
        ))}
      </div>

      <label className="flex h-9 items-center gap-2 rounded-lg border border-shell-border px-3 text-[13px] text-shell-text-muted">
        Capacity per {config.bucket}
        <CapacityInput value={config.capacity} onSave={(capacity) => onChange({ capacity })} />
      </label>
    </fieldset>
  );
}

function CapacityInput({ value, onSave }: { value: number; onSave: (value: number) => void }) {
  const [draft, setDraft] = useState(formatLoad(value));
  useEffect(() => setDraft(formatLoad(value)), [value]);
  const commit = () => {
    const number = Number(draft);
    if (Number.isFinite(number) && number >= 0 && number !== value) onSave(number);
    else setDraft(formatLoad(value));
  };
  return (
    <input
      inputMode="decimal"
      value={draft}
      onChange={(event) => setDraft(event.target.value.replace(/[^0-9.]/g, ""))}
      onBlur={commit}
      onKeyDown={(event) => event.key === "Enter" && (event.target as HTMLInputElement).blur()}
      className="w-12 bg-transparent text-center font-mono text-[13px] text-shell-text outline-none"
      aria-label="Capacity"
    />
  );
}

/** A person's own capacity, editable in place. */
function CapacityChip({ value, can_edit, onSave }: { value: number; can_edit: boolean; onSave: (value: number) => void }) {
  const [is_editing, setIsEditing] = useState(false);
  if (is_editing) {
    return (
      <span className="flex h-6 items-center rounded-full border border-shell-border px-1" onBlur={() => setIsEditing(false)}>
        <CapacityInput
          value={value}
          onSave={(next) => {
            onSave(next);
            setIsEditing(false);
          }}
        />
      </span>
    );
  }
  return (
    <button
      type="button"
      disabled={!can_edit}
      onClick={() => setIsEditing(true)}
      title={can_edit ? "Change this person's capacity" : "Capacity"}
      className="flex h-6 flex-none items-center rounded-full border border-shell-border px-2 text-[11px] text-shell-text-muted hover:bg-shell-hover disabled:hover:bg-transparent"
    >
      Cap {formatLoad(value)}
    </button>
  );
}

/** One item under an expanded person: a bar across the periods it takes time in. */
function WorkloadItemBar({
  item,
  buckets,
  can_drag,
  effort_label,
  onOpen,
  onDragStart,
  onDragEnd,
}: {
  item: WorkloadItem;
  buckets: WorkloadBucketDto[];
  can_drag: boolean;
  effort_label: string | null;
  onOpen?: () => void;
  onDragStart: () => void;
  onDragEnd: () => void;
}) {
  const indexes = item.bucket_keys.map((key) => buckets.findIndex((bucket) => bucket.key === key)).filter((index) => index >= 0);
  const first = Math.min(...indexes);
  const last = Math.max(...indexes);
  const color = item.group_color ?? "#579bfc";

  return (
    <>
      <div className="sticky left-0 z-10 flex min-w-0 items-center gap-2 border-b border-shell-border bg-shell-panel pl-12 pr-3" style={{ height: ITEM_ROW_HEIGHT }}>
        <span className="h-2 w-2 flex-none rounded-full" style={{ background: color }} title={item.group_name ?? undefined} />
        {onOpen ? (
          <button type="button" onClick={onOpen} className="min-w-0 truncate text-left text-[12.5px] text-shell-text-secondary hover:underline">
            {item.name}
          </button>
        ) : (
          <span className="min-w-0 truncate text-[12.5px] text-shell-text-secondary">{item.name}</span>
        )}
      </div>
      <div className="relative border-b border-shell-border" style={{ gridColumn: `2 / span ${buckets.length}`, height: ITEM_ROW_HEIGHT }}>
        {indexes.length > 0 && (
          <button
            type="button"
            draggable={can_drag}
            onDragStart={(event) => {
              event.dataTransfer.effectAllowed = "move";
              event.dataTransfer.setData("text/plain", item.name);
              onDragStart();
            }}
            onDragEnd={onDragEnd}
            onClick={onOpen}
            title={`${item.name}\n${formatRange(item.start, item.end)}${effort_label ? `\n${formatLoad(item.effort)} ${effort_label.toLowerCase()}` : ""}${can_drag ? "\nDrag onto another person to reassign" : ""}`}
            className={`absolute top-1/2 flex h-[22px] -translate-y-1/2 items-center gap-1.5 overflow-hidden rounded-full px-2.5 text-left text-[12px] font-medium text-white ${can_drag ? "cursor-grab active:cursor-grabbing" : onOpen ? "cursor-pointer" : "cursor-default"}`}
            style={{
              left: `calc(${(first / buckets.length) * 100}% + 3px)`,
              width: `calc(${((last - first + 1) / buckets.length) * 100}% - 6px)`,
              background: color,
            }}
          >
            <span className="truncate">{effort_label ? `${formatLoad(item.effort)} ${effort_label.toLowerCase()}` : item.name}</span>
          </button>
        )}
      </div>
    </>
  );
}

/** Hover card for a cell: the items that make up that person's load in that period. */
function WorkloadHoverCard({ card, effort_label }: { card: HoverCard; effort_label: string }) {
  const items = card.row.items.filter((item) => item.bucket_keys.includes(card.bucket.key));
  const cell = card.row.cells.find((entry) => entry.key === card.bucket.key);
  const level = loadLevel(cell?.load ?? 0, card.row.capacity);
  const width = 260;
  const left = typeof window === "undefined" ? card.x : Math.min(Math.max(8, card.x - width / 2), window.innerWidth - width - 8);

  return (
    <div role="tooltip" className="pointer-events-none fixed z-[1000] rounded-lg border border-shell-border bg-shell-panel p-3 shadow-lg" style={{ top: card.y, left, width }}>
      <div className="text-[12.5px] font-semibold text-shell-text">
        {card.row.person.name} · {card.bucket.label}
      </div>
      <div className="mb-2 mt-0.5 text-[12px] text-shell-text-muted">
        {formatLoad(cell?.load ?? 0)}
        {card.row.capacity !== null ? ` of ${formatLoad(card.row.capacity)}` : ""} {effort_label.toLowerCase()}
        {level !== "empty" ? `, ${LOAD_LEVEL_STYLE[level].label.toLowerCase()}` : ""}
      </div>
      <ul className="flex flex-col gap-1">
        {items.slice(0, 6).map((item) => (
          <li key={item.id} className="flex items-center gap-2 text-[12px] text-shell-text">
            <span className="h-2 w-2 flex-none rounded-full" style={{ background: item.group_color ?? "#579bfc" }} />
            <span className="truncate">{item.name}</span>
          </li>
        ))}
        {items.length > 6 && <li className="text-[12px] text-shell-text-faint">and {items.length - 6} more</li>}
      </ul>
    </div>
  );
}

function LoadLegend() {
  return (
    <ul aria-label="Legend" className="flex flex-wrap items-center gap-3 text-[12px] text-shell-text-muted">
      {Object.values(LOAD_LEVEL_STYLE).map((style) => (
        <li key={style.label} className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: style.background }} />
          {style.label}
        </li>
      ))}
    </ul>
  );
}

function EmptyState({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center justify-center gap-3 py-20 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-shell-hover text-shell-text-muted">
        <WorkloadViewIcon size={26} />
      </span>
      <h2 className="text-lg font-semibold text-shell-text">{title}</h2>
      <p className="text-[13.5px] text-shell-text-muted">{detail}</p>
    </div>
  );
}

const DATE_FORMAT = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

function formatRange(start: string, end: string): string {
  const format = (iso: string) => DATE_FORMAT.format(new Date(`${iso}T00:00:00Z`));
  return start === end ? format(start) : `${format(start)} to ${format(end)}`;
}

export default BoardWorkloadView;
