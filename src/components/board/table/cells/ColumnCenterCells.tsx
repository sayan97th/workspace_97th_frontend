"use client";

import type { BoardTableGroup, CellValue, ColumnDef, DocCellValue, PersonDef } from "../types";
import type { BoardTableActions, BoardTableState, ColumnScope } from "../useBoardTable";
import { findDef } from "../colorUtils";
import {
  countryFlag,
  countryName,
  docCellTitle,
  formatHour,
  formatWeekRange,
  isCountryCode,
  isHexColor,
  isHourValue,
  isWeekValue,
} from "../columnValueFormats";
import AvatarBadge from "../menus/AvatarBadge";
import DocCellModal from "../menus/DocCellModal";
import { ColorPickerMenu, CountryMenu, HourMenu, WeekMenu } from "../menus/ValuePickers";
import "./column-center-cells.css";

/** What every Column Center cell receives from `CellRenderer`. */
export interface ColumnCenterCellProps {
  node_id: string;
  column: ColumnDef;
  value: CellValue;
  node_name?: string;
  state: BoardTableState;
  actions: BoardTableActions;
  is_menu_open: boolean;
  openMenu: () => void;
}

const asString = (value: CellValue): string => (typeof value === "string" ? value : "");

/** Where a node sits: its group, whether it is a subitem, and its 1 based position among its siblings. */
function locateNode(groups: BoardTableGroup[], node_id: string): { group: BoardTableGroup; scope: ColumnScope; position: number } | null {
  for (const group of groups) {
    const item_index = group.items.findIndex((item) => item.id === node_id);
    if (item_index >= 0) return { group, scope: "main", position: item_index + 1 };
    for (const item of group.items) {
      const sub_index = item.subs.findIndex((sub) => sub.id === node_id);
      if (sub_index >= 0) return { group, scope: "sub", position: sub_index + 1 };
    }
  }
  return null;
}

function findTableNode(groups: BoardTableGroup[], node_id: string) {
  for (const group of groups) {
    for (const item of group.items) {
      if (item.id === node_id) return item;
      const sub = item.subs.find((entry) => entry.id === node_id);
      if (sub) return sub;
    }
  }
  return null;
}

/** "Oct 13, 2026", or "Oct 13" this year, with the time on hover. */
function formatStamp(iso: string | null | undefined): { label: string; full: string } | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  const is_this_year = date.getFullYear() === new Date().getFullYear();
  return {
    label: date.toLocaleDateString("en-US", { month: "short", day: "numeric", ...(is_this_year ? {} : { year: "numeric" }) }),
    full: date.toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }),
  };
}

/** A cell that opens a picker: the whole cell is the button, the empty state shows a hover "+". */
function PickerCellShell({
  label,
  is_empty,
  can_edit,
  openMenu,
  children,
  menu,
}: {
  label: string;
  is_empty: boolean;
  can_edit: boolean;
  openMenu: () => void;
  children: React.ReactNode;
  menu: React.ReactNode;
}) {
  return (
    <div className="relative flex h-full w-full min-w-0">
      <button
        type="button"
        onClick={can_edit ? openMenu : undefined}
        aria-label={label}
        disabled={!can_edit && is_empty}
        className="center-cell"
        data-empty={is_empty || undefined}
      >
        {is_empty ? can_edit && <AddGlyph /> : children}
      </button>
      {menu}
    </div>
  );
}

function AddGlyph() {
  return (
    <span className="center-cell__add" aria-hidden="true">
      <svg viewBox="0 0 16 16" width="14" height="14" fill="none">
        <path d="M8 3 V13 M3 8 H13" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    </span>
  );
}

export function CountryCell({ node_id, column, value, actions, is_menu_open, openMenu }: ColumnCenterCellProps) {
  const code = isCountryCode(value) ? value : null;
  return (
    <PickerCellShell
      label={code ? `Country: ${countryName(code)}` : "Choose a country"}
      is_empty={!code}
      can_edit={actions.canEditCell(node_id, column.id)}
      openMenu={openMenu}
      menu={
        is_menu_open && (
          <CountryMenu
            value={code}
            onPick={(next) => actions.setCellValue(node_id, column.id, next)}
            onClear={() => actions.clearCellValue(node_id, column.id)}
            onClose={actions.closeCellMenu}
          />
        )
      }
    >
      {code && (
        <>
          <span className="center-cell__flag" aria-hidden="true">{countryFlag(code)}</span>
          <span className="center-cell__text" title={countryName(code)}>{countryName(code)}</span>
        </>
      )}
    </PickerCellShell>
  );
}

