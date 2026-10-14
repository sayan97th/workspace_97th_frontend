"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { getApiErrorMessage } from "@/lib/api-error";
import type { ColumnDef, ColumnKind, DependencyConfig, DependencyMode } from "../types";
import { useOutsideClick } from "../useOutsideClick";
import ColumnTypeIcon from "./ColumnTypeIcon";
import "./dependency-setup-dialog.css";

/** A Date or Timeline column the Dependency column can schedule. */
export interface DependencyDateColumn {
  id: string;
  title: string;
  kind: ColumnKind;
}

/** The three modes, in monday.com's order and wording. */
export const DEPENDENCY_MODE_OPTIONS: { mode: DependencyMode; label: string; hint: string }[] = [
  { mode: "flexible", label: "Flexible", hint: "Item timelines will adjust to avoid overlapping with the other items they depend on." },
  { mode: "strict", label: "Strict", hint: "Item timelines will begin as soon as possible, based on other items they depend on and the lag between them." },
  { mode: "none", label: "No action", hint: "Item timelines will not change automatically, even if they overlap with other items they depend on." },
];

/** Date and Timeline share monday's purple column chip. */
const DATE_COLUMN_ACCENT = "#a25ddc";

interface DependencySetupDialogProps {
  column: ColumnDef;
  /** Whether "+ Create New Column" is offered (it needs the board's real column handshake). */
  can_create_column: boolean;
  /** Adds a Timeline column next to this one and resolves with it. */
  onCreateColumn: () => Promise<DependencyDateColumn | null>;
  onSave: (dependency: DependencyConfig) => void;
  onClose: () => void;
}

/**
 * "Set up dependencies between items", monday.com's Dependency column setup: the mode (Flexible,
 * Strict or No action) with a hint and an illustration of how timelines shift, then the Date or
 * Timeline column the dependencies schedule, picked from a dropdown that can also create a new
 * Timeline column. Opened right after a Dependency column is added and from its header menu.
 * Nothing is saved until "Save"; scheduling modes need a column, "No action" does not.
 */
