"use client";

import type { BoardTableGroup, CellValue, ColumnDef, DocCellValue, PersonDef } from "../types";
import type { BoardTableActions, BoardTableState, ColumnScope } from "../useBoardTable";
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
import { DEFAULT_DATE_DISPLAY, datePartsOfInstant, formatDateParts } from "../dateUtils";
import { getPersonTitle } from "@/lib/deactivated-user";
import AvatarBadge from "../menus/AvatarBadge";
import { useCellTooltip } from "./CellTooltip";
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
/**
 * A Creation log / Last updated timestamp in the column's "Date format" (see `DateDisplay`):
 * `label` is what the cell shows, `full` the tooltip, always with the date, year and time.
 * The default format reads "Nov 5", adding the year only when it isn't this year.
 */
function formatStamp(iso: string | null | undefined, display: ColumnDef["date_display"]): { label: string; full: string } | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  const { format, time_format, show_time } = display ?? DEFAULT_DATE_DISPLAY;
  const is_this_year = date.getFullYear() === new Date().getFullYear();
  const label_format = format !== "auto" ? format : is_this_year ? "month_day" : "month_day_year";
  return {
    label: formatDateParts(datePartsOfInstant(date, !!show_time), label_format, time_format),
    full: formatDateParts(datePartsOfInstant(date, true), format === "auto" || format === "month_day" || format === "weekday_month_day" ? "month_day_year" : format, time_format),
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

/** Shown on a log avatar when the item has no recorded person, e.g. one added by a form or an import. */
const UNKNOWN_STAMP_PERSON = "Unknown user";

/**
 * Creation log / Last updated: the person's avatar and the date. Like the People cell, hovering
 * the avatar shows the person's name in the dark cell tooltip, and hovering the date shows the
 * full date and time.
 */
function PersonStamp({ person, stamp, empty_label }: { person: PersonDef | undefined; stamp: { label: string; full: string } | null; empty_label: string }) {
  const person_name = person ? getPersonTitle(person.name, person.is_deactivated) : UNKNOWN_STAMP_PERSON;
  const avatar_tooltip = useCellTooltip<HTMLSpanElement>(person_name);
  const date_tooltip = useCellTooltip<HTMLSpanElement>(stamp?.full ?? "");

  if (!stamp) return <span className="center-cell__muted">{empty_label}</span>;
  return (
    <span className="center-cell__person">
      <span {...avatar_tooltip.anchor_props} className="center-cell__stamp-avatar" aria-label={person_name}>
        {/* No `name` prop, so the native `title` never doubles the styled tooltip. */}
        {person ? (
          <AvatarBadge initials={person.initials} color={person.color} size={24} avatar_url={person.avatar_url} is_deactivated={person.is_deactivated} />
        ) : (
          <span className="center-cell__avatar-placeholder" aria-hidden="true" />
        )}
      </span>
      {avatar_tooltip.tooltip}
      <span {...date_tooltip.anchor_props} className="center-cell__text" aria-label={stamp.full}>
        {stamp.label}
      </span>
      {date_tooltip.tooltip}
    </span>
  );
}

/** Read only: who created the item and when. */
export function CreationLogCell({ node_id, column, state }: ColumnCenterCellProps) {
  const node = findTableNode(state.groups, node_id);
  const person = state.people.find((entry) => entry.id === node?.created_by_id);
  return (
    <div className="center-cell center-cell--static">
      <PersonStamp person={person} stamp={formatStamp(node?.created_at, column.date_display)} empty_label="Not recorded" />
    </div>
  );
}

/** Read only: who changed the item last and when. */
export function LastUpdatedCell({ node_id, column, state }: ColumnCenterCellProps) {
  const node = findTableNode(state.groups, node_id);
  const person = state.people.find((entry) => entry.id === (node?.last_updated_by_id ?? node?.created_by_id));
  return (
    <div className="center-cell center-cell--static">
      <PersonStamp person={person} stamp={formatStamp(node?.last_updated_at ?? node?.created_at, column.date_display)} empty_label="Not recorded" />
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