export function WeekCell({ node_id, column, value, actions, is_menu_open, openMenu }: ColumnCenterCellProps) {
  const week = isWeekValue(value) ? value : null;
  return (
    <PickerCellShell
      label={week ? `Week of ${formatWeekRange(week)}` : "Choose a week"}
      is_empty={!week}
      can_edit={actions.canEditCell(node_id, column.id)}
      openMenu={openMenu}
      menu={
        is_menu_open && (
          <WeekMenu
            value={week}
            onPick={(next) => actions.setCellValue(node_id, column.id, next)}
            onClear={() => actions.clearCellValue(node_id, column.id)}
            onClose={actions.closeCellMenu}
          />
        )
      }
    >
      {week && <span className="center-cell__pill">{formatWeekRange(week)}</span>}
    </PickerCellShell>
  );
}

export function HourCell({ node_id, column, value, state, actions, is_menu_open, openMenu }: ColumnCenterCellProps) {
  const hour = isHourValue(value) ? value : null;
  const is_24_hour = column.hour_format === "24";
  const changeFormat = (next_is_24_hour: boolean) => {
    const location = locateNode(state.groups, node_id);
    if (location) actions.updateColumnSettings(location.group.key, location.scope, column.id, { hour_format: next_is_24_hour ? "24" : "12" });
  };
  return (
    <PickerCellShell
      label={hour ? `Hour: ${formatHour(hour, is_24_hour)}` : "Set an hour"}
      is_empty={!hour}
      can_edit={actions.canEditCell(node_id, column.id)}
      openMenu={openMenu}
      menu={
        is_menu_open && (
          <HourMenu
            value={hour}
            is_24_hour={is_24_hour}
            onFormatChange={changeFormat}
            onPick={(next) => actions.setCellValue(node_id, column.id, next)}
            onClear={() => actions.clearCellValue(node_id, column.id)}
            onClose={actions.closeCellMenu}
          />
        )
      }
    >
      {hour && (
        <>
          <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" className="center-cell__icon">
            <circle cx="8" cy="8" r="5.25" fill="none" stroke="currentColor" strokeWidth="1.4" />
            <path d="M8 5v3.25l2.25 1.25" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
          <span className="center-cell__text">{formatHour(hour, is_24_hour)}</span>
        </>
      )}
    </PickerCellShell>
  );
}

export function ColorPickerCell({ node_id, column, value, actions, is_menu_open, openMenu }: ColumnCenterCellProps) {
  const color = isHexColor(value) ? value : null;
  return (
    <PickerCellShell
      label={color ? `Color ${color}` : "Choose a color"}
      is_empty={!color}
      can_edit={actions.canEditCell(node_id, column.id)}
      openMenu={openMenu}
      menu={
        is_menu_open && (
          <ColorPickerMenu
            value={color}
            onPick={(next) => actions.setCellValue(node_id, column.id, next)}
            onClear={() => actions.clearCellValue(node_id, column.id)}
            onClose={actions.closeCellMenu}
          />
        )
      }
    >
      {color && (
        <>
          <span className="center-cell__swatch" style={{ background: color }} aria-hidden="true" />
          <span className="center-cell__text center-cell__mono">{color.toUpperCase()}</span>
        </>
      )}
    </PickerCellShell>
  );
}

const isDocValue = (value: CellValue): value is DocCellValue =>
  typeof value === "object" && value !== null && !Array.isArray(value) && "title" in value && "content" in value;

export function DocCell({ node_id, column, value, node_name, state, actions, is_menu_open, openMenu }: ColumnCenterCellProps) {
  const doc = isDocValue(value) ? value : null;
  const can_edit = actions.canEditCell(node_id, column.id);
  const members = state.people.map((person) => ({ id: Number(person.id), full_name: person.name, profile_photo_url: person.avatar_url ?? null, job_title: person.job_title }));
  return (
    <div className="relative flex h-full w-full min-w-0">
      <button
        type="button"
        onClick={doc || can_edit ? openMenu : undefined}
        disabled={!doc && !can_edit}
        aria-label={doc ? `Open doc ${docCellTitle(doc)}` : "Add a doc"}
        className="center-cell center-cell--start"
        data-empty={!doc || undefined}
      >
        {doc ? (
          <>
            <span className="center-cell__doc-icon" aria-hidden="true">
              <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4.25 2.75h5l2.5 2.5v8h-7.5z" />
                <path d="M6.25 8h3.5M6.25 10.5h3.5" />
              </svg>
            </span>
            <span className="center-cell__text center-cell__doc-title">{docCellTitle(doc) || "Untitled doc"}</span>
          </>
        ) : (
          can_edit && <span className="center-cell__hover-label">+ Add Doc</span>
        )}
      </button>
      {is_menu_open && (
        <DocCellModal
          value={doc}
          item_name={node_name ?? ""}
          members={members}
          is_editable={can_edit}
          onSave={(next) => actions.setCellValue(node_id, column.id, next)}
          onClose={actions.closeCellMenu}
        />
      )}
    </div>
  );
}