export default function DependencySetupDialog({ column, can_create_column, onCreateColumn, onSave, onClose }: DependencySetupDialogProps) {
  const current = column.dependency;
  const [mode, setMode] = useState<DependencyMode>(current?.mode ?? "strict");
  const [date_column_id, setDateColumnId] = useState<string | null>(current?.date_column_id ?? null);
  const [use_working_days, setUseWorkingDays] = useState(current?.use_working_days ?? false);
  const [created_columns, setCreatedColumns] = useState<DependencyDateColumn[]>([]);
  const [is_learn_more_open, setIsLearnMoreOpen] = useState(false);
  const title_id = useId();
  const hint_id = useId();

  const date_columns: DependencyDateColumn[] = [
    ...(column.dependency_date_columns ?? []),
    ...created_columns.filter((created) => !(column.dependency_date_columns ?? []).some((existing) => existing.id === created.id)),
  ];
  // A picked column that was deleted since no longer counts.
  const picked_column = date_columns.find((candidate) => candidate.id === date_column_id) ?? null;
  const can_save = mode === "none" || picked_column !== null;
  const hint = DEPENDENCY_MODE_OPTIONS.find((option) => option.mode === mode)?.hint ?? "";

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !event.defaultPrevented) onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const save = () => {
    if (!can_save) return;
    onSave({ mode, date_column_id: picked_column?.id ?? null, use_working_days });
    onClose();
  };

  if (typeof document === "undefined") return null;

  return createPortal(
    <div className="dependency-setup-overlay" onMouseDown={onClose}>
      <div
        className="dependency-setup"
        role="dialog"
        aria-modal="true"
        aria-labelledby={title_id}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <h2 id={title_id} className="dependency-setup__title">
          Set up dependencies between items
        </h2>
        <p className="dependency-setup__subtitle">
          Select how timelines shift for items with dependencies
          <button type="button" className="dependency-setup__link" aria-expanded={is_learn_more_open} onClick={() => setIsLearnMoreOpen((open) => !open)}>
            Learn more
          </button>
        </p>
        {is_learn_more_open && (
          <div className="dependency-setup__learn-more">
            A dependency links an item to the items it waits for. Pick the Date or Timeline column the links schedule, then choose how dates react when an
            item it depends on moves. The days between two items are kept on each link and can be changed from the cell, under &ldquo;Days between items&rdquo;.
          </div>
        )}

        <div className="dependency-setup__mode-row">
          <span className="dependency-setup__label">Choose dependency mode</span>
          <div className="dependency-setup__radios" role="radiogroup" aria-label="Dependency mode" aria-describedby={hint_id}>
            {DEPENDENCY_MODE_OPTIONS.map((option) => (
              <label key={option.mode} className="dependency-setup__radio">
                <input type="radio" name="dependency-mode" value={option.mode} checked={mode === option.mode} onChange={() => setMode(option.mode)} />
                <span className="dependency-setup__radio-dot" aria-hidden="true" />
                {option.label}
              </label>
            ))}
          </div>
        </div>
        <p id={hint_id} className="dependency-setup__hint">
          {hint}
        </p>

        <div className="dependency-setup__illustration" aria-hidden="true">
          <DependencyIllustration key={mode} mode={mode} />
        </div>

        <div className="dependency-setup__column-row">
          <span className="dependency-setup__label">Choose column for item dependencies</span>
          <DateColumnSelect
            columns={date_columns}
            selected={picked_column}
            can_create={can_create_column}
            onPick={(picked) => setDateColumnId(picked.id)}
            onCreate={async () => {
              const created = await onCreateColumn();
              if (!created) return;
              setCreatedColumns((list) => [...list, created]);
              setDateColumnId(created.id);
            }}
          />
        </div>

        <label className="dependency-setup__checkbox">
          <input type="checkbox" checked={use_working_days} onChange={(event) => setUseWorkingDays(event.target.checked)} />
          <span className="dependency-setup__checkbox-box" aria-hidden="true">
            <svg viewBox="0 0 16 16" width="12" height="12" fill="none">
              <path d="M3.5 8.5 L6.5 11.2 L12.5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          Count working days only
        </label>

        <div className="dependency-setup__footer">
          <button type="button" className="dependency-setup__button dependency-setup__button--tertiary" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="dependency-setup__button dependency-setup__button--primary" onClick={save} disabled={!can_save}>
            Save
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

interface DateColumnSelectProps {
  columns: DependencyDateColumn[];
  selected: DependencyDateColumn | null;
  can_create: boolean;
  onPick: (column: DependencyDateColumn) => void;
  onCreate: () => Promise<void>;
}

/** monday's "Select a Column" dropdown: the Date and Timeline columns with their type chip, then "+ Create New Column". Opens above. */
function DateColumnSelect({ columns, selected, can_create, onPick, onCreate }: DateColumnSelectProps) {
  const [is_open, setIsOpen] = useState(false);
  const [active_index, setActiveIndex] = useState(-1);
  const [is_creating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const root_ref = useOutsideClick<HTMLDivElement>(is_open, () => setIsOpen(false));
  const trigger_ref = useRef<HTMLButtonElement>(null);
  const list_id = useId();
  const option_count = columns.length + (can_create ? 1 : 0);

  const close = () => {
    setIsOpen(false);
    trigger_ref.current?.focus();
  };

  const create = async () => {
    if (is_creating) return;
    setIsCreating(true);
    setError(null);
    try {
      await onCreate();
      close();
    } catch (create_error) {
      setError(getApiErrorMessage(create_error, "The column could not be created."));
    } finally {
      setIsCreating(false);
    }
  };

  const activate = (index: number) => {
    if (index < columns.length) {
      onPick(columns[index]);
      close();
    } else if (can_create) {
      void create();
    }
  };

  return (
    <div ref={root_ref} className="dependency-setup__select">
      <button
        ref={trigger_ref}
        type="button"
        className="dependency-setup__select-trigger"
        aria-haspopup="listbox"
        aria-expanded={is_open}
        aria-controls={is_open ? list_id : undefined}
        aria-label="Choose column for item dependencies"
        data-open={is_open || undefined}
        onClick={() => {
          setIsOpen((open) => !open);
          setActiveIndex(-1);
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape" && is_open) {
            event.preventDefault();
            close();
          } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            if (!is_open) setIsOpen(true);
            if (option_count === 0) return;
            const step = event.key === "ArrowDown" ? 1 : -1;
            setActiveIndex((index) => (index === -1 ? (step === 1 ? 0 : option_count - 1) : (index + step + option_count) % option_count));
          } else if (event.key === "Enter" && is_open && active_index >= 0) {
            event.preventDefault();
            activate(active_index);
          }
        }}
      >
        {selected ? (
          <span className="dependency-setup__select-value">
            <ColumnTypeIcon kind={selected.kind} accent={DATE_COLUMN_ACCENT} />
            <span className="dependency-setup__select-text">{selected.title}</span>
          </span>
        ) : (
          <span className="dependency-setup__select-placeholder">Select a Column</span>
        )}
        <svg className="dependency-setup__chevron" viewBox="0 0 16 16" width="16" height="16" fill="none" aria-hidden="true">
          <path d="M4 6 L8 10 L12 6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {is_open && (
        <div id={list_id} className="dependency-setup__menu" role="listbox" aria-label="Date and Timeline columns">
          {columns.map((candidate, index) => (
            <button
              key={candidate.id}
              type="button"
              role="option"
              aria-selected={selected?.id === candidate.id}
              data-active={active_index === index || undefined}
              className="dependency-setup__option"
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => activate(index)}
            >
              <ColumnTypeIcon kind={candidate.kind} accent={DATE_COLUMN_ACCENT} />
              <span className="dependency-setup__select-text">{candidate.title}</span>
            </button>
          ))}
          {columns.length === 0 && <div className="dependency-setup__menu-empty">This board has no Date or Timeline column yet.</div>}
          {can_create && (
            <button
              type="button"
              role="option"
              aria-selected={false}
              data-active={active_index === columns.length || undefined}
              className="dependency-setup__option dependency-setup__option--create"
              disabled={is_creating}
              onMouseEnter={() => setActiveIndex(columns.length)}
              onClick={() => void create()}
            >
              {is_creating ? "Creating column..." : "+ Create New Column"}
            </button>
          )}
          {error && (
            <div className="dependency-setup__menu-error" role="alert">
              {error}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** One task bar of the illustration, positioned in the 372 by 224 board mock. */
interface IllustrationTask {
  label: string;
  x: number;
  y: number;
  width: number;
  /** CSS class that animates the bar (and its outgoing arrow) for the mode. */
  motion?: string;
}

/** Where each mode's bars sit and which of them move in the loop, after monday's own setup animations. */
const ILLUSTRATIONS: Record<DependencyMode, { color: string; tasks: IllustrationTask[]; cursor: { x: number; y: number; motion: string } | null }> = {
  strict: {
    color: "#ff158a",
    tasks: [
      { label: "Task 01", x: 28, y: 82, width: 74, motion: "dependency-art__move--lead" },
      { label: "Task 02", x: 132, y: 136, width: 50, motion: "dependency-art__move--lead" },
      { label: "Task 03", x: 210, y: 186, width: 50, motion: "dependency-art__move--lead" },
    ],
    cursor: null,
  },
  flexible: {
    color: "#fdab3d",
    tasks: [
      { label: "Task 01", x: 28, y: 76, width: 74, motion: "dependency-art__move--drag" },
      { label: "Task 02", x: 196, y: 130, width: 50, motion: "dependency-art__move--push" },
      { label: "Task 03", x: 272, y: 178, width: 54, motion: "dependency-art__move--push-late" },
    ],
    cursor: { x: 176, y: 158, motion: "dependency-art__move--drag" },
  },
  none: {
    color: "#579bfc",
    tasks: [
      { label: "Task 01", x: 102, y: 76, width: 74 },
      { label: "Task 02", x: 160, y: 128, width: 50, motion: "dependency-art__move--free" },
      { label: "Task 03", x: 236, y: 178, width: 54 },
    ],
    cursor: { x: 186, y: 140, motion: "dependency-art__move--free" },
  },
};

const BAR_HEIGHT = 14;

/** The board mock under the mode hint: a timeline grid with three linked task bars showing how the mode shifts them. */
function DependencyIllustration({ mode }: { mode: DependencyMode }) {
  const art = ILLUSTRATIONS[mode];
  const columns = Array.from({ length: 12 }, (_, index) => 6 + index * 30);

  return (
    <svg className="dependency-art" viewBox="0 0 372 224" width="372" height="224" role="presentation">
      <rect x="0.5" y="0.5" width="371" height="223" rx="4" className="dependency-art__board" />
      <path d="M0.5 24 H371.5 M0.5 48 H371.5" className="dependency-art__line" />
      <path d="M186 24 V48" className="dependency-art__line" />
      <rect x="88" y="33" width="10" height="5" rx="2.5" className="dependency-art__pill" />
      <rect x="270" y="33" width="10" height="5" rx="2.5" className="dependency-art__pill" />
      {columns.map((x) => (
        <g key={x}>
          <path d={`M${x + 30} 48 V224`} className="dependency-art__grid" />
          <rect x={x + 9} y="54" width="11" height="5" rx="2.5" className="dependency-art__pill" />
        </g>
      ))}
      {art.tasks.map((task, index) => {
        const next = art.tasks[index + 1];
        const arrow_x = task.x + task.width;
        const arrow_y = task.y + BAR_HEIGHT / 2;
        const target_y = next ? next.y + BAR_HEIGHT / 2 : 0;
        // Elbow arrow from the bar's end down to the next bar's start, like monday's Gantt links. It
        // moves with the bars when both move together, otherwise it fades out while they are apart.
        const elbow = next
          ? next.x > arrow_x + 8
            ? `M${arrow_x} ${arrow_y} H${arrow_x + 10} V${target_y} H${next.x - 1}`
            : `M${arrow_x} ${arrow_y} H${arrow_x + 8} V${(arrow_y + next.y) / 2 + 4} H${next.x - 10} V${target_y} H${next.x - 1}`
          : null;
        return (
          <g key={task.label}>
            {elbow && (
              <g className={next?.motion === task.motion ? task.motion : art.cursor ? "dependency-art__fade" : undefined}>
                <path d={elbow} className="dependency-art__arrow" />
                <path d={`M${next!.x - 5} ${target_y - 3} L${next!.x - 1} ${target_y} L${next!.x - 5} ${target_y + 3} Z`} className="dependency-art__arrow-head" />
              </g>
            )}
            <g className={task.motion}>
              <rect x={task.x} y={task.y} width={task.width} height={BAR_HEIGHT} rx="2" fill={art.color} />
              <text x={task.x + task.width / 2} y={task.y + BAR_HEIGHT / 2} className="dependency-art__label">
                {task.label}
              </text>
            </g>
          </g>
        );
      })}
      {art.cursor && (
        <g className={art.cursor.motion}>
          <HandCursor x={art.cursor.x} y={art.cursor.y} />
        </g>
      )}
    </svg>
  );
}

/** The grabbing hand monday draws over the bar being dragged. */
function HandCursor({ x, y }: { x: number; y: number }) {
  return (
    <path
      transform={`translate(${x} ${y})`}
      d="M4 13 V3.5 a1.4 1.4 0 0 1 2.8 0 V9 V7.2 a1.4 1.4 0 0 1 2.8 0 V9 V8 a1.4 1.4 0 0 1 2.8 0 V9.5 V9 a1.4 1.4 0 0 1 2.8 0 V14 a5 5 0 0 1 -5 5 H9 a5 5 0 0 1 -4.2 -2.3 L1.6 12 a1.5 1.5 0 0 1 2.4 -1.6 Z"
      className="dependency-art__hand"
    />
  );
}