function PersonStamp({ person, stamp, empty_label }: { person: PersonDef | undefined; stamp: { label: string; full: string } | null; empty_label: string }) {
  if (!stamp) return <span className="center-cell__muted">{empty_label}</span>;
  return (
    <span className="center-cell__person" title={`${person?.name ?? "Unknown"}, ${stamp.full}`}>
      {person ? (
        <AvatarBadge initials={person.initials} color={person.color} size={24} name={person.name} avatar_url={person.avatar_url} is_deactivated={person.is_deactivated} />
      ) : (
        <span className="center-cell__avatar-placeholder" aria-hidden="true" />
      )}
      <span className="center-cell__text">{stamp.label}</span>
    </span>
  );
}

/** Read only: who created the item and when. */
export function CreationLogCell({ node_id, state }: ColumnCenterCellProps) {
  const node = findTableNode(state.groups, node_id);
  const person = state.people.find((entry) => entry.id === node?.created_by_id);
  return (
    <div className="center-cell center-cell--static">
      <PersonStamp person={person} stamp={formatStamp(node?.created_at)} empty_label="Not recorded" />
    </div>
  );
}

/** Read only: who changed the item last and when. */
export function LastUpdatedCell({ node_id, state }: ColumnCenterCellProps) {
  const node = findTableNode(state.groups, node_id);
  const person = state.people.find((entry) => entry.id === (node?.last_updated_by_id ?? node?.created_by_id));
  return (
    <div className="center-cell center-cell--static">
      <PersonStamp person={person} stamp={formatStamp(node?.last_updated_at ?? node?.created_at)} empty_label="Not recorded" />
    </div>
  );
}

/** Read only: the row's position in its group (subitems count under their parent). */
export function ItemNumberCell({ node_id, state }: ColumnCenterCellProps) {
  const position = locateNode(state.groups, node_id)?.position;
  return (
    <div className="center-cell center-cell--static">
      <span className="center-cell__number">{position ?? "–"}</span>
    </div>
  );
}

/** A Status label counts as done when it reads "Done", monday's default done label. */
const DONE_LABEL = /^done$/i;

/**
 * Read only: a battery of the row's Status columns (same scope), one segment
 * per column in its label's color, and the share of them that are done.
 */
export function ProgressTrackingCell({ node_id, values, state }: ColumnCenterCellProps & { values: Record<string, CellValue> }) {
  const location = locateNode(state.groups, node_id);
  const columns = location
    ? location.scope === "main"
      ? [...location.group.base_columns, ...location.group.custom_columns]
      : [...location.group.sub_base_columns, ...location.group.sub_custom_columns]
    : [];
  const status_columns = columns.filter((entry) => entry.kind === "status");
  if (status_columns.length === 0) {
    return (
      <div className="center-cell center-cell--static">
        <span className="center-cell__muted">Add a Status column</span>
      </div>
    );
  }
  const segments = status_columns.map((status_column) => {
    const def = findDef(status_column.options ?? state.status_defs, asString(values[status_column.id]));
    const has_label = !!def && !!def.label;
    return { id: status_column.id, title: status_column.title, label: has_label ? def.label : "", color: has_label ? def.color : null, is_done: has_label && DONE_LABEL.test(def.label) };
  });
  const done_count = segments.filter((segment) => segment.is_done).length;
  const percent = Math.round((done_count / segments.length) * 100);
  return (
    <div className="center-cell center-cell--static" title={segments.map((segment) => `${segment.title}: ${segment.label || "Empty"}`).join("\n")}>
      <span className="center-cell__battery" role="img" aria-label={`${percent}% done`}>
        {segments.map((segment) => (
          <span key={segment.id} className="center-cell__battery-segment" style={segment.color ? { background: segment.color } : undefined} />
        ))}
      </span>
      <span className="center-cell__percent">{percent}%</span>
    </div>
  );
}
